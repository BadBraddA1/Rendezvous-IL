import { type NextRequest, NextResponse } from "next/server"
import { checkAdminAuth } from "@/lib/admin-auth"
import { sql } from "@/lib/db"

// Recompute lodging_total from family_members and write back to registration
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

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await checkAdminAuth()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { id } = await params
    const body = await req.json()
    const {
      first_name,
      last_name,
      date_of_birth,
      age,
      is_baptized,
      person_cost,
      rate_key,
      is_adult_override,
    } = body

    const [row] = await sql`
      INSERT INTO family_members (
        registration_id, first_name, last_name, date_of_birth, age,
        is_baptized, person_cost, rate_key, is_adult_override
      ) VALUES (
        ${id}, ${first_name || ""}, ${last_name || ""}, ${date_of_birth || null},
        ${age || 0}, ${is_baptized ?? false}, ${person_cost || 0},
        ${rate_key || null}, ${is_adult_override ?? false}
      )
      RETURNING *
    `

    const newLodgingTotal = await recalcLodgingTotal(id)

    return NextResponse.json({ member: row, lodging_total: newLodgingTotal })
  } catch (error) {
    console.error("[v0] Failed to add family member:", error)
    return NextResponse.json({ error: "Failed to add family member" }, { status: 500 })
  }
}
