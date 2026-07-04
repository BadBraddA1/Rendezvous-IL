import { NextResponse } from "next/server"
import { getAdminDashboardSummary } from "@/lib/admin-dashboard-summary"
import { getCurrentAdmin } from "@/lib/clerk-auth"

export const dynamic = "force-dynamic"

/** Compact admin dashboard payload for the iOS admin hub. */
export async function GET(request: Request) {
  const admin = await getCurrentAdmin(request)
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const summary = await getAdminDashboardSummary()
    const registrationProgress =
      summary.registrationGoal > 0
        ? Math.min((summary.registrations / summary.registrationGoal) * 100, 100)
        : 0

    return NextResponse.json({
      admin,
      summary,
      registrationProgress,
      updatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[admin/mobile/dashboard]", error)
    return NextResponse.json({ error: "Failed to load dashboard" }, { status: 500 })
  }
}
