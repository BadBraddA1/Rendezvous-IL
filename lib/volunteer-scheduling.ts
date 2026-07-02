import { sql, type SqlRow } from "@/lib/db"

/**
 * Scheduling rules for worship-service volunteers:
 * 1. A slot (date + time slot + prayer type + role) holds one volunteer.
 * 2. A person is booked at most once per day, even across different roles.
 *
 * "Person" = registration + volunteer name, since someone who signed up for
 * several roles has one volunteer_signups row per role.
 */
export async function findAssignmentConflict(
  signup: SqlRow,
  assignedDate: string,
  timeSlot: string,
  prayerType: string,
): Promise<string | null> {
  const [slotTaken] = await sql`
    SELECT vs.volunteer_name FROM volunteer_signups vs
    WHERE vs.id != ${signup.id}
      AND vs.assigned_date = ${assignedDate}
      AND vs.time_slot = ${timeSlot}
      AND vs.prayer_type = ${prayerType}
      AND vs.volunteer_type = ${signup.volunteer_type}
    LIMIT 1
  `
  if (slotTaken) {
    return `That slot is already filled by ${slotTaken.volunteer_name}. Unassign them first.`
  }

  const [bookedSameDay] = await sql`
    SELECT vs.volunteer_type, vs.time_slot FROM volunteer_signups vs
    WHERE vs.id != ${signup.id}
      AND COALESCE(vs.registration_id, -1) = COALESCE(${signup.registration_id}, -1)
      AND LOWER(TRIM(vs.volunteer_name)) = LOWER(TRIM(${signup.volunteer_name}))
      AND vs.assigned_date = ${assignedDate}
    LIMIT 1
  `
  if (bookedSameDay) {
    return `${signup.volunteer_name} is already scheduled that day (${bookedSameDay.volunteer_type}, ${bookedSameDay.time_slot}). One booking per person per day.`
  }

  return null
}
