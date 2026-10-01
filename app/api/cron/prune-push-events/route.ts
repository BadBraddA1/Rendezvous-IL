import { NextResponse } from "next/server"
import { isAuthorizedCron } from "@/lib/cron-auth"
import { prunePushEvents } from "@/lib/push-activity"

export const dynamic = "force-dynamic"
export const maxDuration = 30

/** Drop push activity rows older than 24 hours. */
export async function GET(request: Request) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const result = await prunePushEvents()
    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    console.error("[cron/prune-push-events] error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Cron failed" },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  return GET(request)
}
