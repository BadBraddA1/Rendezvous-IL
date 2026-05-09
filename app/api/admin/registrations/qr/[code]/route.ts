import { type NextRequest, NextResponse } from "next/server"
import { checkAdminAuth } from "@/lib/admin-auth"
import { sql } from "@/lib/db"

export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const admin = await checkAdminAuth()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { code } = await params
    const cleaned = code.trim().toUpperCase()

    const [registration] = await sql`
      SELECT * FROM registrations 
      WHERE UPPER(checkin_qr_code) = ${cleaned}
      LIMIT 1
    `

    if (!registration) {
      return NextResponse.json({ error: "Registration not found for this QR code" }, { status: 404 })
    }

    const familyMembers = await sql`
      SELECT * FROM family_members 
      WHERE registration_id = ${registration.id}
      ORDER BY age DESC NULLS LAST, id ASC
    `

    const tshirtOrders = await sql`
      SELECT * FROM tshirt_orders 
      WHERE registration_id = ${registration.id}
      ORDER BY id ASC
    `

    return NextResponse.json({
      registration,
      family_members: familyMembers,
      tshirt_orders: tshirtOrders,
    })
  } catch (error) {
    console.error("[v0] Failed to lookup by QR code:", error)
    return NextResponse.json({ error: "Failed to lookup registration" }, { status: 500 })
  }
}
