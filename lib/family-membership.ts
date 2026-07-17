/**
 * Multi-user family membership: Clerk users linked to a shared families row.
 * Primary stays on families.clerk_user_id / families.email for compatibility;
 * additional members join via registration / profile member email match.
 */

import { sql, type SqlRow } from "@/lib/db"
import { getSqliteErrorMessage } from "@/lib/sqlite-errors"

export type FamilyAccountRole = "primary" | "member"
export type FamilyAccountSource = "primary_email" | "registration_member" | "admin"

export type FamilyAccountMember = {
  id: number
  family_id: number
  clerk_user_id: string
  email: string | null
  role: FamilyAccountRole
  source: FamilyAccountSource
  linked_at: string
}

export type FamilyLoginInvite = {
  email: string
  label: string | null
  linked: boolean
  clerk_user_id: string | null
}

let membershipSchemaReady: Promise<void> | null = null

export async function ensureFamilyMembershipSchema(): Promise<void> {
  if (!membershipSchemaReady) {
    membershipSchemaReady = runFamilyMembershipMigrations()
  }
  await membershipSchemaReady
}

async function runFamilyMembershipMigrations() {
  await sql.query(`
    CREATE TABLE IF NOT EXISTS family_account_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      family_id INTEGER NOT NULL,
      clerk_user_id TEXT NOT NULL,
      email TEXT,
      role TEXT NOT NULL DEFAULT 'member',
      source TEXT NOT NULL DEFAULT 'registration_member',
      linked_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (clerk_user_id)
    )
  `)

  for (const statement of [
    "CREATE INDEX IF NOT EXISTS idx_family_account_members_family ON family_account_members (family_id)",
    "CREATE INDEX IF NOT EXISTS idx_family_account_members_email ON family_account_members (email)",
    "ALTER TABLE family_members_v2 ADD COLUMN email TEXT",
  ]) {
    try {
      await sql.query(statement)
    } catch (error) {
      const message = getSqliteErrorMessage(error)
      if (/duplicate column name/i.test(message)) continue
      throw error
    }
  }

  await backfillPrimaryMemberships()
}

async function backfillPrimaryMemberships() {
  const rows = await sql`
    SELECT id, clerk_user_id, email
    FROM families
    WHERE clerk_user_id IS NOT NULL AND TRIM(clerk_user_id) != ''
  `

  for (const row of rows) {
    const familyId = Number(row.id)
    const clerkUserId = String(row.clerk_user_id)
    const email = normalizeEmail(row.email)
    await sql`
      INSERT INTO family_account_members (family_id, clerk_user_id, email, role, source)
      VALUES (${familyId}, ${clerkUserId}, ${email}, 'primary', 'primary_email')
      ON CONFLICT (clerk_user_id) DO UPDATE SET
        family_id = excluded.family_id,
        email = COALESCE(excluded.email, family_account_members.email),
        role = 'primary',
        source = CASE
          WHEN family_account_members.source = 'admin' THEN family_account_members.source
          ELSE 'primary_email'
        END
    `
  }
}

export function normalizeEmail(value: unknown): string | null {
  if (value == null) return null
  const email = String(value).trim().toLowerCase()
  return email || null
}

function mapMembership(row: SqlRow): FamilyAccountMember {
  const role = String(row.role || "member") === "primary" ? "primary" : "member"
  const sourceRaw = String(row.source || "registration_member")
  const source: FamilyAccountSource =
    sourceRaw === "primary_email" || sourceRaw === "admin" ? sourceRaw : "registration_member"

  return {
    id: Number(row.id),
    family_id: Number(row.family_id),
    clerk_user_id: String(row.clerk_user_id),
    email: row.email != null ? String(row.email) : null,
    role,
    source,
    linked_at: String(row.linked_at ?? ""),
  }
}

export async function getMembershipByClerkId(
  clerkUserId: string,
): Promise<FamilyAccountMember | null> {
  await ensureFamilyMembershipSchema()
  const [row] = await sql`
    SELECT * FROM family_account_members
    WHERE clerk_user_id = ${clerkUserId}
    LIMIT 1
  `
  return row ? mapMembership(row) : null
}

export async function listFamilyAccountMembers(
  familyId: number,
): Promise<FamilyAccountMember[]> {
  await ensureFamilyMembershipSchema()
  const rows = await sql`
    SELECT * FROM family_account_members
    WHERE family_id = ${familyId}
    ORDER BY
      CASE WHEN role = 'primary' THEN 0 ELSE 1 END,
      linked_at ASC
  `
  return rows.map(mapMembership)
}

