import { NextResponse } from "next/server"
import {
  isValidDeviceId,
  recordDisplayHeartbeat,
} from "@/lib/live-updates/display-heartbeat"

export const dynamic = "force-dynamic"

function resolveClientIp(request: Request, bodyIp?: string | null): string | null {
  const fromBody = bodyIp?.trim()
  if (fromBody) return fromBody

  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    null
  )
}

/** Public heartbeat for Raspberry Pi / kiosk displays. */
export async function POST(request: Request) {
  let body: Record<string, unknown>

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const deviceId = typeof body.deviceId === "string" ? body.deviceId : ""
  if (!isValidDeviceId(deviceId)) {
    return NextResponse.json(
      { error: "deviceId must be 1–64 alphanumeric or hyphen characters" },
      { status: 400 },
    )
  }

  try {
    const result = await recordDisplayHeartbeat({
      deviceId,
      hostname: typeof body.hostname === "string" ? body.hostname : null,
      ip: resolveClientIp(request, typeof body.ip === "string" ? body.ip : null),
      lastView: typeof body.lastView === "string" ? body.lastView : null,
      kioskUrl: typeof body.kioskUrl === "string" ? body.kioskUrl : null,
      buildVersion: typeof body.buildVersion === "string" ? body.buildVersion : null,
      userAgent: request.headers.get("user-agent"),
    })

    return NextResponse.json({
      ok: true,
      deviceId: result.deviceId,
      lastSeenAt: result.lastSeenAt,
    })
  } catch (error) {
    console.error("[live-updates/heartbeat] error:", error)
    return NextResponse.json({ error: "Failed to record heartbeat" }, { status: 500 })
  }
}
