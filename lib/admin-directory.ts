import { sql, type SqlRow } from "@/lib/db"
import { ensureFamilyDirectorySchema, isFamilyDirectoryListed } from "@/lib/family-directory"
import { formatPhoneForStorage } from "@/lib/phone-format"
import type { RegistrationEventYear } from "@/lib/registration-event-years"
import { isMissingSqliteColumn } from "@/lib/sqlite-errors"

/**
 * Admin view of the Family Directory: every family with a registration for
 * the year (including ones hidden from the public directory), with the card
 * fields and the registration members that drive the public member list.
 */

export type AdminDirectoryMember = {
  id: number
  first_name: string
  last_name: string
  age: number | null
  parent_role: "father" | "mother" | null
  email: string | null
  phone: string | null
  share_contact_directory: boolean
}

export type AdminDirectoryFamily = {
  id: number
  family_last_name: string
  husband_first_name: string | null
  wife_first_name: string | null
  email: string | null
  home_congregation: string | null
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
  photo_url: string | null
  directory_opt_in: boolean
  directory_blurb: string | null
  registration_id: number | null
  members: AdminDirectoryMember[]
}

function mapMember(row: SqlRow): AdminDirectoryMember {
  return {
    id: Number(row.id),
    first_name: String(row.first_name ?? ""),
    last_name: String(row.last_name ?? ""),
    age: row.age != null && Number.isFinite(Number(row.age)) ? Number(row.age) : null,
    parent_role:
      row.parent_role === "father" || row.parent_role === "mother" ? row.parent_role : null,
    email: row.email ? String(row.email) : null,
    phone: row.phone ? String(row.phone) : null,
    share_contact_directory: Number(row.share_contact_directory) === 1,
  }
}

export async function listAdminDirectoryFamilies(
  year: RegistrationEventYear,
): Promise<AdminDirectoryFamily[]> {
  await ensureFamilyDirectorySchema()

  const familyRows = await sql`
    SELECT
      f.id, f.family_last_name, f.husband_first_name, f.wife_first_name, f.email,
      f.home_congregation, f.address, f.city, f.state, f.zip,
      f.photo_url, f.directory_opt_in, f.directory_blurb
    FROM families f
    WHERE
      EXISTS (
        SELECT 1 FROM registrations r
        WHERE LOWER(r.email) = LOWER(f.email)
          AND COALESCE(r.event_year, 2026) = ${year}
      )
      OR EXISTS (
        SELECT 1 FROM registrations_v2 rv
        WHERE rv.family_id = f.id AND rv.event_year = ${year}
      )
    ORDER BY f.family_last_name ASC
  `

  // Latest registration per family email for the year — the same rows the
  // public directory uses for its member list.
  let memberRows: SqlRow[] = []
  try {
    memberRows = await sql`
      SELECT
        fm.id, fm.registration_id, fm.first_name, fm.last_name, fm.age,
        fm.parent_role, fm.email, fm.phone,
        COALESCE(fm.share_contact_directory, 0) as share_contact_directory,
        LOWER(r.email) as reg_email
      FROM family_members fm
      JOIN registrations r ON fm.registration_id = r.id
      WHERE COALESCE(r.event_year, 2026) = ${year}
        AND r.id = (
          SELECT MAX(r2.id) FROM registrations r2
          WHERE LOWER(r2.email) = LOWER(r.email)
            AND COALESCE(r2.event_year, 2026) = ${year}
        )
      ORDER BY fm.id ASC
    `
  } catch (error) {
    if (!isMissingSqliteColumn(error, "share_contact_directory")) throw error
  }

  const membersByEmail = new Map<string, { registrationId: number; members: AdminDirectoryMember[] }>()
  for (const row of memberRows) {
    const email = String(row.reg_email ?? "")
    if (!email) continue
    const bucket = membersByEmail.get(email) ?? {
      registrationId: Number(row.registration_id),
      members: [],
    }
    bucket.members.push(mapMember(row))
    membersByEmail.set(email, bucket)
  }

  return familyRows.map((row) => {
    const email = row.email ? String(row.email).toLowerCase() : ""
    const bucket = email ? membersByEmail.get(email) : undefined
    return {
      id: Number(row.id),
      family_last_name: String(row.family_last_name ?? ""),
      husband_first_name: row.husband_first_name ? String(row.husband_first_name) : null,
      wife_first_name: row.wife_first_name ? String(row.wife_first_name) : null,
      email: row.email ? String(row.email) : null,
      home_congregation: row.home_congregation ? String(row.home_congregation) : null,
      address: row.address ? String(row.address) : null,
      city: row.city ? String(row.city) : null,
      state: row.state ? String(row.state) : null,
      zip: row.zip ? String(row.zip) : null,
      photo_url: row.photo_url ? String(row.photo_url) : null,
      directory_opt_in: isFamilyDirectoryListed(row.directory_opt_in),
      directory_blurb: row.directory_blurb ? String(row.directory_blurb) : null,
      registration_id: bucket?.registrationId ?? null,
      members: bucket?.members ?? [],
    }
  })
}

