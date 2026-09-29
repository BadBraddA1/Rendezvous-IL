import { NextResponse } from "next/server"
import { isAuthorizedCron } from "@/lib/cron-auth"
import { publishDueAnnouncements } from "@/lib/announcements"

export const dynamic = "force-dynamic"
export const maxDuration = 60

/** Publish scheduled announcements / event pings that are due (Vercel cron every minute). */
export async function GET(request: Request) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const result = await publishDueAnnouncements()
    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    console.error("[cron/publish-announcements] error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Cron failed" },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  return GET(request)
}
