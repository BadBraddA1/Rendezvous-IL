import { type NextRequest, NextResponse } from "next/server"
import { checkAdminAuth, getAdminPermissions, logAuditAction } from "@/lib/admin-auth"
import { getRequestAuditMeta } from "@/lib/audit-log"
import {
  createScheduleEvent,
  listScheduleEvents,
  parseScheduleEventBody,
} from "@/lib/event-schedule"
import { parseRegistrationEventYear } from "@/lib/registration-event-years"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const admin = await checkAdminAuth()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const year = parseRegistrationEventYear(req.nextUrl.searchParams.get("year"))
    return NextResponse.json({ events: await listScheduleEvents(year) })
  } catch (error) {
    console.error("[admin/schedule] GET error:", error)
    return NextResponse.json({ error: "Failed to load schedule" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const admin = await checkAdminAuth()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!getAdminPermissions(admin.role).canEdit) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const body = await req.json().catch(() => ({}))
    const input = parseScheduleEventBody(body)
    if (!input) {
      return NextResponse.json({ error: "Day, time, and title are required" }, { status: 400 })
    }
    const year = parseRegistrationEventYear(body.year)

    await createScheduleEvent(input, year)

    const { ipAddress, userAgent } = getRequestAuditMeta(req)
    await logAuditAction(
      admin.email,
      "create_schedule_event",
      "schedule_event",
      undefined,
      { day: input.day, time: input.time, title: input.title, event_year: year },
      ipAddress,
      userAgent,
    )
    return NextResponse.json({ success: true, events: await listScheduleEvents(year) })
  } catch (error) {
    console.error("[admin/schedule] POST error:", error)
    return NextResponse.json({ error: "Failed to create schedule event" }, { status: 500 })
  }
}
