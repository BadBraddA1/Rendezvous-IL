import { sql, type SqlRow } from "@/lib/db"

let volunteerEmailEnsured = false

/** volunteer_email is added lazily (deployed DB predates it). */
export async function ensureVolunteerEmailColumn(): Promise<void> {
  if (volunteerEmailEnsured) return
  const rows = await sql.query("PRAGMA table_info(volunteer_signups)")
  if (!rows.some((r) => r.name === "volunteer_email")) {
    await sql.query("ALTER TABLE volunteer_signups ADD COLUMN volunteer_email TEXT")
  }
  volunteerEmailEnsured = true
}

/**
 * Best contact for a volunteer: the email entered for them in the volunteer
 * section of the registration form, then the family member with the same
 * first name who has an email, then the registration's primary email.
 */
export async function resolveVolunteerEmail(volunteer: SqlRow): Promise<string | null> {
  if (volunteer.volunteer_email && String(volunteer.volunteer_email).trim()) {
    return String(volunteer.volunteer_email).trim()
  }
  const firstName = String(volunteer.volunteer_name ?? "").trim().split(/\s+/)[0]?.toLowerCase()
  if (volunteer.registration_id && firstName) {
    const [member] = await sql`
      SELECT email FROM family_members
      WHERE registration_id = ${volunteer.registration_id}
        AND email IS NOT NULL AND email != ''
        AND LOWER(first_name) = ${firstName}
      LIMIT 1
    `
    if (member?.email) return String(member.email)
  }
  if (volunteer.registration_id) {
    const [reg] = await sql`SELECT email FROM registrations WHERE id = ${volunteer.registration_id}`
    if (reg?.email) return String(reg.email)
  }
  return null
}

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