export type AdminDirectoryFamilyUpdate = {
  family_last_name?: string
  husband_first_name?: string | null
  wife_first_name?: string | null
  home_congregation?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
  zip?: string | null
  directory_opt_in?: boolean
  directory_blurb?: string | null
}

export async function updateAdminDirectoryFamily(
  familyId: number,
  updates: AdminDirectoryFamilyUpdate,
): Promise<void> {
  await ensureFamilyDirectorySchema()

  const set = (column: string, value: unknown) =>
    sql.query(`UPDATE families SET ${column} = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [
      value,
      familyId,
    ])

  if (updates.family_last_name !== undefined) await set("family_last_name", updates.family_last_name)
  if (updates.husband_first_name !== undefined) await set("husband_first_name", updates.husband_first_name)
  if (updates.wife_first_name !== undefined) await set("wife_first_name", updates.wife_first_name)
  if (updates.home_congregation !== undefined) await set("home_congregation", updates.home_congregation)
  if (updates.address !== undefined) await set("address", updates.address)
  if (updates.city !== undefined) await set("city", updates.city)
  if (updates.state !== undefined) await set("state", updates.state)
  if (updates.zip !== undefined) await set("zip", updates.zip)
  if (updates.directory_opt_in !== undefined) await set("directory_opt_in", updates.directory_opt_in ? 1 : 0)
  if (updates.directory_blurb !== undefined) await set("directory_blurb", updates.directory_blurb)
}

export type AdminDirectoryMemberUpdate = {
  first_name?: string
  last_name?: string
  age?: number | null
  parent_role?: "father" | "mother" | null
  email?: string | null
  phone?: string | null
  share_contact_directory?: boolean
}

export async function updateAdminDirectoryMember(
  memberId: number,
  updates: AdminDirectoryMemberUpdate,
): Promise<void> {
  await ensureFamilyDirectorySchema()

  const set = (column: string, value: unknown) =>
    sql.query(`UPDATE family_members SET ${column} = ? WHERE id = ?`, [value, memberId])

  if (updates.first_name !== undefined) await set("first_name", updates.first_name)
  if (updates.last_name !== undefined) await set("last_name", updates.last_name)
  if (updates.age !== undefined) await set("age", updates.age)
  if (updates.parent_role !== undefined) await set("parent_role", updates.parent_role)
  if (updates.email !== undefined) await set("email", updates.email?.trim() || null)
  if (updates.phone !== undefined) {
    await set("phone", updates.phone ? formatPhoneForStorage(updates.phone) : null)
  }
  if (updates.share_contact_directory !== undefined) {
    await set("share_contact_directory", updates.share_contact_directory ? 1 : 0)
  }
}
