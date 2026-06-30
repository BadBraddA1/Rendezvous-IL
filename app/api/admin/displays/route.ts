import { NextResponse } from "next/server"
import { getCurrentAdmin, getAdminPermissions } from "@/lib/clerk-auth"
import {
  getDisplayStatus,
  isDisplayStale,
  listDisplayHeartbeats,
} from "@/lib/live-updates/display-heartbeat"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const admin = await getCurrentAdmin()
    if (!admin || !getAdminPermissions(admin.role).canViewRegistrations) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const displays = await listDisplayHeartbeats()

    return NextResponse.json({
      displays: displays.map((display) => ({
        ...display,
        stale: isDisplayStale(display.lastSeenAt),
        status: getDisplayStatus(display.lastSeenAt),
      })),
    })
  } catch (error) {
    console.error("[admin/displays] error:", error)
    return NextResponse.json({ error: "Failed to load displays" }, { status: 500 })
  }
}
