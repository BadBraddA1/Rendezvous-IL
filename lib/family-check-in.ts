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

function emptyPayload(eventYear: number): FamilyCheckInPayload {
  return {
    eventYear,
    hasRegistration: false,
    checkedIn: false,
    checkedInAt: null,
    lodgingType: null,
    roomKeys: [],
    familyLastName: null,
    attendeeCount: null,
    message: null,
  }
}

/**
 * Read-only check-in / lodging status for the signed-in family's registration.
 */
export async function getFamilyCheckIn(
  family: Family | null,
  yearInput?: string | null,
): Promise<FamilyCheckInPayload> {
  const eventYear = parseRegistrationEventYear(yearInput ?? null)
  const email = family?.email?.trim()
  if (!email) return emptyPayload(eventYear)

  const [row] = await sql`
    SELECT
      r.id,
      r.family_last_name,
      r.lodging_type,
      r.room_keys,
      r.checked_in,
      r.checked_in_at,
      (
        SELECT COUNT(*)::int
        FROM family_members fm
        WHERE fm.registration_id = r.id
      ) AS attendee_count
    FROM registrations r
    WHERE LOWER(r.email) = LOWER(${email})
      AND COALESCE(r.event_year, 2026) = ${eventYear}
    ORDER BY r.created_at DESC
    LIMIT 1
  `

  if (!row) return emptyPayload(eventYear)

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
