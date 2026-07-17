import { type NextRequest, NextResponse } from "next/server"
import { checkAdminAuth, getAdminPermissions } from "@/lib/admin-auth"
import { isIsoDate, listScheduleEvents, reorderScheduleEvents } from "@/lib/event-schedule"
import { parseRegistrationEventYear } from "@/lib/registration-event-years"
import { revalidatePublicSchedule } from "@/lib/schedule-revalidate"

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
    const day = typeof body.day === "string" ? body.day : ""
    const eventDate =
      typeof body.eventDate === "string" && isIsoDate(body.eventDate.trim())
        ? body.eventDate.trim()
        : null
    const orderedIds = Array.isArray(body.orderedIds)
      ? body.orderedIds.map(Number).filter(Number.isInteger)
      : []

    if ((!day && !eventDate) || orderedIds.length === 0) {
      return NextResponse.json({ error: "Day and ordered ids are required" }, { status: 400 })
    }

    await reorderScheduleEvents(year, day || "Custom", orderedIds, eventDate)
    revalidatePublicSchedule()
    return NextResponse.json({ success: true, events: await listScheduleEvents(year) })
  } catch (error) {
    console.error("[admin/schedule/reorder] POST error:", error)
    return NextResponse.json({ error: "Failed to reorder schedule" }, { status: 500 })
  }
}
