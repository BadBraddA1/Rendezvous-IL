/**
 * Migration Script: Move 2026 registration data to new multi-year schema
 * 
 * This script:
 * 1. Reads all registrations from the old schema
 * 2. Creates family records in the new `families` table
 * 3. Creates family member records in `family_members_v2`
 * 4. Creates 2026 registration records in `registrations_v2`
 * 5. Creates attendance records in `registration_attendees`
 * 
 * Run with: npx tsx scripts/migrate-2026-to-new-schema.ts
 */

import { neon } from "@neondatabase/serverless"

const DATABASE_URL = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL

if (!DATABASE_URL) {
  console.error("Missing DATABASE_URL environment variable")
  process.exit(1)
}

const sql = neon(DATABASE_URL)

interface OldRegistration {
  id: number
  email: string
  family_last_name: string
  husband_first_name: string | null
  wife_first_name: string | null
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
  husband_phone: string | null
  wife_phone: string | null
  home_congregation: string | null
  years_homeschooling: number | null
  lodging_type: string | null
  payment_status: string | null
  payment_method: string | null
  total_cost: number | null
  deposit_paid: number | null
  balance_due: number | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  emergency_contact_relationship: string | null
  special_requests: string | null
  dietary_restrictions: string | null
  how_heard_about: string | null
  liability_accepted: boolean
  liability_accepted_at: string | null
  liability_accepted_by: string | null
  photo_release_accepted: boolean
  checked_in: boolean
  checked_in_at: string | null
  room_assignment: string | null
  key_number: string | null
  created_at: string
}

interface OldFamilyMember {
  id: number
  registration_id: number
  first_name: string
  last_name: string
  date_of_birth: string | null
  age: number | null
  gender: string | null
  rate_key: string | null
  person_cost: number | null
  is_baptized: boolean
  climbing_tower: boolean
}

interface OldHealthInfo {
  family_member_id: number
  medical_conditions: string | null
  allergies: string | null
  medications: string | null
  special_needs: string | null
}

interface OldTshirtOrder {
  family_member_id: number
  size: string | null
  quantity: number | null
}

