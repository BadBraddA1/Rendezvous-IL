import { type NextRequest, NextResponse } from "next/server"
import { checkAdminAuth } from "@/lib/admin-auth"
import { sql } from "@/lib/db"

async function recalcLodgingTotal(regId: string | number) {
  const [row] = await sql`
    SELECT COALESCE(SUM(person_cost), 0)::numeric as total
    FROM family_members
    WHERE registration_id = ${regId}
  `
  await sql`
    UPDATE registrations 
    SET lodging_total = ${row.total}, updated_at = NOW()
    WHERE id = ${regId}
  `
  return Number(row.total)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  const admin = await checkAdminAuth()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { id, memberId } = await params
    const updates = await req.json()

    // Whitelist of editable fields
    if (updates.first_name !== undefined)
      await sql`UPDATE family_members SET first_name = ${updates.first_name} WHERE id = ${memberId} AND registration_id = ${id}`
    if (updates.last_name !== undefined)
      await sql`UPDATE family_members SET last_name = ${updates.last_name} WHERE id = ${memberId} AND registration_id = ${id}`
    if (updates.date_of_birth !== undefined)
      await sql`UPDATE family_members SET date_of_birth = ${updates.date_of_birth || null} WHERE id = ${memberId} AND registration_id = ${id}`
    if (updates.age !== undefined)
      await sql`UPDATE family_members SET age = ${updates.age} WHERE id = ${memberId} AND registration_id = ${id}`
    if (updates.is_baptized !== undefined)
      await sql`UPDATE family_members SET is_baptized = ${updates.is_baptized} WHERE id = ${memberId} AND registration_id = ${id}`
    if (updates.person_cost !== undefined)
      await sql`UPDATE family_members SET person_cost = ${updates.person_cost} WHERE id = ${memberId} AND registration_id = ${id}`
    if (updates.rate_key !== undefined)
      await sql`UPDATE family_members SET rate_key = ${updates.rate_key} WHERE id = ${memberId} AND registration_id = ${id}`
    if (updates.is_adult_override !== undefined)
      await sql`UPDATE family_members SET is_adult_override = ${updates.is_adult_override} WHERE id = ${memberId} AND registration_id = ${id}`

    // Meal selections
    const meals = [
      "monday_dinner", "tuesday_breakfast", "tuesday_lunch", "tuesday_dinner",
      "wednesday_breakfast", "wednesday_lunch", "wednesday_dinner",
      "thursday_breakfast", "thursday_lunch", "thursday_dinner",
      "friday_breakfast", "friday_lunch",
    ]
    for (const meal of meals) {
      if (updates[meal] !== undefined) {
        // Use a switch on known column names so SQL is parameter-safe
        switch (meal) {
          case "monday_dinner":
            await sql`UPDATE family_members SET monday_dinner = ${updates[meal]} WHERE id = ${memberId} AND registration_id = ${id}`; break
          case "tuesday_breakfast":
            await sql`UPDATE family_members SET tuesday_breakfast = ${updates[meal]} WHERE id = ${memberId} AND registration_id = ${id}`; break
          case "tuesday_lunch":
            await sql`UPDATE family_members SET tuesday_lunch = ${updates[meal]} WHERE id = ${memberId} AND registration_id = ${id}`; break
          case "tuesday_dinner":
            await sql`UPDATE family_members SET tuesday_dinner = ${updates[meal]} WHERE id = ${memberId} AND registration_id = ${id}`; break
          case "wednesday_breakfast":
            await sql`UPDATE family_members SET wednesday_breakfast = ${updates[meal]} WHERE id = ${memberId} AND registration_id = ${id}`; break
          case "wednesday_lunch":
            await sql`UPDATE family_members SET wednesday_lunch = ${updates[meal]} WHERE id = ${memberId} AND registration_id = ${id}`; break
          case "wednesday_dinner":
            await sql`UPDATE family_members SET wednesday_dinner = ${updates[meal]} WHERE id = ${memberId} AND registration_id = ${id}`; break
          case "thursday_breakfast":
            await sql`UPDATE family_members SET thursday_breakfast = ${updates[meal]} WHERE id = ${memberId} AND registration_id = ${id}`; break
          case "thursday_lunch":
            await sql`UPDATE family_members SET thursday_lunch = ${updates[meal]} WHERE id = ${memberId} AND registration_id = ${id}`; break
          case "thursday_dinner":
            await sql`UPDATE family_members SET thursday_dinner = ${updates[meal]} WHERE id = ${memberId} AND registration_id = ${id}`; break
          case "friday_breakfast":
            await sql`UPDATE family_members SET friday_breakfast = ${updates[meal]} WHERE id = ${memberId} AND registration_id = ${id}`; break
          case "friday_lunch":
            await sql`UPDATE family_members SET friday_lunch = ${updates[meal]} WHERE id = ${memberId} AND registration_id = ${id}`; break
        }
      }
    }

    const newLodgingTotal = await recalcLodgingTotal(id)
    const [member] = await sql`SELECT * FROM family_members WHERE id = ${memberId}`

    return NextResponse.json({ member, lodging_total: newLodgingTotal })
  } catch (error) {
    console.error("[v0] Failed to update family member:", error)
    return NextResponse.json({ error: "Failed to update family member" }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  const admin = await checkAdminAuth()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { id, memberId } = await params
    await sql`DELETE FROM family_members WHERE id = ${memberId} AND registration_id = ${id}`
    const newLodgingTotal = await recalcLodgingTotal(id)
    return NextResponse.json({ success: true, lodging_total: newLodgingTotal })
  } catch (error) {
    console.error("[v0] Failed to delete family member:", error)
    return NextResponse.json({ error: "Failed to delete family member" }, { status: 500 })
  }
}
