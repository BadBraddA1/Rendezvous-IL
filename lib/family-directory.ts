import { sql, type SqlRow } from "@/lib/db"
import type { RegistrationEventYear } from "@/lib/registration-event-years"
import { getSqliteErrorMessage, isMissingSqliteColumn } from "@/lib/sqlite-errors"
import {
  buildDirectoryContactPhones,
  contactPhoneSearchHaystack,
  memberDisplayName,
  type DirectoryContactPhone,
} from "@/lib/directory-contacts"
import { formatPhoneForStorage } from "@/lib/phone-format"
import {
  ensureFamilyMembershipSchema,
  familyHasRegistrationForYearViaMembership,
} from "@/lib/family-membership"

let directorySchemaReady: Promise<void> | null = null

/** Adds directory photo columns on first use (safe if already migrated). */
export async function ensureFamilyDirectorySchema(): Promise<void> {
  if (!directorySchemaReady) {
    directorySchemaReady = runFamilyDirectoryMigrations()
  }
  await directorySchemaReady
  await ensureFamilyMembershipSchema()
}

async function runFamilyDirectoryMigrations() {
  const statements = [
    "ALTER TABLE families ADD COLUMN photo_url TEXT",
    "ALTER TABLE families ADD COLUMN directory_opt_in INTEGER DEFAULT 1",
    "ALTER TABLE families ADD COLUMN directory_blurb TEXT",
    "ALTER TABLE families ADD COLUMN photo_updated_at TEXT",
    "ALTER TABLE family_members_v2 ADD COLUMN phone TEXT",
    "ALTER TABLE registrations ADD COLUMN event_year INTEGER DEFAULT 2026",
    // Registration-form member contacts + directory opt-in (also added lazily
    // on submission; repeated here so the directory can read them safely).
    "ALTER TABLE family_members ADD COLUMN email TEXT",
    "ALTER TABLE family_members ADD COLUMN phone TEXT",
    "ALTER TABLE family_members ADD COLUMN parent_role TEXT",
    "ALTER TABLE family_members ADD COLUMN share_contact_directory INTEGER DEFAULT 0",
  ]

  for (const statement of statements) {
    try {
      await sql.query(statement)
    } catch (error) {
      const message = getSqliteErrorMessage(error)
      if (/duplicate column name/i.test(message)) continue
      throw error
    }
  }

  try {
    await sql.query("UPDATE registrations SET event_year = 2026 WHERE event_year IS NULL")
  } catch {
    // Column may not exist on very old schemas; ignore.
  }

  await migrateDirectoryListingDefaults()
}

const DIRECTORY_LISTING_DEFAULTS_KEY = "directory_listing_defaults_v2"

async function migrateDirectoryListingDefaults() {
  try {
    const [row] = await sql`
      SELECT value FROM app_settings WHERE key = ${DIRECTORY_LISTING_DEFAULTS_KEY}
    `
    if (row?.value === "1") return

    await sql`
      UPDATE families
      SET directory_opt_in = 1
      WHERE directory_opt_in IS NULL OR directory_opt_in = 0
    `
    await sql`
      INSERT INTO app_settings (key, value, updated_at)
      VALUES (${DIRECTORY_LISTING_DEFAULTS_KEY}, '1', CURRENT_TIMESTAMP)
      ON CONFLICT (key) DO UPDATE SET value = '1', updated_at = CURRENT_TIMESTAMP
    `
  } catch {
    // app_settings may not exist on very old schemas; listing query still uses COALESCE.
  }
}

export function isFamilyDirectoryListed(value: unknown): boolean {
  if (value === null || value === undefined) return true
  return Number(value) !== 0
}

export type DirectoryMember = {
  name: string
  role: "father" | "mother" | "child"
  /** Age at display time; null when unknown. */
  age: number | null
  is_adult: boolean
  /** Only set when the member opted in to sharing contact info. */
  email: string | null
  phone: string | null
}

export type FamilyDirectoryEntry = {
  id: number
  family_last_name: string
  home_congregation: string | null
  photo_url: string | null
  directory_blurb: string | null
  husband_first_name: string | null
  wife_first_name: string | null
  email: string | null
  formatted_address: string | null
  contact_phones: DirectoryContactPhone[]
  member_count: number
  member_names: string[]
  /** Registration members for the year: parents first, kids by age. Empty for legacy entries. */
  members: DirectoryMember[]
}

type DirectoryEntryDraft = Omit<FamilyDirectoryEntry, "contact_phones" | "members"> & {
  legacy_husband_phone: string | null
  legacy_wife_phone: string | null
}

