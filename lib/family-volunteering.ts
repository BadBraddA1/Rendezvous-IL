import { sql } from "@/lib/db"
import { ensureLessonTables } from "@/lib/lesson-bids"
import { listSpecialAssignments } from "@/lib/special-assignments"
import { ensureVolunteerEmailColumn } from "@/lib/volunteer-scheduling"
import { parseRegistrationEventYear } from "@/lib/registration-event-years"
import type { Family } from "@/lib/family-auth"

const SITE_ORIGIN = process.env.NEXT_PUBLIC_SITE_URL || "https://rendezvousil.com"

export type FamilyVolunteerPendingAction = {
  type: "claim_lesson_topic" | "submit_lesson_details"
  label: string
  href: string
}

export type FamilyVolunteerWorshipAssignment = {
  assignedDate: string | null
  timeSlot: string | null
  prayerType: string | null
  roleLabel: string
  scheduleStatus: string | null
}

export type FamilyVolunteerLessonTopic = {
  topicId: number
  topicTitle: string
  lessonTitle: string | null
  scriptureReading: string | null
}

export type FamilyVolunteerEntry = {
  id: number
  volunteerName: string
  volunteerType: string
  worshipAssignment: FamilyVolunteerWorshipAssignment | null
  lessonTopic: FamilyVolunteerLessonTopic | null
  pendingActions: FamilyVolunteerPendingAction[]
}

export type FamilySpecialAssignment = {
  id: number
  activityName: string
  assignedDate: string | null
  timeSlot: string | null
  notes: string | null
  matchedName: string
}

export type FamilyVolunteeringPayload = {
  eventYear: number
  registrationId: number | null
  volunteers: FamilyVolunteerEntry[]
  specialAssignments: FamilySpecialAssignment[]
  summary: {
    pendingActionCount: number
    confirmedWorshipCount: number
    specialAssignmentCount: number
  }
}

function roleLabel(volunteerType: string, prayerType: string | null): string {
  if (prayerType) return `${volunteerType} (Group ${prayerType})`
  return volunteerType
}

function normalizeName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ")
}

function firstName(value: string): string {
  return normalizeName(value).split(" ")[0] || ""
}

/** Latest registration id for this family email in the event year. */
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

async function memberFirstNames(registrationId: number): Promise<string[]> {
  const rows = await sql`
    SELECT first_name FROM family_members WHERE registration_id = ${registrationId}
  `
  return rows
    .map((row) => String(row.first_name ?? "").trim())
    .filter(Boolean)
}

/**
 * Family volunteering summary: confirmed worship slots, lesson topics, pending
 * lesson-bid actions, and name-matched special assignments.
 */
