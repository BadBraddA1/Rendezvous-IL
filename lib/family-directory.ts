import { sql, type SqlRow } from "@/lib/db"
import type { RegistrationEventYear } from "@/lib/registration-event-years"

export type FamilyDirectoryEntry = {
  id: number
  family_last_name: string
  home_congregation: string | null
  photo_url: string
  directory_blurb: string | null
  husband_first_name: string | null
  wife_first_name: string | null
  member_count: number
  member_names: string[]
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
  const [row] = await sql`
    SELECT photo_url, directory_opt_in, directory_blurb, photo_updated_at
    FROM families
    WHERE id = ${familyId}
  `
  if (!row) return null
  return mapDirectorySettings(row)
}

export function mapDirectorySettings(row: SqlRow): FamilyDirectorySettings {
  return {
    photo_url: row.photo_url ? String(row.photo_url) : null,
    directory_opt_in: Boolean(row.directory_opt_in),
    directory_blurb: row.directory_blurb ? String(row.directory_blurb) : null,
    photo_updated_at: row.photo_updated_at ? String(row.photo_updated_at) : null,
  }
}

export async function updateFamilyDirectorySettings(
  familyId: number,
  settings: { directory_opt_in?: boolean; directory_blurb?: string | null },
) {
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
  if (email) {
    const [legacy] = await sql`
      SELECT id FROM registrations
      WHERE LOWER(email) = LOWER(${email})
        AND COALESCE(event_year, 2026) = ${year}
      LIMIT 1
    `
    if (legacy) return true
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
  }

  return false
}

export async function fetchDirectoryEntries(
  year: RegistrationEventYear,
): Promise<FamilyDirectoryEntry[]> {
  const rows = await sql`
    SELECT
      f.id,
      f.family_last_name,
      f.home_congregation,
      f.photo_url,
      f.directory_blurb,
      f.husband_first_name,
      f.wife_first_name,
      COUNT(fm.id) as member_count,
      GROUP_CONCAT(fm.first_name, ', ') as member_names_csv
    FROM families f
    LEFT JOIN family_members_v2 fm ON fm.family_id = f.id
    WHERE f.directory_opt_in = 1
      AND f.photo_url IS NOT NULL
      AND TRIM(f.photo_url) != ''
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

  return rows.map((row) => ({
    id: Number(row.id),
    family_last_name: String(row.family_last_name ?? ""),
    home_congregation: row.home_congregation ? String(row.home_congregation) : null,
    photo_url: String(row.photo_url),
    directory_blurb: row.directory_blurb ? String(row.directory_blurb) : null,
    husband_first_name: row.husband_first_name ? String(row.husband_first_name) : null,
    wife_first_name: row.wife_first_name ? String(row.wife_first_name) : null,
    member_count: Number(row.member_count ?? 0),
    member_names: row.member_names_csv
      ? String(row.member_names_csv)
          .split(",")
          .map((name) => name.trim())
          .filter(Boolean)
      : [],
  }))
}
