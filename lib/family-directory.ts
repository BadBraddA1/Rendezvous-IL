import { sql, type SqlRow } from "@/lib/db"
import type { RegistrationEventYear } from "@/lib/registration-event-years"
import { getSqliteErrorMessage, isMissingSqliteColumn } from "@/lib/sqlite-errors"
import {
  buildDirectoryContactPhones,
  contactPhoneSearchHaystack,
  type DirectoryContactPhone,
} from "@/lib/directory-contacts"

let directorySchemaReady: Promise<void> | null = null

/** Adds directory photo columns on first use (safe if already migrated). */
export async function ensureFamilyDirectorySchema(): Promise<void> {
  if (!directorySchemaReady) {
    directorySchemaReady = runFamilyDirectoryMigrations()
  }
  await directorySchemaReady
}

async function runFamilyDirectoryMigrations() {
  const statements = [
    "ALTER TABLE families ADD COLUMN photo_url TEXT",
    "ALTER TABLE families ADD COLUMN directory_opt_in INTEGER DEFAULT 1",
    "ALTER TABLE families ADD COLUMN directory_blurb TEXT",
    "ALTER TABLE families ADD COLUMN photo_updated_at TEXT",
    "ALTER TABLE family_members_v2 ADD COLUMN phone TEXT",
    "ALTER TABLE registrations ADD COLUMN event_year INTEGER DEFAULT 2026",
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
}

type DirectoryEntryDraft = Omit<FamilyDirectoryEntry, "contact_phones"> & {
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
    return attachDirectoryContactPhones(entries)
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
): Promise<FamilyDirectoryEntry[]> {
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
