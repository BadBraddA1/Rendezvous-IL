import { type NextRequest, NextResponse } from "next/server"
import { checkAdminAuth } from "@/lib/admin-auth"
import { sql } from "@/lib/db"

async function recalcTshirtTotal(regId: string | number) {
  const [row] = await sql`
    SELECT COALESCE(SUM(price * quantity), 0)::numeric as total
    FROM tshirt_orders
    WHERE registration_id = ${regId}
  `
  await sql`
    UPDATE registrations 
    SET tshirt_total = ${row.total}, updated_at = NOW()
    WHERE id = ${regId}
  `
  return Number(row.total)
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await checkAdminAuth()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { id } = await params
    const orders = await sql`
      SELECT * FROM tshirt_orders 
      WHERE registration_id = ${id} 
      ORDER BY id ASC
    `
    return NextResponse.json({ orders })
  } catch (error) {
    console.error("[v0] Failed to fetch t-shirt orders:", error)
    return NextResponse.json({ error: "Failed to fetch t-shirt orders" }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await checkAdminAuth()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { id } = await params
    const { size, color, quantity, price } = await req.json()

    const [row] = await sql`
      INSERT INTO tshirt_orders (registration_id, size, color, quantity, price)
      VALUES (${id}, ${size || ""}, ${color || ""}, ${quantity || 1}, ${price || 0})
      RETURNING *
    `

    const newTotal = await recalcTshirtTotal(id)
    return NextResponse.json({ order: row, tshirt_total: newTotal })
  } catch (error) {
    console.error("[v0] Failed to add t-shirt order:", error)
    return NextResponse.json({ error: "Failed to add t-shirt order" }, { status: 500 })
  }
}
