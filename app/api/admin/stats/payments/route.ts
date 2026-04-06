import { NextResponse } from "next/server"
import { checkAdminAuth } from "@/lib/admin-auth"
import { sql } from "@/lib/db"

export async function GET() {
  const admin = await checkAdminAuth()
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const stats = await sql`
      SELECT 
        SUM(
          COALESCE(lodging_total, 0) + 
          COALESCE(tshirt_total, 0) + 
          COALESCE(climbing_tower_total, 0) + 
          COALESCE(registration_fee, 0)
        ) as total_expected,
        SUM(
          CASE 
            WHEN full_payment_paid THEN 
              COALESCE(lodging_total, 0) + 
              COALESCE(tshirt_total, 0) + 
              COALESCE(climbing_tower_total, 0) + 
              COALESCE(registration_fee, 0)
            WHEN registration_fee_paid THEN 
              COALESCE(registration_fee, 0)
            ELSE 0 
          END
        ) as total_received,
        COUNT(CASE WHEN full_payment_paid THEN 1 END) as full_payments_paid,
        COUNT(CASE WHEN registration_fee_paid AND NOT full_payment_paid THEN 1 END) as registration_fees_paid,
        COUNT(CASE WHEN NOT registration_fee_paid AND NOT full_payment_paid THEN 1 END) as unpaid_count
      FROM registrations
    `

    return NextResponse.json({
      totalExpected: Number.parseFloat(stats[0].total_expected) || 0,
      totalReceived: Number.parseFloat(stats[0].total_received) || 0,
      fullPaymentsPaid: Number.parseInt(stats[0].full_payments_paid) || 0,
      registrationFeesPaid: Number.parseInt(stats[0].registration_fees_paid) || 0,
      unpaidCount: Number.parseInt(stats[0].unpaid_count) || 0,
    })
  } catch (error) {
    console.error("[v0] Payment stats error:", error)
    return NextResponse.json({ error: "Failed to fetch payment stats" }, { status: 500 })
  }
}