export function formatFamilyDirectoryAddress(parts: {
  address?: string | null
  city?: string | null
  state?: string | null
  zip?: string | null
}): string | null {
  const street = parts.address?.trim()
  const city = parts.city?.trim()
  const state = parts.state?.trim()
  const zip = parts.zip?.trim()
  const cityStateZip = [city, [state, zip].filter(Boolean).join(" ")].filter(Boolean).join(", ")
  const segments = [street, cityStateZip].filter(Boolean)
  return segments.length > 0 ? segments.join(", ") : null
}

export type FamilyDirectorySettings = {
  photo_url: string | null
  directory_opt_in: boolean
  directory_blurb: string | null
  photo_updated_at: string | null
}

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"])
const MAX_PHOTO_BYTES = 5 * 1024 * 1024

export function validateFamilyPhoto(file: { type: string; size: number }) {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return "Please upload a JPG, PNG, or WebP image."
  }
  if (file.size > MAX_PHOTO_BYTES) {
    return "Photo must be 5 MB or smaller."
  }
  return null
}

export function photoExtensionForType(contentType: string): string {
  switch (contentType) {
    case "image/png":
      return "png"
    case "image/webp":
      return "webp"
    default:
      return "jpg"
  }
}

export async function getFamilyDirectorySettings(
  familyId: number,
): Promise<FamilyDirectorySettings | null> {
  await ensureFamilyDirectorySchema()

  try {
    const [row] = await sql`
      SELECT photo_url, directory_opt_in, directory_blurb, photo_updated_at
      FROM families
      WHERE id = ${familyId}
    `
    if (!row) return null
    return mapDirectorySettings(row)
  } catch (error) {
    if (isMissingSqliteColumn(error, "photo_url")) {
      return emptyDirectorySettings()
    }
    throw error
  }
}

function emptyDirectorySettings(): FamilyDirectorySettings {
  return {
    photo_url: null,
    directory_opt_in: true,
    directory_blurb: null,
    photo_updated_at: null,
  }
}

export function mapDirectorySettings(row: SqlRow): FamilyDirectorySettings {
  return {
    photo_url: row.photo_url ? String(row.photo_url) : null,
    directory_opt_in: isFamilyDirectoryListed(row.directory_opt_in),
    directory_blurb: row.directory_blurb ? String(row.directory_blurb) : null,
    photo_updated_at: row.photo_updated_at ? String(row.photo_updated_at) : null,
  }
}

export async function updateFamilyDirectorySettings(
  familyId: number,
  settings: { directory_opt_in?: boolean; directory_blurb?: string | null },
) {
  await ensureFamilyDirectorySchema()

  if (settings.directory_opt_in !== undefined) {
    await sql`
      UPDATE families
      SET directory_opt_in = ${settings.directory_opt_in ? 1 : 0},
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ${familyId}
    `
  }

  if (settings.directory_blurb !== undefined) {
    await sql`
      UPDATE families
      SET directory_blurb = ${settings.directory_blurb},
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ${familyId}
    `
  }
}

export async function setFamilyPhotoUrl(familyId: number, photoUrl: string | null) {
  await ensureFamilyDirectorySchema()

  await sql`
    UPDATE families
    SET photo_url = ${photoUrl},
        photo_updated_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ${familyId}
  `
}

export async function userHasRegistrationForYear(
  clerkUserId: string,
  email: string | undefined,
  year: RegistrationEventYear,
): Promise<boolean> {
  await ensureFamilyDirectorySchema()

  if (await familyHasRegistrationForYearViaMembership(clerkUserId, year)) {
    return true
  }

  if (email && (await hasLegacyRegistrationForYear(email, year))) {
    return true
  }

  const [familyReg] = await sql`
    SELECT rv.id
    FROM registrations_v2 rv
    JOIN families f ON rv.family_id = f.id
    WHERE f.clerk_user_id = ${clerkUserId}
      AND rv.event_year = ${year}
    LIMIT 1
  `
  if (familyReg) return true

  if (email) {
    const [familyEmailReg] = await sql`
      SELECT rv.id
      FROM registrations_v2 rv
      JOIN families f ON rv.family_id = f.id
      WHERE LOWER(f.email) = LOWER(${email})
        AND rv.event_year = ${year}
      LIMIT 1
    `
    if (familyEmailReg) return true

    const [familyLinkedLegacy] = await sql`
      SELECT r.id
      FROM registrations r
      JOIN families f ON LOWER(r.email) = LOWER(f.email)
      WHERE f.clerk_user_id = ${clerkUserId}
        AND COALESCE(r.event_year, 2026) = ${year}
      LIMIT 1
    `
    if (familyLinkedLegacy) return true
  }

  return false
}

