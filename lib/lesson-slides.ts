import "server-only"

import { createHash, randomUUID } from "crypto"
import { sql } from "@/lib/db"
import { deleteMediaUrl, isR2MediaConfigured, putMediaObject } from "@/lib/r2-media"
import { ensureLessonTables } from "@/lib/lesson-bids"
import { ensureVolunteerEmailColumn } from "@/lib/volunteer-scheduling"
import {
  DEFAULT_REGISTRATION_EVENT_YEAR,
  parseRegistrationEventYear,
  type RegistrationEventYear,
} from "@/lib/registration-event-years"
import type { Family } from "@/lib/family-auth"

/** PPT / PPTX / PDF — projection decks from lesson presenters. */
export const LESSON_SLIDE_MAX_BYTES = 50 * 1024 * 1024

const PPTX =
  "application/vnd.openxmlformats-officedocument.presentationml.presentation"
const PPT = "application/vnd.ms-powerpoint"
const PDF = "application/pdf"

export type LessonSlideFileType = "pptx" | "ppt" | "pdf"

export type LessonSlideSubmission = {
  id: string
  volunteer_signup_id: number
  event_year: number
  file_url: string
  file_name: string
  file_type: LessonSlideFileType
  content_type: string
  byte_size: number
  content_hash: string
  uploaded_by_clerk_id: string | null
  created_at: string
  updated_at: string
}

export type LessonSlideInboxRow = LessonSlideSubmission & {
  volunteer_name: string
  volunteer_type: string
  assigned_date: string | null
  time_slot: string | null
  lesson_title: string | null
  scripture_reading: string | null
  claimed_topic_title: string | null
  registration_id: number | null
}

let tablesEnsured = false

