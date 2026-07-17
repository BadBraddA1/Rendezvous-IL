import { type NextRequest, NextResponse } from "next/server"
import { checkAdminAuth, getAdminPermissions, logAuditAction } from "@/lib/admin-auth"
import { getRequestAuditMeta } from "@/lib/audit-log"
import {
  ensureRegistrationKeyDates,
  listScheduleEvents,
  seedReminderTestEvents,
} from "@/lib/event-schedule"
import { parseRegistrationEventYear } from "@/lib/registration-event-years"
import { revalidatePublicSchedule } from "@/lib/schedule-revalidate"

export const dynamic = "force-dynamic"

/**
 * Admin schedule helpers:
 * - action=key-dates → Registration opens / closes
 * - action=reminder-tests → near-term events for device reminder testing
 */
export async function POST(req: NextRequest) {
  const admin = await checkAdminAuth()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!getAdminPermissions(admin.role).canEdit) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const body = await req.json().catch(() => ({}))
    const year = parseRegistrationEventYear(body.year)
    const action = typeof body.action === "string" ? body.action : ""

    if (action === "key-dates") {
      const result = await ensureRegistrationKeyDates(year)
      const { ipAddress, userAgent } = getRequestAuditMeta(req)
      await logAuditAction(
        admin.email,
        "seed_schedule_key_dates",
        "schedule_event",
        undefined,
        { event_year: year, ...result },
        ipAddress,
        userAgent,
      )
      revalidatePublicSchedule()
      return NextResponse.json({
        success: true,
        action,
        ...result,
        events: await listScheduleEvents(year),
      })
    }

    if (action === "reminder-tests") {
      const result = await seedReminderTestEvents(year)
      const { ipAddress, userAgent } = getRequestAuditMeta(req)
      await logAuditAction(
        admin.email,
        "seed_schedule_reminder_tests",
        "schedule_event",
        undefined,
        { event_year: year, inserted: result.inserted, removed: result.removed },
        ipAddress,
        userAgent,
      )
      revalidatePublicSchedule()
      return NextResponse.json({
        success: true,
        action,
        ...result,
        events: await listScheduleEvents(year),
      })
    }

    return NextResponse.json(
      { error: "Unknown action. Use key-dates or reminder-tests." },
      { status: 400 },
    )
  } catch (error) {
    console.error("[admin/schedule/tools] POST error:", error)
    return NextResponse.json({ error: "Failed to run schedule tool" }, { status: 500 })
  }
}