async function migrate() {
  console.log("Starting migration of 2026 data to new schema...")
  
  // Check if migration has already been run
  const existingFamilies = await sql`SELECT COUNT(*) as count FROM families`
  if (Number(existingFamilies[0].count) > 0) {
    console.log("Migration appears to have already been run. Families table has data.")
    console.log("If you want to re-run, please truncate the new tables first.")
    return
  }

  // 1. Get all old registrations
  console.log("Fetching old registrations...")
  const oldRegistrations = await sql`SELECT * FROM registrations ORDER BY id` as OldRegistration[]
  console.log(`Found ${oldRegistrations.length} registrations to migrate`)

  // 2. Get all old family members
  console.log("Fetching old family members...")
  const oldFamilyMembers = await sql`SELECT * FROM family_members ORDER BY registration_id, id` as OldFamilyMember[]
  console.log(`Found ${oldFamilyMembers.length} family members to migrate`)

  // 3. Get all health info
  console.log("Fetching health info...")
  const oldHealthInfo = await sql`SELECT * FROM health_info` as OldHealthInfo[]
  const healthInfoMap = new Map<number, OldHealthInfo>()
  for (const hi of oldHealthInfo) {
    healthInfoMap.set(hi.family_member_id, hi)
  }

  // 4. Get all tshirt orders
  console.log("Fetching tshirt orders...")
  const oldTshirtOrders = await sql`SELECT * FROM tshirt_orders` as OldTshirtOrder[]
  const tshirtMap = new Map<number, OldTshirtOrder>()
  for (const to of oldTshirtOrders) {
    tshirtMap.set(to.family_member_id, to)
  }

  // Group family members by registration_id
  const membersByRegistration = new Map<number, OldFamilyMember[]>()
  for (const member of oldFamilyMembers) {
    const existing = membersByRegistration.get(member.registration_id) || []
    existing.push(member)
    membersByRegistration.set(member.registration_id, existing)
  }

  // Track mapping from old member IDs to new member IDs
  const memberIdMap = new Map<number, number>()

  let familiesCreated = 0
  let membersCreated = 0
  let registrationsCreated = 0
  let attendeesCreated = 0

  // Process each registration
  for (const reg of oldRegistrations) {
    try {
      // Create family record
      const familyResult = await sql`
        INSERT INTO families (
          email, family_last_name, husband_first_name, wife_first_name,
          address, city, state, zip, husband_phone, wife_phone,
          home_congregation, years_homeschooling, created_at
        ) VALUES (
          ${reg.email}, ${reg.family_last_name}, ${reg.husband_first_name}, ${reg.wife_first_name},
          ${reg.address}, ${reg.city}, ${reg.state}, ${reg.zip}, ${reg.husband_phone}, ${reg.wife_phone},
          ${reg.home_congregation}, ${reg.years_homeschooling}, ${reg.created_at}
        )
        RETURNING id
      `
      const familyId = familyResult[0].id
      familiesCreated++

      // Create family members
      const members = membersByRegistration.get(reg.id) || []
      const newMemberIds: { oldId: number; newId: number }[] = []

      for (const member of members) {
        const memberResult = await sql`
          INSERT INTO family_members_v2 (
            family_id, first_name, last_name, date_of_birth, gender, is_baptized, created_at
          ) VALUES (
            ${familyId}, ${member.first_name}, ${member.last_name}, 
            ${member.date_of_birth}, ${member.gender}, ${member.is_baptized}, NOW()
          )
          RETURNING id
        `
        const newMemberId = memberResult[0].id
        memberIdMap.set(member.id, newMemberId)
        newMemberIds.push({ oldId: member.id, newId: newMemberId })
        membersCreated++
      }

      // Create 2026 registration record
      const regResult = await sql`
        INSERT INTO registrations_v2 (
          family_id, event_year, lodging_type, payment_status, payment_method,
          total_cost, deposit_paid, balance_due,
          emergency_contact_name, emergency_contact_phone, emergency_contact_relationship,
          special_requests, dietary_restrictions, how_heard_about,
          liability_accepted, liability_accepted_at, liability_accepted_by,
          photo_release_accepted, checked_in, checked_in_at,
          room_assignment, key_number, created_at
        ) VALUES (
          ${familyId}, 2026, ${reg.lodging_type}, ${reg.payment_status}, ${reg.payment_method},
          ${reg.total_cost}, ${reg.deposit_paid}, ${reg.balance_due},
          ${reg.emergency_contact_name}, ${reg.emergency_contact_phone}, ${reg.emergency_contact_relationship},
          ${reg.special_requests}, ${reg.dietary_restrictions}, ${reg.how_heard_about},
          ${reg.liability_accepted}, ${reg.liability_accepted_at}, ${reg.liability_accepted_by},
          ${reg.photo_release_accepted}, ${reg.checked_in}, ${reg.checked_in_at},
          ${reg.room_assignment}, ${reg.key_number}, ${reg.created_at}
        )
        RETURNING id
      `
      const newRegId = regResult[0].id
      registrationsCreated++

      // Create registration attendees (everyone who was in the old family_members)
      for (const { oldId, newId } of newMemberIds) {
        const oldMember = members.find(m => m.id === oldId)!
        const healthInfo = healthInfoMap.get(oldId)
        const tshirt = tshirtMap.get(oldId)

        await sql`
          INSERT INTO registration_attendees (
            registration_id, family_member_id, age_at_event, rate_key, person_cost,
            climbing_tower, tshirt_size, tshirt_quantity,
            health_conditions, allergies, medications, special_needs
          ) VALUES (
            ${newRegId}, ${newId}, ${oldMember.age}, ${oldMember.rate_key}, ${oldMember.person_cost},
            ${oldMember.climbing_tower}, ${tshirt?.size || null}, ${tshirt?.quantity || 0},
            ${healthInfo?.medical_conditions || null}, ${healthInfo?.allergies || null},
            ${healthInfo?.medications || null}, ${healthInfo?.special_needs || null}
          )
        `
        attendeesCreated++
      }

      console.log(`Migrated: ${reg.family_last_name} family (${members.length} members)`)
    } catch (error) {
      console.error(`Error migrating registration ${reg.id} (${reg.family_last_name}):`, error)
    }
  }

  console.log("\n=== Migration Complete ===")
  console.log(`Families created: ${familiesCreated}`)
  console.log(`Family members created: ${membersCreated}`)
  console.log(`2026 Registrations created: ${registrationsCreated}`)
  console.log(`Registration attendees created: ${attendeesCreated}`)
}

migrate()
  .then(() => {
    console.log("\nMigration finished successfully!")
    process.exit(0)
  })
  .catch((error) => {
    console.error("Migration failed:", error)
    process.exit(1)
  })
