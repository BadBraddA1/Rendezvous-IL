import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { authUserContext } from "@/lib/clerk-auth"
import { ensurePushSchema } from "@/lib/push-schema"
import {
  type ApnsEnvironment,
  isApnsConfigured,
  sendApnsAlerts,
} from "@/lib/apns"

export const dynamic = "force-dynamic"

type SoundKind = "chat" | "announce" | "default"

function soundFile(kind: SoundKind): string {
  switch (kind) {
    case "announce":
      return "announce.caf"
    case "default":
      return "default"
    case "chat":
    default:
      return "chat.caf"
  }
}

/**
 * Send a test alert to the signed-in user's own iOS devices only.
 * Body: { sound?: "chat" | "announce" | "default" }
 */
export async function POST(request: Request) {
  try {
    await ensurePushSchema()
    const ctx = await authUserContext(request)
    if (!ctx?.userId) {
      return NextResponse.json({ error: "Sign in required" }, { status: 401 })
    }

    if (!isApnsConfigured()) {
      return NextResponse.json({ error: "APNs is not configured on the server" }, { status: 503 })
    }

    let sound: SoundKind = "chat"
    try {
      const body = await request.json()
      if (body?.sound === "announce" || body?.sound === "default" || body?.sound === "chat") {
        sound = body.sound
      }
    } catch {
      // empty body is fine — default chat sound
    }

    const rows = await sql`
      SELECT token, environment FROM ios_device_tokens
      WHERE is_active = 1
        AND clerk_user_id = ${ctx.userId}
    `

    if (rows.length === 0) {
      return NextResponse.json(
        {
          error:
            "No iOS device token for your account. Open the app, allow notifications, then try again.",
        },
        { status: 404 },
      )
    }

    const byEnv = new Map<ApnsEnvironment, string[]>()
    for (const row of rows) {
      const env: ApnsEnvironment =
        String(row.environment) === "sandbox" ? "sandbox" : "production"
      const list = byEnv.get(env) ?? []
      list.push(String(row.token))
      byEnv.set(env, list)
    }

    const title = sound === "announce" ? "Test announcement sound" : "Test chat sound"
    const body =
      sound === "announce"
        ? "If you hear the glass-like tone, announce.caf is working."
        : sound === "default"
          ? "If you hear the system tri-tone, default sound is working."
          : "If you hear the short tink, chat.caf is working."

    let sent = 0
    let failed = 0
    const details: { environment: string; sent: number; failed: number }[] = []

    for (const [environment, tokens] of byEnv) {
      const results = await sendApnsAlerts(
        tokens,
        {
          title,
          body,
          url: "rendezvousil://chat",
          threadId: "push-test",
          sound: soundFile(sound),
        },
        { environment },
      )
      const ok = results.filter((r) => r.success).length
      const bad = results.filter((r) => !r.success)
      sent += ok
      failed += bad.length
      details.push({ environment, sent: ok, failed: bad.length })

      for (const f of bad) {
        if (f.reason?.includes("BadDeviceToken") || f.reason?.includes("Unregistered")) {
          await sql`UPDATE ios_device_tokens SET is_active = 0 WHERE token = ${f.deviceToken}`
        }
      }
    }

    if (sent === 0) {
      return NextResponse.json(
        {
          error: "APNs rejected every token (check APNS_ENVIRONMENT / sandbox vs production).",
          details,
        },
        { status: 502 },
      )
    }

    return NextResponse.json({
      success: true,
      sound: soundFile(sound),
      sent,
      failed,
      details,
    })
  } catch (error) {
    console.error("[push/test] error:", error)
    return NextResponse.json({ error: "Failed to send test push" }, { status: 500 })
  }
}