async function hasLegacyRegistrationForYear(
  email: string,
  year: RegistrationEventYear,
): Promise<boolean> {
  try {
    const [row] = await sql`
      SELECT id FROM registrations
      WHERE LOWER(email) = LOWER(${email})
        AND COALESCE(event_year, 2026) = ${year}
      LIMIT 1
    `
    return Boolean(row)
  } catch (error) {
    if (isMissingSqliteColumn(error, "event_year") && year === 2026) {
      const [row] = await sql`
        SELECT id FROM registrations
        WHERE LOWER(email) = LOWER(${email})
        LIMIT 1
      `
      return Boolean(row)
    }
    if (isMissingSqliteColumn(error, "event_year")) {
      return false
    }
    throw error
  }
}

export async function fetchDirectoryEntries(
  year: RegistrationEventYear,
): Promise<FamilyDirectoryEntry[]> {
  await ensureFamilyDirectorySchema()

  try {
    const entries = await queryDirectoryEntries(year)
    const withPhones = await attachDirectoryContactPhones(entries)
    return attachRegistrationMembers(withPhones, year)
  } catch (error) {
    if (
      isMissingSqliteColumn(error, "photo_url") ||
      isMissingSqliteColumn(error, "directory_opt_in") ||
      isMissingSqliteColumn(error, "event_year")
    ) {
      return []
    }
    throw error
  }
}

function directoryMemberAge(row: SqlRow): number | null {
  if (row.age !== null && row.age !== undefined && Number.isFinite(Number(row.age))) {
    return Number(row.age)
  }
  const dob = row.date_of_birth ? String(row.date_of_birth) : ""
  if (!dob) return null
  const parsed = new Date(dob)
  if (Number.isNaN(parsed.getTime())) return null
  const now = new Date()
  let age = now.getFullYear() - parsed.getFullYear()
  const beforeBirthday =
    now.getMonth() < parsed.getMonth() ||
    (now.getMonth() === parsed.getMonth() && now.getDate() < parsed.getDate())
  if (beforeBirthday) age -= 1
  return age >= 0 && age < 130 ? age : null
}

/**
 * Pull each family's registration members for the year: father and mother
 * called out first, kids sorted oldest-to-youngest. Email/phone only come
 * through when the member checked "show in directory" during registration.
 */
async function attachRegistrationMembers(
  entries: Omit<FamilyDirectoryEntry, "members">[],
  year: RegistrationEventYear,
): Promise<FamilyDirectoryEntry[]> {
  if (entries.length === 0) return []

  let rows: SqlRow[] = []
  try {
    // One registration per family email (the latest for the year).
    rows = await sql`
      SELECT
        fm.first_name, fm.last_name, fm.age, fm.date_of_birth,
        fm.parent_role, fm.email, fm.phone,
        COALESCE(fm.share_contact_directory, 0) as share_contact,
        fm.is_adult_override,
        LOWER(r.email) as reg_email
      FROM family_members fm
      JOIN registrations r ON fm.registration_id = r.id
      WHERE COALESCE(r.event_year, 2026) = ${year}
        AND r.id = (
          SELECT MAX(r2.id) FROM registrations r2
          WHERE LOWER(r2.email) = LOWER(r.email)
            AND COALESCE(r2.event_year, 2026) = ${year}
        )
    `
  } catch (error) {
    // Very old schemas may predate the contact columns; fall back gracefully.
    if (isMissingSqliteColumn(error, "share_contact_directory")) {
      return entries.map((entry) => ({ ...entry, members: [] }))
    }
    throw error
  }

  const membersByEmail = new Map<string, DirectoryMember[]>()
  for (const row of rows) {
    const regEmail = String(row.reg_email ?? "")
    if (!regEmail) continue

    const role =
      row.parent_role === "father" || row.parent_role === "mother" ? row.parent_role : "child"
    const age = directoryMemberAge(row)
    const shareContact = Number(row.share_contact) === 1
    const member: DirectoryMember = {
      name: memberDisplayName(String(row.first_name ?? ""), String(row.last_name ?? "")),
      role,
      age,
      is_adult:
        role !== "child" || Number(row.is_adult_override) === 1 || (age !== null && age >= 18),
      email: shareContact && row.email ? String(row.email) : null,
      phone: shareContact && row.phone ? formatPhoneForStorage(String(row.phone)) : null,
    }

    const bucket = membersByEmail.get(regEmail) || []
    bucket.push(member)
    membersByEmail.set(regEmail, bucket)
  }

  const roleOrder = { father: 0, mother: 1, child: 2 } as const
  for (const bucket of membersByEmail.values()) {
    bucket.sort((a, b) => {
      if (roleOrder[a.role] !== roleOrder[b.role]) return roleOrder[a.role] - roleOrder[b.role]
      return (b.age ?? -1) - (a.age ?? -1)
    })
  }

  return entries.map((entry) => {
    const members = entry.email ? (membersByEmail.get(entry.email.toLowerCase()) ?? []) : []
    // Prefer opted-in registration phones over profile phones when present.
    const sharedPhones: DirectoryContactPhone[] = members
      .filter((m) => m.phone)
      .map((m) => ({ member_id: null, name: m.name, phone: m.phone! }))
    return {
      ...entry,
      members,
      contact_phones: sharedPhones.length > 0 ? sharedPhones : entry.contact_phones,
      member_count: members.length > 0 ? members.length : entry.member_count,
      member_names: members.length > 0 ? members.map((m) => m.name) : entry.member_names,
    }
  })
}

