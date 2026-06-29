import { type NextRequest, NextResponse } from "next/server"
import { checkAdminAuth } from "@/lib/admin-auth"
import { getAdminPermissions } from "@/lib/clerk-auth"
import { sql } from "@/lib/db"
import { normalizeRegistrationRow } from "@/lib/normalize-string-array"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await checkAdminAuth()
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const permissions = getAdminPermissions(admin.role)
  if (!permissions.canViewRegistrations && !permissions.canCheckIn) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const { id } = await params

    // Fetch registration
    const [registration] = await sql`
      SELECT * FROM registrations WHERE id = ${id}
    `

    if (!registration) {
      return NextResponse.json({ error: "Registration not found" }, { status: 404 })
    }

    // Fetch family members
    const familyMembers = await sql`
      SELECT * FROM family_members 
      WHERE registration_id = ${id}
      ORDER BY age DESC NULLS LAST, id ASC
    `

    // Fetch t-shirt orders
    const tshirtOrders = await sql`
      SELECT * FROM tshirt_orders 
      WHERE registration_id = ${id}
      ORDER BY id ASC
    `

    // Fetch health info (correct table name is health_info)
    const healthInfo = await sql`
      SELECT * FROM health_info 
      WHERE registration_id = ${id}
      ORDER BY id ASC
    `

    // Fetch volunteer signups
    const volunteers = await sql`
      SELECT * FROM volunteer_signups 
      WHERE registration_id = ${id}
      ORDER BY id ASC
    `

    // Compute totals defensively
    const lodgingTotal = Number(registration.lodging_total ?? 0)
    const tshirtTotal = Number(registration.tshirt_total ?? 0)
    const climbingTotal = Number(registration.climbing_tower_total ?? 0)
    const regFee = Number(registration.registration_fee ?? 0)
    const scholarshipDonation = Number(registration.scholarship_donation ?? 0)
    const totalCost = lodgingTotal + tshirtTotal + climbingTotal + regFee + scholarshipDonation

    return NextResponse.json({
      registration: normalizeRegistrationRow({
        ...registration,
        total_cost: totalCost,
        attendee_count: familyMembers.length,
      }),
      family_members: familyMembers,
      tshirt_orders: tshirtOrders,
      health_info: healthInfo,
      volunteers,
    })
  } catch (error) {
    console.error("[v0] Failed to fetch full registration:", error)
    return NextResponse.json({ error: "Failed to fetch registration details" }, { status: 500 })
  }
}