export async function upsertFamilyAccountMember(input: {
  familyId: number
  clerkUserId: string
  email?: string | null
  role: FamilyAccountRole
  source: FamilyAccountSource
}): Promise<FamilyAccountMember> {
  await ensureFamilyMembershipSchema()
  const email = normalizeEmail(input.email)
  const clerkUserId = input.clerkUserId.trim()
  if (!clerkUserId) throw new Error("clerkUserId is required")

  await sql`
    INSERT INTO family_account_members (family_id, clerk_user_id, email, role, source)
    VALUES (${input.familyId}, ${clerkUserId}, ${email}, ${input.role}, ${input.source})
    ON CONFLICT (clerk_user_id) DO UPDATE SET
      family_id = excluded.family_id,
      email = COALESCE(excluded.email, family_account_members.email),
      role = excluded.role,
      source = excluded.source
  `

  const membership = await getMembershipByClerkId(clerkUserId)
  if (!membership) throw new Error("Failed to upsert family membership")
  return membership
}

/** Keep families.clerk_user_id in sync and ensure a primary membership row. */
export async function syncPrimaryFamilyMembership(
  familyId: number,
  clerkUserId: string,
  email?: string | null,
): Promise<void> {
  await ensureFamilyMembershipSchema()
  const normalized = normalizeEmail(email)

  await sql`
    UPDATE families
    SET clerk_user_id = ${clerkUserId},
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ${familyId}
  `

  // Demote any other primary rows for this family.
  await sql`
    UPDATE family_account_members
    SET role = 'member'
    WHERE family_id = ${familyId}
      AND role = 'primary'
      AND clerk_user_id != ${clerkUserId}
  `

  await upsertFamilyAccountMember({
    familyId,
    clerkUserId,
    email: normalized,
    role: "primary",
    source: "primary_email",
  })
}

export async function removeFamilyAccountMember(
  familyId: number,
  clerkUserId: string,
): Promise<boolean> {
  await ensureFamilyMembershipSchema()
  const membership = await getMembershipByClerkId(clerkUserId)
  if (!membership || membership.family_id !== familyId) return false
  if (membership.role === "primary") {
    throw new Error("Cannot remove the primary family account holder")
  }

  await sql`
    DELETE FROM family_account_members
    WHERE family_id = ${familyId}
      AND clerk_user_id = ${clerkUserId}
  `
  return true
}

export async function getFamilyAccountRole(
  familyId: number,
  clerkUserId: string,
): Promise<FamilyAccountRole | null> {
  const membership = await getMembershipByClerkId(clerkUserId)
  if (!membership || membership.family_id !== familyId) return null
  return membership.role
}

export async function userIsFamilyPrimary(
  familyId: number,
  clerkUserId: string,
): Promise<boolean> {
  const role = await getFamilyAccountRole(familyId, clerkUserId)
  return role === "primary"
}

/** Family id that already claims this Clerk user (if any). */
export async function findConflictingMembershipFamilyId(
  clerkUserId: string,
  intendedFamilyId: number,
): Promise<number | null> {
  const existing = await getMembershipByClerkId(clerkUserId)
  if (!existing) return null
  if (existing.family_id === intendedFamilyId) return null
  return existing.family_id
}

type EmailFamilyMatch = {
  family_id: number
  source: "registration_member" | "profile_member"
}

/**
 * Find a family that listed this email on a registration member or profile member.
 * Prefers families that already have a primary (linked) account.
 */
export async function findFamilyIdByMemberEmail(
  email: string,
): Promise<EmailFamilyMatch | null> {
  await ensureFamilyMembershipSchema()
  const normalized = normalizeEmail(email)
  if (!normalized) return null

  // Profile roster emails (family_members_v2).
  try {
    const profileMatches = await sql`
      SELECT fm.family_id, f.clerk_user_id
      FROM family_members_v2 fm
      JOIN families f ON f.id = fm.family_id
      WHERE LOWER(TRIM(fm.email)) = ${normalized}
      ORDER BY
        CASE WHEN f.clerk_user_id IS NOT NULL AND TRIM(f.clerk_user_id) != '' THEN 0 ELSE 1 END,
        f.id ASC
      LIMIT 1
    `
    if (profileMatches[0]) {
      return {
        family_id: Number(profileMatches[0].family_id),
        source: "profile_member",
      }
    }
  } catch (error) {
    const message = getSqliteErrorMessage(error)
    if (!/no such column/i.test(message)) throw error
  }

  // Registration member emails → family via matching registration / family email.
  const regMatches = await sql`
    SELECT f.id as family_id, f.clerk_user_id
    FROM family_members fm
    JOIN registrations r ON r.id = fm.registration_id
    JOIN families f ON LOWER(f.email) = LOWER(r.email)
    WHERE LOWER(TRIM(fm.email)) = ${normalized}
    ORDER BY
      CASE WHEN f.clerk_user_id IS NOT NULL AND TRIM(f.clerk_user_id) != '' THEN 0 ELSE 1 END,
      r.created_at DESC,
      f.id ASC
    LIMIT 1
  `
  if (regMatches[0]) {
    return {
      family_id: Number(regMatches[0].family_id),
      source: "registration_member",
    }
  }

  // registrations_v2 path when present
  try {
    const v2Matches = await sql`
      SELECT f.id as family_id, f.clerk_user_id
      FROM family_members fm
      JOIN registrations r ON r.id = fm.registration_id
      JOIN registrations_v2 rv ON rv.id = r.id
      JOIN families f ON f.id = rv.family_id
      WHERE LOWER(TRIM(fm.email)) = ${normalized}
      ORDER BY
        CASE WHEN f.clerk_user_id IS NOT NULL AND TRIM(f.clerk_user_id) != '' THEN 0 ELSE 1 END,
        r.created_at DESC,
        f.id ASC
      LIMIT 1
    `
    if (v2Matches[0]) {
      return {
        family_id: Number(v2Matches[0].family_id),
        source: "registration_member",
      }
    }
  } catch {
    // registrations_v2 may be absent or shaped differently — ignore.
  }

  return null
}

