import "server-only"

import { randomUUID } from "crypto"
import { sql } from "@/lib/db"
import { ensureVolunteerEmailColumn } from "@/lib/volunteer-scheduling"
import {
  parseRegistrationEventYear,
  type RegistrationEventYear,
} from "@/lib/registration-event-years"
import type { Family } from "@/lib/family-auth"

export type WorshipSongVerseChoice =
  | { mode: "all" }
  | { mode: "list"; verses: number[] }

export type WorshipSongPick = {
  song_pack_item_id: string
  pack_id: string
  title: string
  /** e.g. all verses, or [1, 2] */
  verses: WorshipSongVerseChoice
  note?: string | null
}

export type WorshipSongSubmission = {
  id: string
  volunteer_signup_id: number
  event_year: number
  songs: WorshipSongPick[]
  note: string | null
  submitted_by_clerk_id: string | null
  created_at: string
  updated_at: string
}

export type WorshipSongInboxRow = WorshipSongSubmission & {
  volunteer_name: string
  volunteer_type: string
  assigned_date: string | null
  time_slot: string | null
  prayer_type: string | null
  registration_id: number | null
}

let tablesEnsured = false

export async function ensureWorshipSongSubmissionsSchema(): Promise<void> {
  if (tablesEnsured) return
  await ensureVolunteerEmailColumn()
  await sql.query(`
    CREATE TABLE IF NOT EXISTS worship_song_submissions (
      id TEXT PRIMARY KEY NOT NULL,
      volunteer_signup_id INTEGER NOT NULL UNIQUE,
      event_year INTEGER NOT NULL,
      songs_json TEXT NOT NULL,
      note TEXT,
      submitted_by_clerk_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)
  await sql.query(`
    CREATE INDEX IF NOT EXISTS idx_worship_songs_year
    ON worship_song_submissions (event_year, updated_at DESC)
  `)
  tablesEnsured = true
}

function parseVerses(raw: unknown): WorshipSongVerseChoice {
  if (!raw || typeof raw !== "object") return { mode: "all" }
  const obj = raw as Record<string, unknown>
  if (obj.mode === "list" && Array.isArray(obj.verses)) {
    const verses = obj.verses
      .map((n) => Number(n))
      .filter((n) => Number.isFinite(n) && n >= 1 && n <= 24)
      .map((n) => Math.floor(n))
    const unique = [...new Set(verses)].sort((a, b) => a - b)
    return unique.length ? { mode: "list", verses: unique } : { mode: "all" }
  }
  return { mode: "all" }
}

function parseSongs(raw: string | null | undefined): WorshipSongPick[] {
  if (!raw) return []
  try {
    const data = JSON.parse(raw) as unknown
    if (!Array.isArray(data)) return []
    return data
      .map((row) => {
        if (!row || typeof row !== "object") return null
        const r = row as Record<string, unknown>
        const id = String(r.song_pack_item_id || "").trim()
        const title = String(r.title || "").trim()
        if (!id || !title) return null
        return {
          song_pack_item_id: id,
          pack_id: String(r.pack_id || "").trim(),
          title,
          verses: parseVerses(r.verses),
          note: r.note != null && String(r.note).trim() ? String(r.note).trim() : null,
        } satisfies WorshipSongPick
      })
      .filter((s): s is WorshipSongPick => s != null)
  } catch {
    return []
  }
}

/** Public helper for family volunteering payloads. */
export function songsFromJsonString(raw: string | null | undefined): WorshipSongPick[] {
  return parseSongs(raw)
}

function mapSubmission(row: Record<string, unknown>): WorshipSongSubmission {
  return {
    id: String(row.id),
    volunteer_signup_id: Number(row.volunteer_signup_id),
    event_year: Number(row.event_year),
    songs: parseSongs(row.songs_json != null ? String(row.songs_json) : null),
    note: row.note != null && String(row.note).trim() ? String(row.note) : null,
    submitted_by_clerk_id: row.submitted_by_clerk_id
      ? String(row.submitted_by_clerk_id)
      : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  }
}

export function formatVerseChoice(choice: WorshipSongVerseChoice): string {
  if (choice.mode === "all") return "all verses"
  if (choice.verses.length === 0) return "all verses"
  return `verses ${choice.verses.join(", ")}`
}

export function validateSongPicks(songs: unknown): string | null {
  if (!Array.isArray(songs)) return "Songs must be a list."
  if (songs.length === 0) return "Add at least one song."
  if (songs.length > 12) return "Too many songs (max 12)."
  for (const row of songs) {
    if (!row || typeof row !== "object") return "Invalid song entry."
    const r = row as Record<string, unknown>
    if (!String(r.song_pack_item_id || "").trim()) return "Each song needs an id."
    if (!String(r.title || "").trim()) return "Each song needs a title."
  }
  return null
}

export function normalizeSongPicks(songs: unknown): WorshipSongPick[] {
  if (!Array.isArray(songs)) return []
  return songs
    .map((row) => {
      if (!row || typeof row !== "object") return null
      const r = row as Record<string, unknown>
      const id = String(r.song_pack_item_id || "").trim()
      const title = String(r.title || "").trim()
      if (!id || !title) return null
      return {
        song_pack_item_id: id,
        pack_id: String(r.pack_id || "").trim(),
        title,
        verses: parseVerses(r.verses),
        note: r.note != null && String(r.note).trim() ? String(r.note).trim() : null,
      } satisfies WorshipSongPick
    })
    .filter((s): s is WorshipSongPick => s != null)
}

export async function getWorshipSongsForSignup(
  signupId: number,
): Promise<WorshipSongSubmission | null> {
  await ensureWorshipSongSubmissionsSchema()
  const [row] = await sql`
    SELECT * FROM worship_song_submissions
    WHERE volunteer_signup_id = ${signupId}
    LIMIT 1
  `
  return row ? mapSubmission(row as Record<string, unknown>) : null
}

export async function listWorshipSongSubmissionsForYear(
  yearInput?: string | number | null,
): Promise<WorshipSongInboxRow[]> {
  await ensureWorshipSongSubmissionsSchema()
  const eventYear = parseRegistrationEventYear(
    yearInput != null ? String(yearInput) : null,
  )
  const rows = await sql`
    SELECT
      w.*,
      vs.volunteer_name,
      vs.volunteer_type,
      vs.assigned_date,
      vs.time_slot,
      vs.prayer_type,
      vs.registration_id
    FROM worship_song_submissions w
    INNER JOIN volunteer_signups vs ON vs.id = w.volunteer_signup_id
    WHERE w.event_year = ${eventYear}
    ORDER BY vs.assigned_date ASC, vs.time_slot ASC, vs.volunteer_name ASC
  `
  return rows.map((row) => {
    const base = mapSubmission(row as Record<string, unknown>)
    return {
      ...base,
      volunteer_name: String(row.volunteer_name ?? ""),
      volunteer_type: String(row.volunteer_type ?? ""),
      assigned_date: row.assigned_date ? String(row.assigned_date) : null,
      time_slot: row.time_slot ? String(row.time_slot) : null,
      prayer_type: row.prayer_type ? String(row.prayer_type) : null,
      registration_id: row.registration_id != null ? Number(row.registration_id) : null,
    }
  })
}

export async function assertFamilyCanSubmitWorshipSongs(
  family: Family,
  signupId: number,
  yearInput?: string | null,
): Promise<{ signupId: number; eventYear: RegistrationEventYear; volunteerName: string }> {
  await ensureWorshipSongSubmissionsSchema()
  const eventYear = parseRegistrationEventYear(yearInput ?? null)
  const email = family.email?.trim()
  if (!email) throw new Error("No registration email on family")

  const [row] = await sql`
    SELECT
      vs.id,
      vs.volunteer_name,
      vs.volunteer_type,
      vs.assigned_date,
      vs.time_slot,
      r.event_year
    FROM volunteer_signups vs
    INNER JOIN registrations r ON r.id = vs.registration_id
    WHERE vs.id = ${signupId}
      AND LOWER(r.email) = LOWER(${email})
      AND COALESCE(r.event_year, 2026) = ${eventYear}
    LIMIT 1
  `
  if (!row) throw new Error("Volunteer signup not found")
  const volunteerType = String(row.volunteer_type ?? "")
  if (!/leading singing/i.test(volunteerType)) {
    throw new Error("Only Leading singing volunteers submit song sets")
  }
  if (!row.assigned_date && !row.time_slot) {
    throw new Error("Song set is available after you are scheduled for a service")
  }
  return {
    signupId: Number(row.id),
    eventYear,
    volunteerName: String(row.volunteer_name ?? ""),
  }
}

export async function upsertWorshipSongSubmission(input: {
  signupId: number
  eventYear: number
  songs: WorshipSongPick[]
  note?: string | null
  clerkUserId?: string | null
}): Promise<WorshipSongSubmission> {
  await ensureWorshipSongSubmissionsSchema()
  const songsJson = JSON.stringify(input.songs)
  const note = input.note?.trim() || null
  const existing = await getWorshipSongsForSignup(input.signupId)
  if (existing) {
    await sql`
      UPDATE worship_song_submissions
      SET songs_json = ${songsJson},
          note = ${note},
          submitted_by_clerk_id = ${input.clerkUserId ?? null},
          updated_at = datetime('now')
      WHERE volunteer_signup_id = ${input.signupId}
    `
  } else {
    await sql`
      INSERT INTO worship_song_submissions (
        id, volunteer_signup_id, event_year, songs_json, note, submitted_by_clerk_id
      ) VALUES (
        ${randomUUID()},
        ${input.signupId},
        ${input.eventYear},
        ${songsJson},
        ${note},
        ${input.clerkUserId ?? null}
      )
    `
  }
  const saved = await getWorshipSongsForSignup(input.signupId)
  if (!saved) throw new Error("Failed to save song set")
  return saved
}