export async function getFamilyVolunteering(
  family: Family,
  yearInput?: string | null,
): Promise<FamilyVolunteeringPayload> {
  await ensureLessonTables()
  await ensureVolunteerEmailColumn()

  const eventYear = parseRegistrationEventYear(yearInput ?? null)
  const registrationId = await findRegistrationId(family, eventYear)

  if (!registrationId) {
    return {
      eventYear,
      registrationId: null,
      volunteers: [],
      specialAssignments: [],
      summary: {
        pendingActionCount: 0,
        confirmedWorshipCount: 0,
        specialAssignmentCount: 0,
      },
    }
  }

  const rows = await sql`
    SELECT
      vs.id,
      vs.volunteer_name,
      vs.volunteer_type,
      vs.assigned_date,
      vs.time_slot,
      vs.prayer_type,
      vs.schedule_status,
      vs.lesson_title,
      vs.scripture_reading,
      vs.lesson_bid_sent_at,
      vs.lesson_bid_token,
      vs.claimed_lesson_id,
      lt.title as claimed_lesson_title
    FROM volunteer_signups vs
    LEFT JOIN lesson_topics lt ON vs.claimed_lesson_id = lt.id
    WHERE vs.registration_id = ${registrationId}
    ORDER BY vs.volunteer_type, vs.volunteer_name
  `

  const volunteers: FamilyVolunteerEntry[] = rows.map((row) => {
    const volunteerType = String(row.volunteer_type ?? "")
    const prayerType = row.prayer_type ? String(row.prayer_type) : null
    const assignedDate = row.assigned_date ? String(row.assigned_date) : null
    const timeSlot = row.time_slot ? String(row.time_slot) : null
    const scheduleStatus = row.schedule_status ? String(row.schedule_status) : null
    const token = row.lesson_bid_token ? String(row.lesson_bid_token) : null
    const bidHref = token ? `${SITE_ORIGIN}/lesson-bid/${token}` : `${SITE_ORIGIN}/account`
    const claimedLessonId = row.claimed_lesson_id ? Number(row.claimed_lesson_id) : null
    const pendingActions: FamilyVolunteerPendingAction[] = []

    const isPresenter = /presenting a lesson/i.test(volunteerType)
    if (isPresenter && row.lesson_bid_sent_at && !claimedLessonId && token) {
      pendingActions.push({
        type: "claim_lesson_topic",
        label: `Pick a lesson topic for ${String(row.volunteer_name ?? "you")}`,
        href: bidHref,
      })
    } else if (
      isPresenter &&
      claimedLessonId &&
      !(row.lesson_title || row.scripture_reading) &&
      token
    ) {
      pendingActions.push({
        type: "submit_lesson_details",
        label: `Add lesson title & scripture for ${String(row.volunteer_name ?? "you")}`,
        href: bidHref,
      })
    }

    const worshipAssignment =
      assignedDate || timeSlot
        ? {
            assignedDate,
            timeSlot,
            prayerType,
            roleLabel: roleLabel(volunteerType, prayerType),
            scheduleStatus,
          }
        : null

    const lessonTopic =
      claimedLessonId && row.claimed_lesson_title
        ? {
            topicId: claimedLessonId,
            topicTitle: String(row.claimed_lesson_title),
            lessonTitle: row.lesson_title ? String(row.lesson_title) : null,
            scriptureReading: row.scripture_reading ? String(row.scripture_reading) : null,
          }
        : null

    return {
      id: Number(row.id),
      volunteerName: String(row.volunteer_name ?? ""),
      volunteerType,
      worshipAssignment,
      lessonTopic,
      pendingActions,
    }
  })

  const names = new Set<string>()
  for (const volunteer of volunteers) {
    names.add(normalizeName(volunteer.volunteerName))
    names.add(firstName(volunteer.volunteerName))
  }
  for (const name of await memberFirstNames(registrationId)) {
    names.add(normalizeName(name))
    names.add(firstName(name))
  }
  if (family.husband_first_name) {
    names.add(normalizeName(family.husband_first_name))
    names.add(firstName(family.husband_first_name))
  }
  if (family.wife_first_name) {
    names.add(normalizeName(family.wife_first_name))
    names.add(firstName(family.wife_first_name))
  }

  const specialAssignments: FamilySpecialAssignment[] = []
  for (const assignment of await listSpecialAssignments(eventYear)) {
    const assigned = String(assignment.assigned_name ?? "").trim()
    if (!assigned) continue
    const assignedNorm = normalizeName(assigned)
    const assignedFirst = firstName(assigned)
    const matched =
      names.has(assignedNorm) ||
      names.has(assignedFirst) ||
      [...names].some((name) => name && (assignedNorm.includes(name) || name.includes(assignedFirst)))
    if (!matched) continue
    specialAssignments.push({
      id: assignment.id,
      activityName: assignment.activity_name,
      assignedDate: assignment.assigned_date,
      timeSlot: assignment.time_slot,
      notes: assignment.notes,
      matchedName: assigned,
    })
  }

  const pendingActionCount = volunteers.reduce((sum, v) => sum + v.pendingActions.length, 0)
  const confirmedWorshipCount = volunteers.filter((v) => v.worshipAssignment != null).length

  return {
    eventYear,
    registrationId,
    volunteers,
    specialAssignments,
    summary: {
      pendingActionCount,
      confirmedWorshipCount,
      specialAssignmentCount: specialAssignments.length,
    },
  }
}

/** True when Home/More should surface volunteering at all. */
export function hasVolunteeringContent(payload: FamilyVolunteeringPayload): boolean {
  return (
    payload.summary.pendingActionCount > 0 ||
    payload.summary.confirmedWorshipCount > 0 ||
    payload.summary.specialAssignmentCount > 0 ||
    payload.volunteers.some((v) => v.lessonTopic != null)
  )
}