/** Login emails the family has offered (profile + registration) with link status. */
export async function listFamilyLoginInvites(
  familyId: number,
): Promise<FamilyLoginInvite[]> {
  await ensureFamilyMembershipSchema()

  const [family] = await sql`
    SELECT email, family_last_name FROM families WHERE id = ${familyId} LIMIT 1
  `
  if (!family) return []

  const members = await listFamilyAccountMembers(familyId)
  const linkedByEmail = new Map<string, FamilyAccountMember>()
  for (const member of members) {
    const email = normalizeEmail(member.email)
    if (email) linkedByEmail.set(email, member)
  }

  const invites = new Map<string, FamilyLoginInvite>()

  const primaryEmail = normalizeEmail(family.email)
  if (primaryEmail) {
    const linked = linkedByEmail.get(primaryEmail)
    invites.set(primaryEmail, {
      email: primaryEmail,
      label: "Primary account",
      linked: Boolean(linked),
      clerk_user_id: linked?.clerk_user_id ?? null,
    })
  }

  try {
    const profileRows = await sql`
      SELECT first_name, last_name, email
      FROM family_members_v2
      WHERE family_id = ${familyId}
        AND email IS NOT NULL
        AND TRIM(email) != ''
    `
    for (const row of profileRows) {
      const email = normalizeEmail(row.email)
      if (!email || invites.has(email)) continue
      const linked = linkedByEmail.get(email)
      const name = `${String(row.first_name ?? "")} ${String(row.last_name ?? "")}`.trim()
      invites.set(email, {
        email,
        label: name || null,
        linked: Boolean(linked),
        clerk_user_id: linked?.clerk_user_id ?? null,
      })
    }
  } catch (error) {
    const message = getSqliteErrorMessage(error)
    if (!/no such column/i.test(message)) throw error
  }

  const familyEmail = String(family.email ?? "")
  if (familyEmail) {
    const regRows = await sql`
      SELECT fm.first_name, fm.last_name, fm.email, fm.parent_role
      FROM family_members fm
      JOIN registrations r ON r.id = fm.registration_id
      WHERE LOWER(r.email) = LOWER(${familyEmail})
        AND fm.email IS NOT NULL
        AND TRIM(fm.email) != ''
      ORDER BY r.created_at DESC
    `
    for (const row of regRows) {
      const email = normalizeEmail(row.email)
      if (!email || invites.has(email)) continue
      const linked = linkedByEmail.get(email)
      const name = `${String(row.first_name ?? "")} ${String(row.last_name ?? "")}`.trim()
      const role = row.parent_role === "father" || row.parent_role === "mother"
        ? String(row.parent_role)
        : null
      invites.set(email, {
        email,
        label: name || (role ? role.charAt(0).toUpperCase() + role.slice(1) : null),
        linked: Boolean(linked),
        clerk_user_id: linked?.clerk_user_id ?? null,
      })
    }
  }

  // Include linked members whose email isn't in the invite lists yet.
  for (const member of members) {
    const email = normalizeEmail(member.email)
    if (!email || invites.has(email)) continue
    invites.set(email, {
      email,
      label: member.role === "primary" ? "Primary account" : "Linked account",
      linked: true,
      clerk_user_id: member.clerk_user_id,
    })
  }

  return Array.from(invites.values()).sort((a, b) => {
    if (a.linked !== b.linked) return a.linked ? -1 : 1
    return a.email.localeCompare(b.email)
  })
}

export async function familyHasRegistrationForYearViaMembership(
  clerkUserId: string,
  year: number,
): Promise<boolean> {
  await ensureFamilyMembershipSchema()

  const [legacy] = await sql`
    SELECT r.id
    FROM family_account_members m
    JOIN families f ON f.id = m.family_id
    JOIN registrations r ON LOWER(r.email) = LOWER(f.email)
    WHERE m.clerk_user_id = ${clerkUserId}
      AND COALESCE(r.event_year, 2026) = ${year}
    LIMIT 1
  `
  if (legacy) return true

  try {
    const [v2] = await sql`
      SELECT rv.id
      FROM family_account_members m
      JOIN registrations_v2 rv ON rv.family_id = m.family_id
      WHERE m.clerk_user_id = ${clerkUserId}
        AND rv.event_year = ${year}
      LIMIT 1
    `
    return Boolean(v2)
  } catch {
    return false
  }
}