async function queryDirectoryEntries(year: RegistrationEventYear): Promise<DirectoryEntryDraft[]> {
  const rows = await sql`
    SELECT
      f.id,
      f.family_last_name,
      f.home_congregation,
      f.photo_url,
      f.directory_blurb,
      f.husband_first_name,
      f.wife_first_name,
      f.email,
      f.address,
      f.city,
      f.state,
      f.zip,
      f.husband_phone,
      f.wife_phone,
      COUNT(fm.id) as member_count,
      GROUP_CONCAT(fm.first_name, ', ') as member_names_csv
    FROM families f
    LEFT JOIN family_members_v2 fm ON fm.family_id = f.id
    WHERE COALESCE(f.directory_opt_in, 1) = 1
      AND (
        EXISTS (
          SELECT 1 FROM registrations r
          WHERE LOWER(r.email) = LOWER(f.email)
            AND COALESCE(r.event_year, 2026) = ${year}
        )
        OR EXISTS (
          SELECT 1 FROM registrations_v2 rv
          WHERE rv.family_id = f.id
            AND rv.event_year = ${year}
        )
      )
    GROUP BY f.id
    ORDER BY f.family_last_name ASC
  `

  return rows.map((row) => mapDirectoryEntry(row))
}

async function attachDirectoryContactPhones(
  entries: DirectoryEntryDraft[],
): Promise<Omit<FamilyDirectoryEntry, "members">[]> {
  if (entries.length === 0) return []

  const memberRows = await sql`
    SELECT id, family_id, first_name, last_name, phone
    FROM family_members_v2
    WHERE phone IS NOT NULL AND TRIM(phone) != ''
  `

  const membersByFamily = new Map<number, typeof memberRows>()
  const familyIds = new Set(entries.map((entry) => entry.id))

  for (const row of memberRows) {
    const familyId = Number(row.family_id)
    if (!familyIds.has(familyId)) continue
    const bucket = membersByFamily.get(familyId) || []
    bucket.push(row)
    membersByFamily.set(familyId, bucket)
  }

  return entries.map((entry) => ({
    ...entry,
    contact_phones: buildDirectoryContactPhones({
      members: (membersByFamily.get(entry.id) || []).map((row) => ({
        id: Number(row.id),
        family_id: Number(row.family_id),
        first_name: String(row.first_name ?? ""),
        last_name: String(row.last_name ?? ""),
        phone: row.phone ? String(row.phone) : null,
      })),
      husband_phone: entry.legacy_husband_phone,
      wife_phone: entry.legacy_wife_phone,
    }),
  }))
}

function mapDirectoryEntry(row: SqlRow): DirectoryEntryDraft {
  const photoUrl = row.photo_url ? String(row.photo_url).trim() : ""
  return {
    id: Number(row.id),
    family_last_name: String(row.family_last_name ?? ""),
    home_congregation: row.home_congregation ? String(row.home_congregation) : null,
    photo_url: photoUrl || null,
    directory_blurb: row.directory_blurb ? String(row.directory_blurb) : null,
    husband_first_name: row.husband_first_name ? String(row.husband_first_name) : null,
    wife_first_name: row.wife_first_name ? String(row.wife_first_name) : null,
    email: row.email ? String(row.email) : null,
    formatted_address: formatFamilyDirectoryAddress({
      address: row.address ? String(row.address) : null,
      city: row.city ? String(row.city) : null,
      state: row.state ? String(row.state) : null,
      zip: row.zip ? String(row.zip) : null,
    }),
    legacy_husband_phone: row.husband_phone ? String(row.husband_phone).trim() : null,
    legacy_wife_phone: row.wife_phone ? String(row.wife_phone).trim() : null,
    member_count: Number(row.member_count ?? 0),
    member_names: row.member_names_csv
      ? String(row.member_names_csv)
          .split(",")
          .map((name) => name.trim())
          .filter(Boolean)
      : [],
  }
}
