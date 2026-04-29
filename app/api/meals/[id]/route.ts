import { neon } from "@neondatabase/serverless"
import { NextResponse } from "next/server"

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sql = neon(process.env.DATABASE_URL!)
    const { id } = await params

    await sql`DELETE FROM meals WHERE id = ${parseInt(id)}`

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting meal:", error)
    return NextResponse.json({ error: "Failed to delete meal" }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sql = neon(process.env.DATABASE_URL!)
    const { id } = await params
    const body = await request.json()
    const { main_dish, side_dishes, dessert, beverages, notes } = body

    const result = await sql`
      UPDATE meals
      SET 
        main_dish = COALESCE(${main_dish}, main_dish),
        side_dishes = ${side_dishes},
        dessert = ${dessert},
        beverages = ${beverages},
        notes = ${notes},
        updated_at = NOW()
      WHERE id = ${parseInt(id)}
      RETURNING *
    `

    return NextResponse.json({ meal: result[0] })
  } catch (error) {
    console.error("Error updating meal:", error)
    return NextResponse.json({ error: "Failed to update meal" }, { status: 500 })
  }
}
