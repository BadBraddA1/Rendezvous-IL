import { type NextRequest, NextResponse } from "next/server"
import { checkAdminAuth } from "@/lib/admin-auth"
import { sql } from "@/lib/db"

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await checkAdminAuth()
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = params

    console.log("[v0] Fetching full registration for ID:", id)

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
      ORDER BY age DESC
    `

    console.log("[v0] Found family members:", familyMembers.length)

    // Fetch t-shirt orders
    const tshirtOrders = await sql`
      SELECT * FROM tshirt_orders 
      WHERE registration_id = ${id}
    `

    // Fetch health info
    const healthInfo = await sql`
      SELECT * FROM health_information 
      WHERE registration_id = ${id}
    `

    return NextResponse.json({
      registration,
      family_members: familyMembers,
      tshirt_orders: tshirtOrders,
      health_info: healthInfo,
    })
  } catch (error) {
    console.error("[v0] Failed to fetch full registration:", error)
    return NextResponse.json({ error: "Failed to fetch registration details" }, { status: 500 })
  }
}
