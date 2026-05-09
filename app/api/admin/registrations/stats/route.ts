import { NextResponse } from "next/server"
import { checkAdminAuth } from "@/lib/admin-auth"
import { sql } from "@/lib/db"

export async function GET() {
  const admin = await checkAdminAuth()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const [overview] = await sql`
      SELECT 
        COUNT(DISTINCT r.id)::int as total_registrations,
        COUNT(fm.id)::int as total_attendees,
        COUNT(DISTINCT CASE WHEN r.checked_in THEN r.id END)::int as checked_in_count,
        COALESCE(SUM(COALESCE(r.lodging_total,0) + COALESCE(r.tshirt_total,0) + COALESCE(r.climbing_tower_total,0) + COALESCE(r.registration_fee,0)), 0)::numeric as total_revenue,
        COUNT(DISTINCT CASE WHEN r.full_payment_paid THEN r.id END)::int as paid_in_full,
        COUNT(DISTINCT CASE WHEN r.registration_fee_paid AND NOT r.full_payment_paid THEN r.id END)::int as reg_fee_paid,
        COUNT(DISTINCT CASE WHEN NOT r.registration_fee_paid THEN r.id END)::int as unpaid
      FROM registrations r
      LEFT JOIN family_members fm ON fm.registration_id = r.id
    `

    const lodging = await sql`
      SELECT lodging_type, COUNT(*)::int as count
      FROM registrations
      WHERE lodging_type IS NOT NULL
      GROUP BY lodging_type
      ORDER BY count DESC
    `

    const tshirts = await sql`
      SELECT 
        COALESCE(SUM(quantity), 0)::int as total_quantity,
        COUNT(*)::int as order_count
      FROM tshirt_orders
    `

    const tshirtBySize = await sql`
      SELECT size, COALESCE(SUM(quantity), 0)::int as count
      FROM tshirt_orders
      WHERE size IS NOT NULL
      GROUP BY size
      ORDER BY size
    `

    const volunteers = await sql`
      SELECT COUNT(*)::int as total_volunteers
      FROM volunteer_signups
    `

    return NextResponse.json({
      ...overview,
      total_revenue: Number(overview.total_revenue),
      lodging_breakdown: lodging,
      tshirts: { ...tshirts[0] },
      tshirt_by_size: tshirtBySize,
      total_volunteers: volunteers[0].total_volunteers,
    })
  } catch (error) {
    console.error("[v0] Failed to fetch stats:", error)
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 })
  }
}
