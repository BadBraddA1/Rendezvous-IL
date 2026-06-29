/**
 * Family authentication utilities
 * Links Clerk users to family records and registration history
 */

import { auth, currentUser } from "@clerk/nextjs/server"
import { sql } from "@/lib/db"

export interface Family {
  id: number
  family_last_name: string
  husband_first_name: string | null
  wife_first_name: string | null
  email: string | null
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
  husband_phone: string | null
  wife_phone: string | null
  home_congregation: string | null
  years_homeschooling: number | null
  clerk_user_id: string | null
  created_at: string
  updated_at: string
}

export interface Registration {
  id: number
  family_last_name: string
  email: string
  lodging_type: string
  lodging_total: number
  tshirt_total: number
  climbing_tower_total: number
  registration_fee: number
  registration_fee_paid: boolean
  full_payment_paid: boolean
  checked_in: boolean
  created_at: string
  attendee_count: number
}

export interface FamilyMember {
  id: number
  first_name: string
  last_name: string
  date_of_birth: string | null
  is_baptized: boolean
  gender: string | null
}

/**
 * Resolve a family for a signed-in Clerk user: by clerk_user_id, then email.
 * Optionally links an unlinked family row to this Clerk account.
 */
export async function resolveFamilyForUser(
  clerkUserId: string,
  email: string | undefined,
  options?: { autoLink?: boolean },
): Promise<Family | null> {
  const autoLink = options?.autoLink ?? true

  const byClerk = await getFamilyByClerkId(clerkUserId)
  if (byClerk) return byClerk

  if (!email) return null

  const byEmail = await getFamilyByEmail(email)
  if (!byEmail) return null

  if (autoLink && !byEmail.clerk_user_id) {
    await linkFamilyToClerk(byEmail.id, clerkUserId)
    return { ...byEmail, clerk_user_id: clerkUserId }
  }

  return byEmail
}

/**
 * Full family_members_v2 rows for profile editing.
 * Fills missing birthdays from the family's latest registration when names match.
 */
export async function getFamilyMembersV2(familyId: number, familyEmail?: string | null) {
  try {
    const members = await sql`
      SELECT *
      FROM family_members_v2
      WHERE family_id = ${familyId}
      ORDER BY first_name ASC
    `

    if (!familyEmail || members.length === 0) return members

    const registrationMembers = await sql`
      SELECT fm.first_name, fm.last_name, fm.date_of_birth
      FROM family_members fm
      JOIN registrations r ON r.id = fm.registration_id
      WHERE LOWER(r.email) = LOWER(${familyEmail})
        AND fm.date_of_birth IS NOT NULL
        AND fm.date_of_birth != ''
      ORDER BY r.created_at DESC
    `

    if (registrationMembers.length === 0) return members

    return members.map((member) => {
      if (member.date_of_birth) return member

      const match = registrationMembers.find(
        (reg) =>
          normalizeName(reg.first_name) === normalizeName(member.first_name) &&
          normalizeName(reg.last_name) === normalizeName(member.last_name),
      )

      return match?.date_of_birth
        ? { ...member, date_of_birth: match.date_of_birth }
        : member
    })
  } catch (error) {
    console.error("[Family Auth] Error fetching family members v2:", error)
    return []
  }
}

function normalizeName(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
}

export type RegistrationBirthdayHint = {
  first_name: string
  last_name: string
  date_of_birth: string
}

/** Latest registration birthdays for a family email (for profile auto-fill). */
export async function getRegistrationBirthdayHints(
  familyEmail: string,
): Promise<RegistrationBirthdayHint[]> {
  try {
    const rows = await sql`
      SELECT fm.first_name, fm.last_name, fm.date_of_birth
      FROM family_members fm
      JOIN registrations r ON r.id = fm.registration_id
      WHERE LOWER(r.email) = LOWER(${familyEmail})
        AND fm.date_of_birth IS NOT NULL
        AND fm.date_of_birth != ''
      ORDER BY r.created_at DESC
    `

    const seen = new Set<string>()
    const hints: RegistrationBirthdayHint[] = []

    for (const row of rows) {
      const key = `${normalizeName(row.first_name)}|${normalizeName(row.last_name)}`
      if (seen.has(key)) continue
      seen.add(key)
      hints.push({
        first_name: String(row.first_name),
        last_name: String(row.last_name),
        date_of_birth: String(row.date_of_birth),
      })
    }

    return hints
  } catch (error) {
    console.error("[Family Auth] Error fetching registration birthdays:", error)
    return []
  }
}

/**
 * Get the current user's linked family
 * Returns null if user is not signed in or not linked to a family
 */
export async function getCurrentFamily(): Promise<Family | null> {
  const { userId } = await auth()

  if (!userId) {
    return null
  }

  try {
    const [family] = await sql`
      SELECT * FROM families 
      WHERE clerk_user_id = ${userId}
      LIMIT 1
    `

    return family || null
  } catch (error) {
    console.error("[Family Auth] Error fetching family:", error)
    return null
  }
}

