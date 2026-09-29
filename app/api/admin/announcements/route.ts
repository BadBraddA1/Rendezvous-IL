import { NextResponse } from "next/server"
import { checkAdminAuth, getAdminPermissions, logAuditAction } from "@/lib/admin-auth"
import { getRequestAuditMeta } from "@/lib/audit-log"
import { createAnnouncement, listAdminAnnouncements } from "@/lib/announcements"

export const dynamic = "force-dynamic"

async function requireCommunicator(request: Request) {
  const admin = await checkAdminAuth(request)
  if (!admin) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  if (!getAdminPermissions(admin.role).canEdit) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) }
  }
  return { admin }
}

export async function GET(request: Request) {
  const admin = await checkAdminAuth(request)
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const announcements = await listAdminAnnouncements(50)
    return NextResponse.json({ announcements })
  } catch (error) {
    console.error("[admin/announcements] GET error:", error)
    return NextResponse.json({ error: "Failed to fetch announcements" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const { admin, error } = await requireCommunicator(request)
  if (error) return error

  try {
    const body = await request.json()
    const {
      title,
      message,
      priority,
      showOnLiveUpdates,
      showOnSchedule,
      sendPush,
      publishAt,
      scheduleEventId,
      expiresAt,
    } = body

    if (!title || !message) {
      return NextResponse.json({ error: "Title and message are required" }, { status: 400 })
    }

    const result = await createAnnouncement({
      title,
      message,
      priority,
      showOnLiveUpdates,
      showOnSchedule,
      sendPush,
      publishAt: publishAt || null,
      scheduleEventId: scheduleEventId ? Number(scheduleEventId) : null,
      expiresAt: expiresAt || null,
      createdBy: admin.email,
    })

    const { ipAddress, userAgent } = getRequestAuditMeta(request)
    await logAuditAction(
      admin.email,
      "create_announcement",
      "announcement",
      result.announcement.id,
      {
        send_push: Boolean(sendPush),
        publish_at: publishAt || null,
        schedule_event_id: scheduleEventId || null,
      },
      ipAddress,
      userAgent,
    )

    const scheduled = Boolean(publishAt) && new Date(publishAt).getTime() > Date.now()
    return NextResponse.json({
      success: true,
      announcement: result.announcement,
      push: result.push ?? null,
      message: scheduled
        ? "Announcement scheduled"
        : result.push?.success
          ? `Announcement posted · push sent to ${result.push.recipients ?? 0}`
          : "Announcement created successfully",
    })
  } catch (err) {
    console.error("[admin/announcements] POST error:", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create announcement" },
      { status: 500 },
    )
  }
}
