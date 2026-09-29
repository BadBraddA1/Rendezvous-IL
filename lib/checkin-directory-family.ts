/**
 * Resolve the directory `families.id` for a check-in registration (email match).
 */

import { sql } from "@/lib/db"
import { findFamilyIdByMemberEmail } from "@/lib/family-membership"

export async function resolveDirectoryFamilyIdForRegistration(input: {
  registrationId: number
  email?: string | null
}): Promise<number | null> {
  const email = (input.email || "").trim()
  if (email) {
    const [byFamilyEmail] = await sql`
      SELECT id FROM families
      WHERE LOWER(TRIM(email)) = LOWER(${email})
      LIMIT 1
    `
    if (byFamilyEmail) return Number(byFamilyEmail.id)

    const member = await findFamilyIdByMemberEmail(email)
    if (member) return member.family_id
  }

  // Fallback: registration email already joined in directory listings.
  try {
    const [row] = await sql`
      SELECT f.id
      FROM registrations r
      JOIN families f ON LOWER(TRIM(f.email)) = LOWER(TRIM(r.email))
      WHERE r.id = ${input.registrationId}
      LIMIT 1
    `
    if (row) return Number(row.id)
  } catch {
    // ignore
  }

  return null
}
