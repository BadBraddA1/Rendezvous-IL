/**
 * Family authentication utilities
 * Links Clerk users to family records and registration history
 */

import { auth } from "@clerk/nextjs/server"
import { sql } from "@/lib/db"
import {
  ensureFamilyMembershipSchema,
  findConflictingMembershipFamilyId,
  findFamilyIdByMemberEmail,
  getMembershipByClerkId,
  normalizeEmail,
  syncPrimaryFamilyMembership,
  upsertFamilyAccountMember,
  type FamilyAccountRole,
} from "@/lib/family-membership"

export type { FamilyAccountRole }

function asFamily(row: Record<string, unknown> | null | undefined): Family | null {
  return row ? (row as unknown as Family) : null
}

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
  photo_url: string | null
  directory_opt_in: boolean
  directory_blurb: string | null
  photo_updated_at: string | null
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
 * Resolve a family for a signed-in Clerk user:
 * 1) family_account_members / families.clerk_user_id
 * 2) primary families.email match (claim unlinked primary)
 * 3) registration / profile member email match (join as member)
 */
export async function resolveFamilyForUser(
  clerkUserId: string,
  email: string | undefined,
  options?: { autoLink?: boolean },
): Promise<Family | null> {
  const autoLink = options?.autoLink ?? true
  await ensureFamilyMembershipSchema()

  const membership = await getMembershipByClerkId(clerkUserId)
  if (membership) {
    const family = await getFamilyById(membership.family_id)
    if (family) return family
  }

  const byClerk = await getFamilyByClerkId(clerkUserId)
  if (byClerk) {
    if (autoLink) {
      await syncPrimaryFamilyMembership(byClerk.id, clerkUserId, byClerk.email ?? email)
    }
    return byClerk
  }

  const normalized = normalizeEmail(email)
  if (!normalized) return null

  const byEmail = await getFamilyByEmail(normalized)
  if (byEmail) {
    if (byEmail.clerk_user_id && byEmail.clerk_user_id !== clerkUserId) {
      // Primary slot taken — still allow member join if this email is listed on members.
    } else if (autoLink) {
      await linkFamilyToClerk(byEmail.id, clerkUserId)
      return { ...byEmail, clerk_user_id: clerkUserId }
    } else {
      return byEmail
    }
  }

  if (!autoLink) return null

  const memberMatch = await findFamilyIdByMemberEmail(normalized)
  if (!memberMatch) return null

  const conflict = await findConflictingMembershipFamilyId(clerkUserId, memberMatch.family_id)
  if (conflict != null) {
    console.warn(
      `[Family Auth] Clerk user ${clerkUserId} already linked to family ${conflict}; not auto-joining ${memberMatch.family_id}`,
    )
    return null
  }

  // If this email is the family's primary email and unlinked, claim primary instead.
  const target = await getFamilyById(memberMatch.family_id)
  if (!target) return null

  const targetPrimaryEmail = normalizeEmail(target.email)
  if (targetPrimaryEmail === normalized && !target.clerk_user_id) {
    await linkFamilyToClerk(target.id, clerkUserId)
    return { ...target, clerk_user_id: clerkUserId }
  }

  if (target.clerk_user_id === clerkUserId) {
    await syncPrimaryFamilyMembership(target.id, clerkUserId, normalized)
    return target
  }

  await upsertFamilyAccountMember({
    familyId: target.id,
    clerkUserId,
    email: normalized,
    role: "member",
    source: "registration_member",
  })

  return target
}

export async function getFamilyById(familyId: number): Promise<Family | null> {
  try {
    const [family] = await sql`
      SELECT * FROM families
      WHERE id = ${familyId}
      LIMIT 1
    `
    return asFamily(family)
  } catch (error) {
    console.error("[Family Auth] Error fetching family by id:", error)
    return null
  }
}

/** Role for this Clerk user on the given family (null if not a member). */
export async function getFamilyRoleForUser(
  familyId: number,
  clerkUserId: string,
): Promise<FamilyAccountRole | null> {
  await ensureFamilyMembershipSchema()
  const membership = await getMembershipByClerkId(clerkUserId)
  if (!membership || membership.family_id !== familyId) {
    // Legacy: families.clerk_user_id without membership row yet
    const family = await getFamilyById(familyId)
    if (family?.clerk_user_id === clerkUserId) return "primary"
    return null
  }
  return membership.role
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
  const { userId } = await auth({ acceptsToken: "session_token" })

  if (!userId) {
    return null
  }

  try {
    await ensureFamilyMembershipSchema()
    const membership = await getMembershipByClerkId(userId)
    if (membership) {
      return getFamilyById(membership.family_id)
    }

    const [family] = await sql`
      SELECT * FROM families 
      WHERE clerk_user_id = ${userId}
      LIMIT 1
    `

    return asFamily(family)
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

    return asFamily(family)
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

    return asFamily(family)
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

    return asFamily(family)
  } catch (error) {
    console.error("[Family Auth] Error fetching unlinked family by email:", error)
    return null
  }
}

/**
 * Link a family to a Clerk user as the primary account holder.
 */
export async function linkFamilyToClerk(familyId: number, clerkUserId: string): Promise<boolean> {
  try {
    const family = await getFamilyById(familyId)
    if (!family) return false

    if (family.clerk_user_id && family.clerk_user_id !== clerkUserId) {
      console.warn(
        `[Family Auth] Family ${familyId} already linked to ${family.clerk_user_id}; not reclaiming for ${clerkUserId}`,
      )
      return false
    }

    const conflict = await findConflictingMembershipFamilyId(clerkUserId, familyId)
    if (conflict != null) {
      console.warn(
        `[Family Auth] Clerk user ${clerkUserId} already linked to family ${conflict}; not linking family ${familyId}`,
      )
      return false
    }

    await syncPrimaryFamilyMembership(familyId, clerkUserId, family.email)
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

    return registrations as unknown as Registration[]
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

    return members as unknown as FamilyMember[]
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
      SELECT r.*
      FROM registrations r
      WHERE LOWER(r.email) = LOWER(${familyEmail})
      ORDER BY r.created_at DESC
      LIMIT 1
    `

    if (!latestRegistration) {
      return null
    }

    const familyMembers = await sql`
      SELECT id, first_name, last_name, age, is_baptized
      FROM family_members
      WHERE registration_id = ${latestRegistration.id}
      ORDER BY id ASC
    `

    return {
      familyLastName: latestRegistration.family_last_name,
      email: latestRegistration.email,
      lodgingType: latestRegistration.lodging_type,
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
      familyMembers,
    }
  } catch (error) {
    console.error("[Family Auth] Error fetching express registration data:", error)
    return null
  }
}