export async function ensureLessonSlidesSchema(): Promise<void> {
  if (tablesEnsured) return
  await ensureLessonTables()
  await ensureVolunteerEmailColumn()
  await sql.query(`
    CREATE TABLE IF NOT EXISTS lesson_slide_submissions (
      id TEXT PRIMARY KEY NOT NULL,
      volunteer_signup_id INTEGER NOT NULL UNIQUE,
      event_year INTEGER NOT NULL,
      file_url TEXT NOT NULL,
      file_name TEXT NOT NULL,
      file_type TEXT NOT NULL,
      content_type TEXT NOT NULL,
      byte_size INTEGER NOT NULL,
      content_hash TEXT NOT NULL,
      uploaded_by_clerk_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)
  await sql.query(`
    CREATE INDEX IF NOT EXISTS idx_lesson_slides_year
    ON lesson_slide_submissions (event_year, updated_at DESC)
  `)
  tablesEnsured = true
}

function extensionForContentType(contentType: string, fileName?: string): LessonSlideFileType {
  const type = contentType.toLowerCase()
  const name = (fileName || "").toLowerCase()
  if (type === PPTX || name.endsWith(".pptx")) return "pptx"
  if (type === PPT || name.endsWith(".ppt")) return "ppt"
  return "pdf"
}

export function validateLessonSlideFile(file: {
  type: string
  size: number
  name?: string
}): string | null {
  const type = (file.type || "").toLowerCase()
  const name = (file.name || "").toLowerCase()
  const okType =
    type === PDF ||
    type === PPT ||
    type === PPTX ||
    name.endsWith(".pdf") ||
    name.endsWith(".ppt") ||
    name.endsWith(".pptx")
  if (!okType) {
    return "Upload a PowerPoint (.ppt / .pptx) or PDF."
  }
  if (file.size <= 0) return "File is empty."
  if (file.size > LESSON_SLIDE_MAX_BYTES) {
    return "File is too large (max 50 MB)."
  }
  return null
}

function mapSubmission(row: Record<string, unknown>): LessonSlideSubmission {
  return {
    id: String(row.id),
    volunteer_signup_id: Number(row.volunteer_signup_id),
    event_year: Number(row.event_year),
    file_url: String(row.file_url),
    file_name: String(row.file_name),
    file_type: String(row.file_type) as LessonSlideFileType,
    content_type: String(row.content_type),
    byte_size: Number(row.byte_size),
    content_hash: String(row.content_hash),
    uploaded_by_clerk_id: row.uploaded_by_clerk_id
      ? String(row.uploaded_by_clerk_id)
      : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  }
}

export async function getLessonSlideForSignup(
  signupId: number,
): Promise<LessonSlideSubmission | null> {
  await ensureLessonSlidesSchema()
  const [row] = await sql`
    SELECT * FROM lesson_slide_submissions
    WHERE volunteer_signup_id = ${signupId}
    LIMIT 1
  `
  return row ? mapSubmission(row as Record<string, unknown>) : null
}

export async function listLessonSlidesForYear(
  yearInput?: string | number | null,
): Promise<LessonSlideInboxRow[]> {
  await ensureLessonSlidesSchema()
  const eventYear = parseRegistrationEventYear(
    yearInput != null ? String(yearInput) : null,
  )
  const rows = await sql`
    SELECT
      s.*,
      vs.volunteer_name,
      vs.volunteer_type,
      vs.assigned_date,
      vs.time_slot,
      vs.lesson_title,
      vs.scripture_reading,
      vs.registration_id,
      lt.title as claimed_topic_title
    FROM lesson_slide_submissions s
    JOIN volunteer_signups vs ON vs.id = s.volunteer_signup_id
    LEFT JOIN lesson_topics lt ON vs.claimed_lesson_id = lt.id
    WHERE s.event_year = ${eventYear}
    ORDER BY s.updated_at DESC
  `
  return rows.map((row) => ({
    ...mapSubmission(row as Record<string, unknown>),
    volunteer_name: String(row.volunteer_name ?? ""),
    volunteer_type: String(row.volunteer_type ?? ""),
    assigned_date: row.assigned_date ? String(row.assigned_date) : null,
    time_slot: row.time_slot ? String(row.time_slot) : null,
    lesson_title: row.lesson_title ? String(row.lesson_title) : null,
    scripture_reading: row.scripture_reading ? String(row.scripture_reading) : null,
    claimed_topic_title: row.claimed_topic_title ? String(row.claimed_topic_title) : null,
    registration_id: row.registration_id != null ? Number(row.registration_id) : null,
  }))
}

async function findRegistrationId(family: Family, year: number): Promise<number | null> {
  const email = family.email?.trim()
  if (!email) return null
  const [row] = await sql`
    SELECT id
    FROM registrations
    WHERE LOWER(email) = LOWER(${email})
      AND COALESCE(event_year, 2026) = ${year}
    ORDER BY created_at DESC
    LIMIT 1
  `
  return row ? Number(row.id) : null
}

/** Presenter signup the signed-in family may upload slides for. */
export async function assertFamilyCanUploadLessonSlides(
  family: Family,
  signupId: number,
  yearInput?: string | null,
): Promise<{ signupId: number; eventYear: RegistrationEventYear }> {
  await ensureLessonSlidesSchema()
  const eventYear = parseRegistrationEventYear(yearInput ?? null)
  const registrationId = await findRegistrationId(family, eventYear)
  if (!registrationId) {
    throw new Error("No registration found for this family this year.")
  }

  const [row] = await sql`
    SELECT id, volunteer_type, claimed_lesson_id, registration_id
    FROM volunteer_signups
    WHERE id = ${signupId}
    LIMIT 1
  `
  if (!row || Number(row.registration_id) !== registrationId) {
    throw new Error("Lesson assignment not found for your family.")
  }

  const volunteerType = String(row.volunteer_type ?? "")
  const isPresenter = /presenting a lesson/i.test(volunteerType)
  if (!isPresenter && !row.claimed_lesson_id) {
    throw new Error("This assignment is not a lesson presentation.")
  }

  return { signupId, eventYear }
}

export async function uploadLessonSlides(options: {
  signupId: number
  eventYear: RegistrationEventYear
  bytes: ArrayBuffer
  contentType: string
  fileName: string
  clerkUserId?: string | null
}): Promise<LessonSlideSubmission> {
  if (!isR2MediaConfigured()) {
    throw new Error(
      "File storage is not configured. Set R2_UPLOAD_WORKER_URL and R2_UPLOAD_SECRET.",
    )
  }

  const validationError = validateLessonSlideFile({
    type: options.contentType,
    size: options.bytes.byteLength,
    name: options.fileName,
  })
  if (validationError) throw new Error(validationError)

  const fileType = extensionForContentType(options.contentType, options.fileName)
  const payload = Buffer.from(options.bytes)
  const contentHash = createHash("sha256").update(payload).digest("hex")
  const safeName = options.fileName.replace(/[^\w.\-()+ ]+/g, "_").slice(0, 120) || `lesson.${fileType}`
  const key = `lesson-slides/${options.eventYear}/${options.signupId}/${Date.now()}-${contentHash.slice(0, 12)}.${fileType}`

  const existing = await getLessonSlideForSignup(options.signupId)
  const { url } = await putMediaObject(
    key,
    payload,
    options.contentType ||
      (fileType === "pdf"
        ? PDF
        : fileType === "pptx"
          ? PPTX
          : PPT),
  )

  if (existing) {
    await deleteMediaUrl(existing.file_url)
    await sql`
      UPDATE lesson_slide_submissions
      SET
        file_url = ${url},
        file_name = ${safeName},
        file_type = ${fileType},
        content_type = ${options.contentType || PPTX},
        byte_size = ${payload.byteLength},
        content_hash = ${contentHash},
        uploaded_by_clerk_id = ${options.clerkUserId ?? null},
        updated_at = datetime('now')
      WHERE id = ${existing.id}
    `
    const updated = await getLessonSlideForSignup(options.signupId)
    if (!updated) throw new Error("Failed to update lesson slides")
    return updated
  }

  const id = randomUUID()
  await sql`
    INSERT INTO lesson_slide_submissions (
      id, volunteer_signup_id, event_year, file_url, file_name, file_type,
      content_type, byte_size, content_hash, uploaded_by_clerk_id
    ) VALUES (
      ${id}, ${options.signupId}, ${options.eventYear}, ${url}, ${safeName}, ${fileType},
      ${options.contentType || PPTX}, ${payload.byteLength}, ${contentHash},
      ${options.clerkUserId ?? null}
    )
  `

  await sql`
    UPDATE volunteer_signups
    SET lesson_details_submitted_at = COALESCE(lesson_details_submitted_at, datetime('now'))
    WHERE id = ${options.signupId}
  `

  const created = await getLessonSlideForSignup(options.signupId)
  if (!created) throw new Error("Failed to save lesson slides")
  return created
}

export async function deleteLessonSlides(signupId: number): Promise<boolean> {
  await ensureLessonSlidesSchema()
  const existing = await getLessonSlideForSignup(signupId)
  if (!existing) return false
  await deleteMediaUrl(existing.file_url)
  await sql`DELETE FROM lesson_slide_submissions WHERE id = ${existing.id}`
  return true
}

export function defaultLessonEventYear(): RegistrationEventYear {
  return DEFAULT_REGISTRATION_EVENT_YEAR
}
