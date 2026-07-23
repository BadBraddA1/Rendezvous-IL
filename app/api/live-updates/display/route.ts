import { NextResponse } from "next/server"
import {
  getDisplayByDeviceId,
  isValidDeviceId,
} from "@/lib/live-updates/display-heartbeat"

export const dynamic = "force-dynamic"

/** Public room label for a kiosk device (shown on the TV). */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const deviceId = searchParams.get("device")?.trim() || ""
    if (!isValidDeviceId(deviceId)) {
      return NextResponse.json({ roomLabel: null })
    }

    const display = await getDisplayByDeviceId(deviceId)
    return NextResponse.json({
      deviceId,
      roomLabel: display?.roomLabel ?? null,
    })
  } catch (error) {
    console.error("[live-updates/display] error:", error)
    return NextResponse.json({ roomLabel: null })
  }
}
