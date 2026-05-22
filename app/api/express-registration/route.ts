import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getCurrentFamily } from "@/lib/family-auth"

export async function GET() {
  try {
    const family = await getCurrentFamily()
    
    if (!family) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

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
    const family = await getCurrentFamily()
    
    if (!family) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

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
          updated_at = NOW()
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
    const family = await getCurrentFamily()
    
    if (!family) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

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
