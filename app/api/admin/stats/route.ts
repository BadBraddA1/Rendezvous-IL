import { NextResponse } from "next/server"
import { checkAdminAuth } from "@/lib/admin-auth"
import { getAdminDashboardSummary } from "@/lib/admin-dashboard-summary"
import { parseRegistrationEventYear } from "@/lib/registration-event-years"

export const dynamic = "force-dynamic"

/** Legacy stats endpoint — now year-scoped (default 2027). Prefer /api/admin/dashboard. */
export async function GET(request: Request) {
  const admin = await checkAdminAuth()
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const eventYear = parseRegistrationEventYear(searchParams.get("year"))
    const summary = await getAdminDashboardSummary(eventYear)

    return NextResponse.json({
      totalRegistrations: summary.registrations,
      totalAttendees: summary.registeredAttendees,
      totalRevenue: summary.totalRevenue,
      lodgingBreakdown: {
        motel: summary.lodgingBreakdown.motel,
        rv: summary.lodgingBreakdown.rv,
        tent: summary.lodgingBreakdown.tent,
      },
      eventYear: summary.eventYear,
    })
  } catch (error) {
    console.error("[v0] Stats error:", error)
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 })
  }
}
