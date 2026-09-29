import { NextResponse } from "next/server"
import { checkAdminAuth, getAdminPermissions } from "@/lib/admin-auth"
import { sendBroadcastPush } from "@/lib/broadcast-push"

/**
 * Legacy broadcast endpoint. Prefer POST /api/admin/push (auth required).
 * Still accepts cookie/Bearer admin sessions for older messaging UI callers.
 */
export async function POST(request: Request) {
  try {
    const admin = await checkAdminAuth(request)
    if (!admin || !getAdminPermissions(admin.role).canEdit) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { title, message, url } = await request.json()
    if (!title || !message) {
      return NextResponse.json({ error: "Title and message are required" }, { status: 400 })
    }

    const result = await sendBroadcastPush({
      title: String(title),
      message: String(message),
      url: url ? String(url) : undefined,
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error || "Failed to send notification" }, { status: 500 })
    }

    // Preserve legacy shape used by messaging-form.
    return NextResponse.json({
      success: true,
      channel: result.channel,
      recipients: result.recipients ?? 0,
      apns: result.apns,
      fcm: result.fcm,
    })
  } catch (error) {
    console.error("[push-notification] error:", error)
    return NextResponse.json({ error: "Failed to send notification" }, { status: 500 })
  }
}
