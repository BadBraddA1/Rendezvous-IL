import { NextResponse } from "next/server"
import { checkAdminAuth } from "@/lib/admin-auth"
import { getAdminDashboardSummary } from "@/lib/admin-dashboard-summary"
import { parseRegistrationEventYear } from "@/lib/registration-event-years"

export const dynamic = "force-dynamic"

/** Web admin overview stats — defaults to 2027; pass ?year=2026 for archive. */
export async function GET(request: Request) {
  const admin = await checkAdminAuth()
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const eventYear = parseRegistrationEventYear(searchParams.get("year"))
    const summary = await getAdminDashboardSummary(eventYear)
    const registrationProgress =
      summary.registrationGoal > 0
        ? Math.min((summary.registrations / summary.registrationGoal) * 100, 100)
        : 0

    return NextResponse.json({
      summary,
      registrationProgress,
      updatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[admin/dashboard]", error)
    return NextResponse.json({ error: "Failed to load dashboard" }, { status: 500 })
  }
}
