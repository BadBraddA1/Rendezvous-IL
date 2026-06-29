import { NextResponse } from "next/server"
import { requireFullAdminApi } from "@/lib/clerk-auth"
import { listAuditLogs } from "@/lib/audit-logs"

export async function GET(req: Request) {
  try {
    await requireFullAdminApi()
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const action = searchParams.get("action")?.trim() || undefined
    const fromRaw = searchParams.get("from")
    const toRaw = searchParams.get("to")
    const limit = Number(searchParams.get("limit") ?? 200)

    const logs = await listAuditLogs({
      action,
      from: fromRaw ? new Date(fromRaw) : undefined,
      to: toRaw ? new Date(toRaw) : undefined,
      limit: Number.isFinite(limit) ? limit : 200,
    })

    return NextResponse.json({ logs })
  } catch (error) {
    console.error("[Audit] Failed to fetch audit logs:", error)
    return NextResponse.json({ error: "Failed to fetch audit logs" }, { status: 500 })
  }
}
