import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export const dynamic = "force-dynamic"

/** Register a Live Activity push token for server-driven lock screen updates. */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const activityToken = typeof body.activityToken === "string" ? body.activityToken.trim() : ""
    const bundleId = typeof body.bundleId === "string" ? body.bundleId.trim() : "com.rendezvousil.app"
    const environment =
      body.environment === "sandbox" || body.environment === "production"
        ? body.environment
        : "production"

    if (!activityToken) {
      return NextResponse.json({ error: "Invalid activity token" }, { status: 400 })
    }

    await sql`
      INSERT INTO ios_activity_push_tokens (activity_token, bundle_id, environment, is_active, updated_at)
      VALUES (${activityToken}, ${bundleId}, ${environment}, 1, datetime('now'))
      ON CONFLICT(activity_token) DO UPDATE SET
        bundle_id = excluded.bundle_id,
        environment = excluded.environment,
        is_active = 1,
        updated_at = datetime('now')
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[push/activity-register] error:", error)
    return NextResponse.json({ error: "Failed to register activity token" }, { status: 500 })
  }
}
