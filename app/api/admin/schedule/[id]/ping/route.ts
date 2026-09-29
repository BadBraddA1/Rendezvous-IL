import { type NextRequest, NextResponse } from "next/server"
import { checkAdminAuth, getAdminPermissions, logAuditAction } from "@/lib/admin-auth"
import { getRequestAuditMeta } from "@/lib/audit-log"
import { createEventPing, type EventPingMode } from "@/lib/schedule-event-ping"

export const dynamic = "force-dynamic"

type RouteContext = { params: Promise<{ id: string }> }

/** Custom ping tied to a schedule event — send now or schedule for event time. */
export async function POST(request: NextRequest, context: RouteContext) {
  const admin = await checkAdminAuth(request)
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!getAdminPermissions(admin.role).canEdit) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await context.params
  const scheduleEventId = Number(id)
  if (!Number.isInteger(scheduleEventId) || scheduleEventId <= 0) {
    return NextResponse.json({ error: "Invalid event id" }, { status: 400 })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const mode = (body.mode || "now") as EventPingMode
    if (!["now", "at_start", "minutes_before"].includes(mode)) {
      return NextResponse.json(
        { error: "mode must be now, at_start, or minutes_before" },
        { status: 400 },
      )
    }

    const result = await createEventPing({
      scheduleEventId,
      mode,
      minutesBefore: body.minutesBefore != null ? Number(body.minutesBefore) : undefined,
      title: body.title,
      message: body.message,
      showOnLiveUpdates: body.showOnLiveUpdates ?? true,
      showOnSchedule: body.showOnSchedule ?? false,
      createdBy: admin.email,
    })

    const { ipAddress, userAgent } = getRequestAuditMeta(request)
    await logAuditAction(
      admin.email,
      "event_ping",
      "schedule_event",
      scheduleEventId,
      {
        mode,
        minutes_before: body.minutesBefore ?? null,
        announcement_id: result.announcement.id,
        publish_at: result.announcement.publish_at,
      },
      ipAddress,
      userAgent,
    )

    return NextResponse.json({
      success: true,
      announcement: result.announcement,
      push: result.push ?? null,
    })
  } catch (error) {
    console.error("[admin/schedule/ping] error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create event ping" },
      { status: 500 },
    )
  }
}
