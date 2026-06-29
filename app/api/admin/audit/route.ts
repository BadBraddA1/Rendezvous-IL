import { NextResponse } from "next/server"
import { requireFullAdminApi } from "@/lib/clerk-auth"
import { sql } from "@/lib/db"

export async function GET() {
  try {
    await requireFullAdminApi()
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const logs = await sql`
      SELECT *
      FROM audit_logs
      ORDER BY created_at DESC
      LIMIT 100
    `

    return NextResponse.json({ logs })
  } catch (error) {
    console.error("[Audit] Failed to fetch audit logs:", error)
    return NextResponse.json({ error: "Failed to fetch audit logs" }, { status: 500 })
  }
}
