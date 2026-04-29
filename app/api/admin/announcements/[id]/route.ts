import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

// PATCH - Update announcement
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { is_active, show_on_live_updates, show_on_schedule } = body

    // Build update query based on what's provided
    if (is_active !== undefined) {
      await sql`
        UPDATE announcements 
        SET is_active = ${is_active}, updated_at = NOW()
        WHERE id = ${parseInt(id)}
      `
    }

    if (show_on_live_updates !== undefined) {
      await sql`
        UPDATE announcements 
        SET show_on_live_updates = ${show_on_live_updates}, updated_at = NOW()
        WHERE id = ${parseInt(id)}
      `
    }

    if (show_on_schedule !== undefined) {
      await sql`
        UPDATE announcements 
        SET show_on_schedule = ${show_on_schedule}, updated_at = NOW()
        WHERE id = ${parseInt(id)}
      `
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error updating announcement:", error)
    return NextResponse.json({ error: "Failed to update announcement" }, { status: 500 })
  }
}

// DELETE - Remove announcement
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    await sql`
      DELETE FROM announcements WHERE id = ${parseInt(id)}
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error deleting announcement:", error)
    return NextResponse.json({ error: "Failed to delete announcement" }, { status: 500 })
  }
}
