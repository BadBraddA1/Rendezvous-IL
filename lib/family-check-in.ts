import { sql } from "@/lib/db"
import type { Family } from "@/lib/family-auth"
import { normalizeStringArray } from "@/lib/normalize-string-array"
import { parseRegistrationEventYear } from "@/lib/registration-event-years"

export type FamilyCheckInPayload = {
  eventYear: number
  hasRegistration: boolean
  checkedIn: boolean
  checkedInAt: string | null
  lodgingType: string | null
  roomKeys: string[]
  familyLastName: string | null
  attendeeCount: number | null
  message: string | null
}

type CheckInRow = {
  id: unknown
  family_last_name: unknown
  lodging_type: unknown
  room_keys: unknown
  checked_in: unknown
  checked_in_at: unknown
  attendee_count: unknown
}

function emptyPayload(eventYear: number, message: string | null = null): FamilyCheckInPayload {
  return {
    eventYear,
    hasRegistration: false,
    checkedIn: false,
    checkedInAt: null,
    lodgingType: null,
    roomKeys: [],
    familyLastName: null,
    attendeeCount: null,
    message,
  }
}

function mapRow(row: CheckInRow, eventYear: number): FamilyCheckInPayload {
  return {
    eventYear,
    hasRegistration: true,
    checkedIn: Boolean(row.checked_in),
    checkedInAt: row.checked_in_at ? String(row.checked_in_at) : null,
    lodgingType: row.lodging_type ? String(row.lodging_type) : null,
    roomKeys: normalizeStringArray(row.room_keys),
    familyLastName: row.family_last_name ? String(row.family_last_name) : null,
    attendeeCount:
      row.attendee_count != null && Number.isFinite(Number(row.attendee_count))
        ? Number(row.attendee_count)
        : null,
    message: null,
  }
}

async function findByEmail(email: string, eventYear: number): Promise<CheckInRow | null> {
  const [row] = await sql`
    SELECT
      r.id,
      r.family_last_name,
      r.lodging_type,
      r.room_keys,
      r.checked_in,
      r.checked_in_at,
      (
        SELECT COUNT(*)
        FROM family_members fm
        WHERE fm.registration_id = r.id
      ) AS attendee_count
    FROM registrations r
    WHERE LOWER(r.email) = LOWER(${email})
      AND COALESCE(r.event_year, 2026) = ${eventYear}
    ORDER BY r.created_at DESC
    LIMIT 1
  `
  return (row as CheckInRow | undefined) ?? null
}

async function findByFamilyId(familyId: number, eventYear: number): Promise<CheckInRow | null> {
  // Preferred: registrations_v2 links family → registration id (same id as registrations).
  try {
    const [row] = await sql`
      SELECT
        r.id,
        r.family_last_name,
        r.lodging_type,
        r.room_keys,
        r.checked_in,
        r.checked_in_at,
        (
          SELECT COUNT(*)
          FROM family_members fm
          WHERE fm.registration_id = r.id
        ) AS attendee_count
      FROM registrations_v2 rv
      JOIN registrations r ON r.id = rv.id
      WHERE rv.family_id = ${familyId}
        AND rv.event_year = ${eventYear}
      ORDER BY r.created_at DESC
      LIMIT 1
    `
    if (row) return row as CheckInRow
  } catch {
    // registrations_v2 may be missing on older DBs
  }

  // Same year only: family email → legacy registrations.
  const [row] = await sql`
    SELECT
      r.id,
      r.family_last_name,
      r.lodging_type,
      r.room_keys,
      r.checked_in,
      r.checked_in_at,
      (
        SELECT COUNT(*)
        FROM family_members fm
        WHERE fm.registration_id = r.id
      ) AS attendee_count
    FROM registrations r
    JOIN families f ON LOWER(r.email) = LOWER(f.email)
    WHERE f.id = ${familyId}
      AND COALESCE(r.event_year, 2026) = ${eventYear}
    ORDER BY r.created_at DESC
    LIMIT 1
  `
  return (row as CheckInRow | undefined) ?? null
}

/**
 * Read-only check-in / lodging status for the signed-in family's registration
 * for the requested event year only (no cross-year fallback).
 * Resolves via family id (registrations_v2) and email so linked app accounts work.
 */
export async function getFamilyCheckIn(
  family: Family | null,
  yearInput?: string | null,
): Promise<FamilyCheckInPayload> {
  const eventYear = parseRegistrationEventYear(yearInput ?? null)
  if (!family) {
    return emptyPayload(
      eventYear,
      "No family profile linked to this account yet.",
    )
  }

  let row = await findByFamilyId(family.id, eventYear)
  if (!row) {
    const email = family.email?.trim()
    if (email) row = await findByEmail(email, eventYear)
  }

  if (!row) {
    return emptyPayload(
      eventYear,
      `No registration linked for ${eventYear} yet.`,
    )
  }

  return mapRow(row, eventYear)
}
