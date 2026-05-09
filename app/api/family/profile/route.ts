import { NextResponse } from "next/server"
import { currentUser } from "@clerk/nextjs/server"
import { sql } from "@/lib/db"

// GET - Fetch family profile for the current user
export async function GET() {
  try {
    const user = await currentUser()
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userEmail = user.emailAddresses[0]?.emailAddress

    // Find family by clerk_user_id or email match
    const families = await sql`
      SELECT f.*, 
        (SELECT json_agg(fm.*) FROM family_members_v2 fm WHERE fm.family_id = f.id) as members
      FROM families f
      WHERE f.clerk_user_id = ${user.id}
         OR f.email = ${userEmail}
      LIMIT 1
    `

    if (families.length === 0) {
      return NextResponse.json({ family: null })
    }

    // Also get any pending changes
    const pendingChanges = await sql`
      SELECT * FROM pending_family_changes
      WHERE family_id = ${families[0].id}
        AND status = 'pending'
      ORDER BY submitted_at DESC
    `

    return NextResponse.json({ 
      family: families[0],
      pendingChanges 
    })
  } catch (error) {
    console.error("Error fetching family profile:", error)
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 })
  }
}

// PUT - Submit profile changes for approval
export async function PUT(request: Request) {
  try {
    const user = await currentUser()
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userEmail = user.emailAddresses[0]?.emailAddress
    const updates = await request.json()

    // Find family
    const families = await sql`
      SELECT * FROM families
      WHERE clerk_user_id = ${user.id}
         OR email = ${userEmail}
      LIMIT 1
    `

    if (families.length === 0) {
      return NextResponse.json({ error: "Family not found" }, { status: 404 })
    }

    const family = families[0]
    const changes = []

    // Compare and create change records for each field
    const fieldsToCheck = [
      'family_last_name', 'email', 'husband_phone', 'wife_phone',
      'street', 'city', 'state', 'zip', 'home_congregation'
    ]

    for (const field of fieldsToCheck) {
      if (updates[field] !== undefined && updates[field] !== family[field]) {
        changes.push({
          family_id: family.id,
          clerk_user_id: user.id,
          change_type: 'update_field',
          field_name: field,
          old_value: family[field] || '',
          new_value: updates[field] || ''
        })
      }
    }

    // Insert all changes
    for (const change of changes) {
      await sql`
        INSERT INTO pending_family_changes 
          (family_id, clerk_user_id, change_type, field_name, old_value, new_value)
        VALUES 
          (${change.family_id}, ${change.clerk_user_id}, ${change.change_type}, 
           ${change.field_name}, ${change.old_value}, ${change.new_value})
      `
    }

    return NextResponse.json({ 
      success: true, 
      message: "Changes submitted for approval",
      changesCount: changes.length 
    })
  } catch (error) {
    console.error("Error submitting profile changes:", error)
    return NextResponse.json({ error: "Failed to submit changes" }, { status: 500 })
  }
}
