import { NextResponse } from "next/server"
import { getCurrentAdmin, getAdminPermissions } from "@/lib/clerk-auth"
import {
  getDisplayStatus,
  isDisplayStale,
  listDisplayHeartbeats,
  updateDisplayRoomLabel,
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

export async function PATCH(request: Request) {
  try {
    const admin = await getCurrentAdmin(request)
    if (!admin || !getAdminPermissions(admin.role).canEdit) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const deviceId = typeof body.deviceId === "string" ? body.deviceId : ""
    const roomLabel =
      body.roomLabel === null || body.roomLabel === undefined
        ? null
        : typeof body.roomLabel === "string"
          ? body.roomLabel
          : null

    if (!deviceId) {
      return NextResponse.json({ error: "deviceId is required" }, { status: 400 })
    }

    const display = await updateDisplayRoomLabel(deviceId, roomLabel)
    if (!display) {
      return NextResponse.json({ error: "Display not found" }, { status: 404 })
    }

    return NextResponse.json({
      display: {
        ...display,
        stale: isDisplayStale(display.lastSeenAt),
        status: getDisplayStatus(display.lastSeenAt),
      },
    })
  } catch (error) {
    console.error("[admin/displays] PATCH error:", error)
    return NextResponse.json({ error: "Failed to update display" }, { status: 500 })
  }
}
