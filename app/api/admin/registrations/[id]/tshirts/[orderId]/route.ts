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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; orderId: string }> }
) {
  const admin = await checkAdminAuth()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { id, orderId } = await params
    const updates = await req.json()

    if (updates.size !== undefined)
      await sql`UPDATE tshirt_orders SET size = ${updates.size} WHERE id = ${orderId} AND registration_id = ${id}`
    if (updates.color !== undefined)
      await sql`UPDATE tshirt_orders SET color = ${updates.color} WHERE id = ${orderId} AND registration_id = ${id}`
    if (updates.quantity !== undefined)
      await sql`UPDATE tshirt_orders SET quantity = ${updates.quantity} WHERE id = ${orderId} AND registration_id = ${id}`
    if (updates.price !== undefined)
      await sql`UPDATE tshirt_orders SET price = ${updates.price} WHERE id = ${orderId} AND registration_id = ${id}`

    const newTotal = await recalcTshirtTotal(id)
    const [order] = await sql`SELECT * FROM tshirt_orders WHERE id = ${orderId}`
    return NextResponse.json({ order, tshirt_total: newTotal })
  } catch (error) {
    console.error("[v0] Failed to update t-shirt order:", error)
    return NextResponse.json({ error: "Failed to update t-shirt order" }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; orderId: string }> }
) {
  const admin = await checkAdminAuth()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { id, orderId } = await params
    await sql`DELETE FROM tshirt_orders WHERE id = ${orderId} AND registration_id = ${id}`
    const newTotal = await recalcTshirtTotal(id)
    return NextResponse.json({ success: true, tshirt_total: newTotal })
  } catch (error) {
    console.error("[v0] Failed to delete t-shirt order:", error)
    return NextResponse.json({ error: "Failed to delete t-shirt order" }, { status: 500 })
  }
}
