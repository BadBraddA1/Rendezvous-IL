import { NextResponse } from "next/server"
import { currentUser } from "@clerk/nextjs/server"
import { sql } from "@/lib/db"
import {
  getFamilyRoleForUser,
  resolveFamilyForUser,
  type Family,
} from "@/lib/family-auth"
import { canAccessExpressRegistrationPreview } from "@/lib/registration-access"

/**
 * Resolve the signed-in user's family the same way the preview page does:
 * by Clerk id first, then by email (auto-linking unlinked rows). Using only
 * getCurrentFamily() here made the API 401 with "Not authenticated" for
 * admins whose family row was matched by email but linked to a stale Clerk id.
 *
 * Express registration / payment is primary-account-only.
 */
async function ensureExpressTable(): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS express_registration_2027 (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      family_id INTEGER NOT NULL,
      lodging_type TEXT NOT NULL,
      occupancy_type TEXT,
      member_preferences TEXT NOT NULL DEFAULT '{}',
      estimated_total REAL DEFAULT 0,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `
}

async function getFamilyForRequest(options?: {
  requirePrimary?: boolean
}): Promise<
  { error: NextResponse; family?: undefined } | { family: Family; error?: undefined }
> {
  const user = await currentUser()
  if (!user) {
    return { error: NextResponse.json({ error: "Not authenticated" }, { status: 401 }) }
  }

  const family = await resolveFamilyForUser(user.id, user.emailAddresses[0]?.emailAddress)
  if (!family) {
    return {
      error: NextResponse.json(
        { error: "No linked family profile — run a test registration first" },
        { status: 404 },
      ),
    }
  }

  if (options?.requirePrimary) {
    const role = await getFamilyRoleForUser(family.id, user.id)
    if (role !== "primary") {
      return {
        error: NextResponse.json(
          {
            error:
              "Only the primary family account can submit or change registration. Ask the account holder, or update your shared family profile instead.",
          },
          { status: 403 },
        ),
      }
    }
  }

  return { family }
}

export async function GET() {
  try {
    if (!(await canAccessExpressRegistrationPreview())) {
      return NextResponse.json({ error: "Express registration preview is not available" }, { status: 403 })
    }

    const { family, error } = await getFamilyForRequest()
    if (error) return error

    await ensureExpressTable()
    const preferences = await sql`
      SELECT * FROM express_registration_2027 
      WHERE family_id = ${family.id}
      LIMIT 1
    `

    if (preferences.length === 0) {
      return NextResponse.json({ preferences: null })
    }

    return NextResponse.json({ preferences: preferences[0] })
  } catch (error) {
    console.error("Error fetching express registration preferences:", error)
    return NextResponse.json({ error: "Failed to fetch preferences" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    if (!(await canAccessExpressRegistrationPreview())) {
      return NextResponse.json({ error: "Express registration preview is not available" }, { status: 403 })
    }

    const { family, error } = await getFamilyForRequest({ requirePrimary: true })
    if (error) return error

    await ensureExpressTable()
    const body = await request.json()
    const { lodgingType, occupancyType, memberPreferences, estimatedTotal, notes } = body

    // Validate required fields
    if (!lodgingType) {
      return NextResponse.json({ error: "Lodging type is required" }, { status: 400 })
    }

    // Upsert the preferences
    const existing = await sql`
      SELECT id FROM express_registration_2027 
      WHERE family_id = ${family.id}
    `

    if (existing.length > 0) {
      // Update existing
      await sql`
        UPDATE express_registration_2027 
        SET 
          lodging_type = ${lodgingType},
          occupancy_type = ${occupancyType || null},
          member_preferences = ${JSON.stringify(memberPreferences || {})},
          estimated_total = ${estimatedTotal || 0},
          notes = ${notes || null},
          updated_at = datetime('now')
        WHERE family_id = ${family.id}
      `
    } else {
      // Insert new
      await sql`
        INSERT INTO express_registration_2027 
        (family_id, lodging_type, occupancy_type, member_preferences, estimated_total, notes)
        VALUES (
          ${family.id},
          ${lodgingType},
          ${occupancyType || null},
          ${JSON.stringify(memberPreferences || {})},
          ${estimatedTotal || 0},
          ${notes || null}
        )
      `
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error saving express registration preferences:", error)
    return NextResponse.json({ error: "Failed to save preferences" }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    if (!(await canAccessExpressRegistrationPreview())) {
      return NextResponse.json({ error: "Express registration preview is not available" }, { status: 403 })
    }

    const { family, error } = await getFamilyForRequest({ requirePrimary: true })
    if (error) return error

    await ensureExpressTable()
    await sql`
      DELETE FROM express_registration_2027 
      WHERE family_id = ${family.id}
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting express registration preferences:", error)
    return NextResponse.json({ error: "Failed to delete preferences" }, { status: 500 })
  }
}
