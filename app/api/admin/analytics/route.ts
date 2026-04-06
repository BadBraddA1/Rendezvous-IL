import { NextResponse } from "next/server"
import { checkAdminAuth } from "@/lib/admin-auth"
import { sql } from "@/lib/db"

export async function GET() {
  const admin = await checkAdminAuth()
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const registrationsByDate = await sql`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count
      FROM registrations
      GROUP BY DATE(created_at)
      ORDER BY date DESC
      LIMIT 30
    `

    const lodgingDistribution = await sql`
      SELECT 
        lodging_type as name,
        COUNT(*) as value
      FROM registrations
      GROUP BY lodging_type
    `

    return NextResponse.json({
      registrationsByDate: registrationsByDate.map((r) => ({
        date: new Date(r.date).toLocaleDateString(),
        count: Number(r.count),
      })),
      lodgingDistribution: lodgingDistribution.map((l) => ({
        name: l.name,
        value: Number(l.value),
      })),
    })
  } catch (error) {
    console.error("[v0] Analytics error:", error)
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 })
  }
}
