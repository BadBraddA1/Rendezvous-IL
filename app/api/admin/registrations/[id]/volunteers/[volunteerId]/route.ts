import { type NextRequest, NextResponse } from "next/server"
import { checkAdminAuth } from "@/lib/admin-auth"
import { sql } from "@/lib/db"

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; volunteerId: string }> }
) {
  const admin = await checkAdminAuth()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { id, volunteerId } = await params
    await sql`DELETE FROM volunteer_signups WHERE id = ${volunteerId} AND registration_id = ${id}`
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Failed to delete volunteer:", error)
    return NextResponse.json({ error: "Failed to delete volunteer" }, { status: 500 })
  }
}