/**
 * Get family by Clerk user ID
 */
export async function getFamilyByClerkId(clerkUserId: string): Promise<Family | null> {
  try {
    const [family] = await sql`
      SELECT * FROM families 
      WHERE clerk_user_id = ${clerkUserId}
      LIMIT 1
    `

    return family || null
  } catch (error) {
    console.error("[Family Auth] Error fetching family by Clerk ID:", error)
    return null
  }
}

/**
 * Get family by email address
 * Used for auto-linking when a user signs up
 * Returns family even if already linked (for display purposes)
 */
export async function getFamilyByEmail(email: string): Promise<Family | null> {
  try {
    const [family] = await sql`
      SELECT * FROM families 
      WHERE LOWER(email) = LOWER(${email})
      LIMIT 1
    `

    return family || null
  } catch (error) {
    console.error("[Family Auth] Error fetching family by email:", error)
    return null
  }
}

/**
 * Get unlinked family by email address
 * Only returns families that don't have a clerk_user_id yet
 */
export async function getUnlinkedFamilyByEmail(email: string): Promise<Family | null> {
  try {
    const [family] = await sql`
      SELECT * FROM families 
      WHERE LOWER(email) = LOWER(${email})
      AND clerk_user_id IS NULL
      LIMIT 1
    `

    return family || null
  } catch (error) {
    console.error("[Family Auth] Error fetching unlinked family by email:", error)
    return null
  }
}

/**
 * Link a family to a Clerk user
 */
export async function linkFamilyToClerk(familyId: number, clerkUserId: string): Promise<boolean> {
  try {
    await sql`
      UPDATE families 
      SET clerk_user_id = ${clerkUserId}, updated_at = NOW()
      WHERE id = ${familyId}
    `
    return true
  } catch (error) {
    console.error("[Family Auth] Error linking family:", error)
    return false
  }
}

/**
 * Get all registrations for a family (by email match)
 * Since we don't have a family_id on registrations, we match by email
 */
export async function getFamilyRegistrations(familyEmail: string): Promise<Registration[]> {
  try {
    const registrations = await sql`
      SELECT 
        r.*,
        COUNT(fm.id)::int as attendee_count
      FROM registrations r
      LEFT JOIN family_members fm ON r.id = fm.registration_id
      WHERE LOWER(r.email) = LOWER(${familyEmail})
      GROUP BY r.id
      ORDER BY r.created_at DESC
    `

    return registrations
  } catch (error) {
    console.error("[Family Auth] Error fetching registrations:", error)
    return []
  }
}

/**
 * Get family members for a family
 */
export async function getFamilyMembers(familyId: number): Promise<FamilyMember[]> {
  try {
    const members = await sql`
      SELECT id, first_name, last_name, date_of_birth, is_baptized, gender
      FROM family_members_v2
      WHERE family_id = ${familyId}
      ORDER BY date_of_birth ASC
    `

    return members
  } catch (error) {
    console.error("[Family Auth] Error fetching family members:", error)
    return []
  }
}

/**
 * Get the current user's registration data for express checkout
 * Returns pre-filled form data from the most recent registration
 */
export async function getExpressRegistrationData(familyEmail: string) {
  try {
    const [latestRegistration] = await sql`
      SELECT 
        r.*,
        json_agg(
          json_build_object(
            'id', fm.id,
            'first_name', fm.first_name,
            'last_name', fm.last_name,
            'age', fm.age,
            'is_baptized', fm.is_baptized
          )
        ) as family_members
      FROM registrations r
      LEFT JOIN family_members fm ON r.id = fm.registration_id
      WHERE LOWER(r.email) = LOWER(${familyEmail})
      GROUP BY r.id
      ORDER BY r.created_at DESC
      LIMIT 1
    `

    if (!latestRegistration) {
      return null
    }

    return {
      familyLastName: latestRegistration.family_last_name,
      email: latestRegistration.email,
      address: latestRegistration.address,
      city: latestRegistration.city,
      state: latestRegistration.state,
      zip: latestRegistration.zip,
      husbandPhone: latestRegistration.husband_phone,
      wifePhone: latestRegistration.wife_phone,
      homeCongregation: latestRegistration.home_congregation,
      yearsHomeschooling: latestRegistration.years_homeschooling,
      emergencyContact: {
        name: latestRegistration.emergency_contact_name,
        phone: latestRegistration.emergency_contact_phone,
        relationship: latestRegistration.emergency_contact_relationship,
      },
      familyMembers: latestRegistration.family_members?.filter((m: any) => m.id !== null) || [],
    }
  } catch (error) {
    console.error("[Family Auth] Error fetching express registration data:", error)
    return null
  }
}
