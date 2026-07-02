import { type NextRequest, NextResponse } from "next/server"
import { checkAdminAuth, getAdminPermissions, logAuditAction } from "@/lib/admin-auth"
import { getRequestAuditMeta } from "@/lib/audit-log"
import { listScheduleEvents, seedScheduleEvents } from "@/lib/event-schedule"
import { parseRegistrationEventYear } from "@/lib/registration-event-years"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  const admin = await checkAdminAuth()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!getAdminPermissions(admin.role).canEdit) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const body = await req.json().catch(() => ({}))
    const year = parseRegistrationEventYear(body.year)

    const inserted = await seedScheduleEvents(year)
    if (inserted > 0) {
      const { ipAddress, userAgent } = getRequestAuditMeta(req)
      await logAuditAction(
        admin.email,
        "seed_schedule_events",
        "schedule_event",
        undefined,
        { event_year: year, inserted },
        ipAddress,
        userAgent,
      )
    }

    return NextResponse.json({
      success: true,
      inserted,
      events: await listScheduleEvents(year),
    })
  } catch (error) {
    console.error("[admin/schedule/seed] POST error:", error)
    return NextResponse.json({ error: "Failed to seed schedule" }, { status: 500 })
  }
}
