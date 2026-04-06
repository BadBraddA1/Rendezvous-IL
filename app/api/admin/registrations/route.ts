import { type NextRequest, NextResponse } from "next/server"
import { checkAdminAuth } from "@/lib/admin-auth"
import { sql } from "@/lib/db"

export async function GET(req: NextRequest) {
  const admin = await checkAdminAuth()
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const search = searchParams.get("search") || ""
    const lodging = searchParams.get("lodging")

    let query = sql`
      SELECT 
        r.*,
        COUNT(fm.id) as attendee_count,
        (r.lodging_total + r.tshirt_total + r.climbing_tower_total + r.registration_fee) as total_cost
      FROM registrations r
      LEFT JOIN family_members fm ON r.id = fm.registration_id
      WHERE 1=1
    `

    if (search) {
      query = sql`${query} AND (r.family_last_name ILIKE ${`%${search}%`} OR r.email ILIKE ${`%${search}%`})`
    }

    if (lodging && lodging !== "all") {
      query = sql`${query} AND r.lodging_type = ${lodging}`
    }

    query = sql`${query}
      GROUP BY r.id
      ORDER BY r.created_at DESC
    `

    const registrations = await query

    return NextResponse.json(registrations)
  } catch (error) {
    console.error("[v0] Registrations fetch error:", error)
    return NextResponse.json({ error: "Failed to fetch registrations" }, { status: 500 })
  }
}
