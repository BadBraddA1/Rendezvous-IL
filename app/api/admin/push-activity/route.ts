import { NextResponse } from "next/server"
import { checkAdminAuth } from "@/lib/admin-auth"
import { listPushActivity, type PushActivityKind } from "@/lib/push-activity"

export const dynamic = "force-dynamic"

/** Admin push activity feed (last ~24h). */
export async function GET(request: Request) {
  const admin = await checkAdminAuth(request)
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const url = new URL(request.url)
  const kind = (url.searchParams.get("kind") || "all") as PushActivityKind | "all"
  const source = url.searchParams.get("source") || "all"
  const status = url.searchParams.get("status") || "all"
  const limit = Number(url.searchParams.get("limit") || "100")

  try {
    const events = await listPushActivity({ kind, source, status, limit })
    return NextResponse.json({ events, retentionHours: 24 })
  } catch (error) {
    console.error("[admin/push-activity] error:", error)
    return NextResponse.json({ error: "Failed to load push activity" }, { status: 500 })
  }
}
