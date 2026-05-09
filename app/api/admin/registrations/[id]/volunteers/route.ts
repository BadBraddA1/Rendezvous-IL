import { type NextRequest, NextResponse } from "next/server"
import { checkAdminAuth } from "@/lib/admin-auth"
import { sql } from "@/lib/db"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await checkAdminAuth()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { id } = await params
    const volunteers = await sql`
      SELECT * FROM volunteer_signups 
      WHERE registration_id = ${id}
      ORDER BY id ASC
    `
    return NextResponse.json({ volunteers })
  } catch (error) {
    console.error("[v0] Failed to fetch volunteers:", error)
    return NextResponse.json({ volunteers: [] }, { status: 200 })
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await checkAdminAuth()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { id } = await params
    const { volunteer_name, volunteer_type, notes } = await req.json()

    const [row] = await sql`
      INSERT INTO volunteer_signups (registration_id, volunteer_name, volunteer_type, notes)
      VALUES (${id}, ${volunteer_name || ""}, ${volunteer_type || ""}, ${notes || null})
      RETURNING *
    `
    return NextResponse.json({ volunteer: row })
  } catch (error) {
    console.error("[v0] Failed to add volunteer:", error)
    return NextResponse.json({ error: "Failed to add volunteer" }, { status: 500 })
  }
}
