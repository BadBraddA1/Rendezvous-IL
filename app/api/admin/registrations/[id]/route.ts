import { type NextRequest, NextResponse } from "next/server"
import { checkAdminAuth } from "@/lib/admin-auth"
import { sql } from "@/lib/db"

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await checkAdminAuth()
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const updates = await req.json()
    const { id } = params

    console.log("[v0] Updating registration:", id, updates)

    if (updates.family_members && Array.isArray(updates.family_members)) {
      // Delete existing family members
      await sql`DELETE FROM family_members WHERE registration_id = ${id}`

      // Insert updated family members
      for (const member of updates.family_members) {
        await sql`
          INSERT INTO family_members (
            registration_id, first_name, date_of_birth, age, is_baptized, person_cost
          ) VALUES (
            ${id}, 
            ${member.first_name}, 
            ${member.date_of_birth}, 
            ${member.age}, 
            ${member.is_baptized}, 
            ${member.person_cost || 0}
          )
        `
      }

      // Update attendee count
      await sql`
        UPDATE registrations 
        SET attendee_count = ${updates.family_members.length}
        WHERE id = ${id}
      `
    }

    const allowedFields = [
      "family_last_name",
      "email",
      "husband_phone",
      "wife_phone",
      "address",
      "city",
      "state",
      "zip",
      "home_congregation",
      "registration_fee_paid",
      "full_payment_paid",
      "payment_notes",
    ]

    const registrationUpdates: Record<string, any> = {}
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        registrationUpdates[field] = updates[field]
      }
    }

    if (Object.keys(registrationUpdates).length > 0) {
      const setClauses = Object.keys(registrationUpdates).map((key) => `${key} = $${key}`)

      const query = `UPDATE registrations SET ${setClauses.join(", ")} WHERE id = $id`
      await sql(query, { ...registrationUpdates, id })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Registration update error:", error)
    return NextResponse.json({ error: "Failed to update registration" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await checkAdminAuth()
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = params

    console.log("[v0] Deleting registration:", id)

    // Delete all related records (cascade delete)
    await sql`DELETE FROM family_members WHERE registration_id = ${id}`
    await sql`DELETE FROM health_information WHERE registration_id = ${id}`
    await sql`DELETE FROM tshirt_orders WHERE registration_id = ${id}`
    await sql`DELETE FROM volunteer_signups WHERE registration_id = ${id}`

    // Finally delete the registration
    await sql`DELETE FROM registrations WHERE id = ${id}`

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Registration delete error:", error)
    return NextResponse.json({ error: "Failed to delete registration" }, { status: 500 })
  }
}
