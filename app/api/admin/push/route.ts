import { NextResponse } from "next/server"
import { checkAdminAuth, getAdminPermissions, logAuditAction } from "@/lib/admin-auth"
import { getRequestAuditMeta } from "@/lib/audit-log"
import { sendBroadcastPush } from "@/lib/broadcast-push"

export const dynamic = "force-dynamic"

/** Immediate custom organizer push (admin/editor only). */
export async function POST(request: Request) {
  const admin = await checkAdminAuth(request)
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!getAdminPermissions(admin.role).canEdit) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const body = await request.json()
    const title = String(body.title || "").trim()
    const message = String(body.message || "").trim()
    const url = body.url ? String(body.url) : undefined

    if (!title || !message) {
      return NextResponse.json({ error: "Title and message are required" }, { status: 400 })
    }

    const result = await sendBroadcastPush({ title, message, url })
    if (!result.success) {
      return NextResponse.json({ error: result.error || "Push failed" }, { status: 500 })
    }

    const { ipAddress, userAgent } = getRequestAuditMeta(request)
    await logAuditAction(
      admin.email,
      "send_custom_push",
      "push",
      undefined,
      { title, recipients: result.recipients ?? 0, channel: result.channel },
      ipAddress,
      userAgent,
    )

    return NextResponse.json(result)
  } catch (error) {
    console.error("[admin/push] error:", error)
    return NextResponse.json({ error: "Failed to send notification" }, { status: 500 })
  }
}
