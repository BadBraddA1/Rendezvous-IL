import { type NextRequest, NextResponse } from "next/server"
import { checkAdminAuth } from "@/lib/admin-auth"
import { sql } from "@/lib/db"
import { formatPhoneForStorage } from "@/lib/phone-format"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await checkAdminAuth()
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const updates = await req.json()
    const { id } = await params



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

    // Update individual fields if provided
    if (updates.family_last_name !== undefined) {
      await sql`UPDATE registrations SET family_last_name = ${updates.family_last_name} WHERE id = ${id}`
    }
    if (updates.email !== undefined) {
      await sql`UPDATE registrations SET email = ${updates.email} WHERE id = ${id}`
    }
    if (updates.husband_phone !== undefined) {
      await sql`UPDATE registrations SET husband_phone = ${formatPhoneForStorage(updates.husband_phone)} WHERE id = ${id}`
    }
    if (updates.wife_phone !== undefined) {
      await sql`UPDATE registrations SET wife_phone = ${formatPhoneForStorage(updates.wife_phone)} WHERE id = ${id}`
    }
    if (updates.emergency_contact_phone !== undefined) {
      await sql`UPDATE registrations SET emergency_contact_phone = ${formatPhoneForStorage(updates.emergency_contact_phone)} WHERE id = ${id}`
    }
    if (updates.address !== undefined) {
      await sql`UPDATE registrations SET address = ${updates.address} WHERE id = ${id}`
    }
    if (updates.city !== undefined) {
      await sql`UPDATE registrations SET city = ${updates.city} WHERE id = ${id}`
    }
    if (updates.state !== undefined) {
      await sql`UPDATE registrations SET state = ${updates.state} WHERE id = ${id}`
    }
    if (updates.zip !== undefined) {
      await sql`UPDATE registrations SET zip = ${updates.zip} WHERE id = ${id}`
    }
    if (updates.home_congregation !== undefined) {
      await sql`UPDATE registrations SET home_congregation = ${updates.home_congregation} WHERE id = ${id}`
    }
    if (updates.registration_fee_paid !== undefined) {
      await sql`UPDATE registrations SET registration_fee_paid = ${updates.registration_fee_paid} WHERE id = ${id}`
    }
    if (updates.full_payment_paid !== undefined) {
      await sql`UPDATE registrations SET full_payment_paid = ${updates.full_payment_paid} WHERE id = ${id}`
    }
    if (updates.payment_notes !== undefined) {
      await sql`UPDATE registrations SET payment_notes = ${updates.payment_notes} WHERE id = ${id}`
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Registration update error:", error)
    return NextResponse.json({ error: "Failed to update registration" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await checkAdminAuth()
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = await params



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
