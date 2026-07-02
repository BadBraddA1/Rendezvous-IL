import { type NextRequest, NextResponse } from "next/server"
import { checkAdminAuth, getAdminPermissions, logAuditAction } from "@/lib/admin-auth"
import { getRequestAuditMeta } from "@/lib/audit-log"
import { awardTopic, sendBidInvite, unawardTopic } from "@/lib/lesson-bids"

export const dynamic = "force-dynamic"

/** Lesson bid actions for one "Presenting a lesson" volunteer. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await checkAdminAuth()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!getAdminPermissions(admin.role).canEdit) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const { id } = await params
    const volunteerId = Number(id)
    const body = await req.json().catch(() => ({}))
    const action = body.action as "invite" | "award" | "unaward"
    const { ipAddress, userAgent } = getRequestAuditMeta(req)

    if (action === "invite") {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL?.startsWith("http")
        ? process.env.NEXT_PUBLIC_BASE_URL
        : req.nextUrl.origin
      const result = await sendBidInvite(volunteerId, baseUrl)
      if (!result.ok) {
        return NextResponse.json({ error: result.reason }, { status: 400 })
      }
      await logAuditAction(
        admin.email,
        "send_lesson_bid_invite",
        "volunteer_signup",
        volunteerId,
        { email: result.email },
        ipAddress,
        userAgent,
      )
      return NextResponse.json({ success: true, email: result.email })
    }

    if (action === "award") {
      const topicId = Number(body.topicId)
      if (!topicId) return NextResponse.json({ error: "topicId is required" }, { status: 400 })
      const result = await awardTopic(volunteerId, topicId)
      if (!result.ok) {
        return NextResponse.json({ error: result.reason }, { status: 409 })
      }
      await logAuditAction(
        admin.email,
        "award_lesson_topic",
        "volunteer_signup",
        volunteerId,
        { topic_id: topicId },
        ipAddress,
        userAgent,
      )
      return NextResponse.json({ success: true })
    }

    if (action === "unaward") {
      await unawardTopic(volunteerId)
      await logAuditAction(
        admin.email,
        "unaward_lesson_topic",
        "volunteer_signup",
        volunteerId,
        undefined,
        ipAddress,
        userAgent,
      )
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("[admin/lesson-bid] POST error:", error)
    return NextResponse.json({ error: "Failed to update lesson bid" }, { status: 500 })
  }
}
