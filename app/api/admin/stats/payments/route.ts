import { NextResponse } from "next/server"
import { checkAdminAuth } from "@/lib/admin-auth"
import { sql } from "@/lib/db"
import { parseRegistrationEventYear } from "@/lib/registration-event-years"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const admin = await checkAdminAuth()
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const eventYear = parseRegistrationEventYear(searchParams.get("year"))

    // 2027+ lives on registrations_v2; archive years still use legacy registrations.
    if (eventYear >= 2027) {
      const [row] = await sql`
        SELECT 
          COALESCE(SUM(total_cost), 0)::numeric as total_expected,
          COALESCE(SUM(deposit_paid), 0)::numeric as total_received,
          COUNT(CASE WHEN payment_status = 'paid' THEN 1 END)::int as full_payments_paid,
          COUNT(CASE WHEN deposit_paid > 0 AND payment_status IS DISTINCT FROM 'paid' THEN 1 END)::int as registration_fees_paid,
          COUNT(CASE WHEN COALESCE(deposit_paid, 0) = 0 AND payment_status IS DISTINCT FROM 'paid' THEN 1 END)::int as unpaid_count
        FROM registrations_v2
        WHERE event_year = ${eventYear}
      `

      return NextResponse.json({
        totalExpected: Number(row.total_expected) || 0,
        totalReceived: Number(row.total_received) || 0,
        fullPaymentsPaid: Number(row.full_payments_paid) || 0,
        registrationFeesPaid: Number(row.registration_fees_paid) || 0,
        unpaidCount: Number(row.unpaid_count) || 0,
        eventYear,
      })
    }

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
      WHERE COALESCE(event_year, 2026) = ${eventYear}
    `

    return NextResponse.json({
      totalExpected: Number(stats[0].total_expected) || 0,
      totalReceived: Number(stats[0].total_received) || 0,
      fullPaymentsPaid: Number(stats[0].full_payments_paid) || 0,
      registrationFeesPaid: Number(stats[0].registration_fees_paid) || 0,
      unpaidCount: Number(stats[0].unpaid_count) || 0,
      eventYear,
    })
  } catch (error) {
    console.error("[v0] Payment stats error:", error)
    return NextResponse.json({ error: "Failed to fetch payment stats" }, { status: 500 })
  }
}
