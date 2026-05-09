import { type NextRequest, NextResponse } from "next/server"
import { checkAdminAuth } from "@/lib/admin-auth"
import { sql } from "@/lib/db"

export async function GET(req: NextRequest) {
  const admin = await checkAdminAuth()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const url = new URL(req.url)
    const yearParam = url.searchParams.get("year")
    const year = yearParam ? Number.parseInt(yearParam, 10) : null

    const rows = year
      ? await sql`SELECT * FROM event_feedback WHERE event_year = ${year} ORDER BY created_at DESC`
      : await sql`SELECT * FROM event_feedback ORDER BY created_at DESC`

    return NextResponse.json(rows)
  } catch (error) {
    console.error("[v0] Failed to fetch feedback:", error)
    return NextResponse.json([], { status: 200 })
  }
}
