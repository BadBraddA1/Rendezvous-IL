import { NextResponse } from "next/server"
import { authUserContext } from "@/lib/clerk-auth"
import {
  detectPlatformFromUserAgent,
  normalizeUserPlatform,
  recordUserActivity,
} from "@/lib/user-activity"

export const dynamic = "force-dynamic"

/** Record last-seen + platform for signed-in users (web + native apps). */
export async function POST(request: Request) {
  const ctx = await authUserContext(request)
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let platform = detectPlatformFromUserAgent(request.headers.get("user-agent"))
  let appVersion: string | null = null

  try {
    const body = await request.json()
    if (body && typeof body === "object") {
      if ("platform" in body) {
        platform = normalizeUserPlatform(body.platform)
      }
      if (typeof body.appVersion === "string" && body.appVersion.trim()) {
        appVersion = body.appVersion.trim()
      }
    }
  } catch {
    // empty body is fine for web pings
  }

  await recordUserActivity({
    clerkUserId: ctx.userId,
    email: ctx.email ?? null,
    platform,
    appVersion,
  })

  return NextResponse.json({ success: true, platform })
}
