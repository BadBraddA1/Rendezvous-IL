import { type NextRequest, NextResponse } from "next/server"
import { checkAdminAuth, getAdminPermissions, logAuditAction } from "@/lib/admin-auth"
import { getRequestAuditMeta } from "@/lib/audit-log"
import {
  deleteScheduleEvent,
  listScheduleEvents,
  parseScheduleEventBody,
  updateScheduleEvent,
} from "@/lib/event-schedule"
import { parseRegistrationEventYear } from "@/lib/registration-event-years"
import { revalidatePublicSchedule } from "@/lib/schedule-revalidate"

export const dynamic = "force-dynamic"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await checkAdminAuth()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!getAdminPermissions(admin.role).canEdit) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const { id: idParam } = await params
    const id = Number(idParam)
    if (!Number.isInteger(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 })
    }

    const body = await req.json().catch(() => ({}))
    const input = parseScheduleEventBody(body)
    if (!input) {
      return NextResponse.json({ error: "Day, time, and title are required" }, { status: 400 })
    }
    const year = parseRegistrationEventYear(body.year)

    await updateScheduleEvent(id, input)

    const { ipAddress, userAgent } = getRequestAuditMeta(req)
    await logAuditAction(
      admin.email,
      "update_schedule_event",
      "schedule_event",
      id,
      { day: input.day, time: input.time, title: input.title, event_year: year },
      ipAddress,
      userAgent,
    )
    revalidatePublicSchedule()
    return NextResponse.json({ success: true, events: await listScheduleEvents(year) })
  } catch (error) {
    console.error("[admin/schedule/:id] PATCH error:", error)
    return NextResponse.json({ error: "Failed to update schedule event" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await checkAdminAuth()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!getAdminPermissions(admin.role).canEdit) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const { id: idParam } = await params
    const id = Number(idParam)
    if (!Number.isInteger(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 })
    }
    const year = parseRegistrationEventYear(req.nextUrl.searchParams.get("year"))

    await deleteScheduleEvent(id)

    const { ipAddress, userAgent } = getRequestAuditMeta(req)
    await logAuditAction(
      admin.email,
      "delete_schedule_event",
      "schedule_event",
      id,
      { event_year: year },
      ipAddress,
      userAgent,
    )
    revalidatePublicSchedule()
    return NextResponse.json({ success: true, events: await listScheduleEvents(year) })
  } catch (error) {
    console.error("[admin/schedule/:id] DELETE error:", error)
    return NextResponse.json({ error: "Failed to delete schedule event" }, { status: 500 })
  }
}
