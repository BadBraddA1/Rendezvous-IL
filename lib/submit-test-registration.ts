import { sql } from "@/lib/db"
import { formatPhoneForStorage } from "@/lib/phone-format"
import { formatArrivalDepartureNotes } from "@/lib/registration-arrival-departure"
import type { RegistrationData } from "@/types/registration"

let contactColumnsEnsured = false

/**
 * The deployed Turso DB may predate the email/phone columns
 * (scripts/add-family-member-contact.sql). Local envs have no Turso
 * credentials, so apply the migration lazily on first submission.
 */
async function ensureContactColumns() {
  if (contactColumnsEnsured) return
  const rows = await sql.query("PRAGMA table_info(family_members)")
  const cols = new Set(rows.map((r) => r.name))
  if (!cols.has("email")) await sql.query("ALTER TABLE family_members ADD COLUMN email TEXT")
  if (!cols.has("phone")) await sql.query("ALTER TABLE family_members ADD COLUMN phone TEXT")
  contactColumnsEnsured = true
}

export async function submitTestRegistration(data: RegistrationData) {
  await ensureContactColumns()

  const arrivalNotes = formatArrivalDepartureNotes(
    data.arrivalDeparture,
    data.familyMembers,
    data.familyLastName,
  )

  const [registration] = await sql`
    INSERT INTO registrations (
      family_last_name, email, husband_phone, wife_phone, address, city, state, zip,
      home_congregation, father_occupation, times_attended, years_homeschooling,
      currently_homeschooling, arrival_notes, lodging_type, lodging_total,
      tshirt_total, climbing_tower_total, scholarship_donation, scholarship_requested,
      emergency_contact_name, emergency_contact_relationship, emergency_contact_phone,
      father_signature, mother_signature, registration_fee, payment_status,
      payment_notes, event_year
    ) VALUES (
      ${data.familyLastName},
      ${data.email},
      ${formatPhoneForStorage(data.husbandPhone)},
      ${formatPhoneForStorage(data.wifePhone)},
      ${data.address},
      ${data.city},
      ${data.state},
      ${data.zip},
      ${data.homeCongregation},
      ${data.fatherOccupation},
      ${data.timesAttended ?? 0},
      ${data.yearsHomeschooling ?? null},
      ${data.currentlyHomeschooling ? 1 : 0},
      ${arrivalNotes},
      ${data.lodgingType},
      ${data.lodgingTotal ?? 0},
      ${data.tshirtTotal ?? 0},
      ${data.climbingTowerTotal ?? 0},
      ${data.scholarshipDonation ?? 0},
      ${data.scholarshipRequested ? 1 : 0},
      ${data.emergencyContactName},
      ${data.emergencyContactRelationship},
      ${formatPhoneForStorage(data.emergencyContactPhone)},
      ${data.fatherSignature},
      ${data.motherSignature || null},
      ${data.registrationFee ?? 25},
      'pending',
      'ADMIN_TEST',
      2027
    )
    RETURNING id
  `

  const registrationId = Number(registration.id)

  for (const member of data.familyMembers ?? []) {
    if (!member.firstName) continue

    const lastName =
      member.useCustomLastName && member.lastName ? member.lastName : data.familyLastName

    await sql`
      INSERT INTO family_members (
        registration_id, first_name, last_name, date_of_birth, age, is_baptized, person_cost,
        email, phone
      ) VALUES (
        ${registrationId},
        ${member.firstName},
        ${lastName},
        ${member.dateOfBirth || null},
        ${member.age ?? null},
        ${member.isBaptized ? 1 : 0},
        ${member.personCost ?? 0},
        ${member.email?.trim() || null},
        ${member.phone ? formatPhoneForStorage(member.phone) : null}
      )
    `
  }

  for (const order of data.tshirtOrders ?? []) {
    await sql`
      INSERT INTO tshirt_orders (registration_id, size, color, quantity, price)
      VALUES (${registrationId}, ${order.size}, 'TBD', ${order.quantity}, 10.00)
    `
  }

  for (const health of data.healthInfo ?? []) {
    if (!health.fullName || !health.condition) continue
    await sql`
      INSERT INTO health_info (registration_id, full_name, condition, medication_on_hand)
      VALUES (
        ${registrationId},
        ${health.fullName},
        ${health.condition},
        ${health.medicationOnHand ? 1 : 0}
      )
    `
  }

  for (const volunteer of data.volunteerSignups ?? []) {
    for (const volunteerName of volunteer.names ?? []) {
      await sql`
        INSERT INTO volunteer_signups (registration_id, volunteer_type, volunteer_name)
        VALUES (${registrationId}, ${volunteer.type}, ${volunteerName})
      `
    }
  }

  if (data.sessionSuggestions?.moms) {
    await sql`
      INSERT INTO session_suggestions (registration_id, session_type, suggestion)
      VALUES (${registrationId}, 'moms', ${data.sessionSuggestions.moms})
    `
  }
  if (data.sessionSuggestions?.dads) {
    await sql`
      INSERT INTO session_suggestions (registration_id, session_type, suggestion)
      VALUES (${registrationId}, 'dads', ${data.sessionSuggestions.dads})
    `
  }

  return registrationId
}
