import { NextResponse } from "next/server"
import { auth, currentUser } from "@clerk/nextjs/server"
import {
  detectPlatformFromUserAgent,
  normalizeUserPlatform,
  recordUserActivity,
} from "@/lib/user-activity"

export const dynamic = "force-dynamic"

/** Record last-seen + platform for signed-in users (web + native apps). */
export async function POST(request: Request) {
  const { userId } = await auth({ acceptsToken: "session_token" })
  if (!userId) {
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

  const user = await currentUser()
  const email = user?.emailAddresses[0]?.emailAddress ?? null

  await recordUserActivity({
    clerkUserId: userId,
    email,
    platform,
    appVersion,
  })

  return NextResponse.json({ success: true, platform })
}
