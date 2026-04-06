import { NextResponse } from "next/server"
import { checkAdminAuth } from "@/lib/admin-auth"
import { sql } from "@/lib/db"

export async function GET() {
  const admin = await checkAdminAuth()
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const [stats] = await sql`
      SELECT 
        COUNT(DISTINCT r.id) as total_registrations,
        COUNT(fm.id) as total_attendees,
        COALESCE(SUM(r.lodging_total + r.tshirt_total + r.climbing_tower_total + r.registration_fee), 0) as total_revenue
      FROM registrations r
      LEFT JOIN family_members fm ON r.id = fm.registration_id
    `

    const lodging = await sql`
      SELECT 
        lodging_type,
        COUNT(*) as count
      FROM registrations
      GROUP BY lodging_type
    `

    const lodgingBreakdown = {
      motel: lodging.find((l) => l.lodging_type === "motel")?.count || 0,
      rv: lodging.find((l) => l.lodging_type === "rv")?.count || 0,
      tent: lodging.find((l) => l.lodging_type === "tent")?.count || 0,
    }

    return NextResponse.json({
      totalRegistrations: Number(stats.total_registrations),
      totalAttendees: Number(stats.total_attendees),
      totalRevenue: Number(stats.total_revenue),
      lodgingBreakdown,
    })
  } catch (error) {
    console.error("[v0] Stats error:", error)
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 })
  }
}
