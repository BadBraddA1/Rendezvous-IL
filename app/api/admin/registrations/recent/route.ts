import { NextResponse } from "next/server"
import { checkAdminAuth } from "@/lib/admin-auth"
import { sql } from "@/lib/db"

export async function GET() {
  const admin = await checkAdminAuth()
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const registrations = await sql`
      SELECT *
      FROM registrations
      ORDER BY created_at DESC
      LIMIT 5
    `

    return NextResponse.json(registrations)
  } catch (error) {
    console.error("[v0] Recent registrations error:", error)
    return NextResponse.json({ error: "Failed to fetch registrations" }, { status: 500 })
  }
}
