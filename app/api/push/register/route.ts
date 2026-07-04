import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { authUserContext } from "@/lib/clerk-auth"
import { ensurePushSchema } from "@/lib/push-schema"

export const dynamic = "force-dynamic"

type PushPlatform = "ios" | "android"

function parsePlatform(value: unknown): PushPlatform {
  return value === "android" ? "android" : "ios"
}

/** Register a device token for push broadcast alerts (iOS APNs or Android FCM). */
export async function POST(request: Request) {
  try {
    await ensurePushSchema()
    const ctx = await authUserContext(request)
    const body = await request.json()
    const platform = parsePlatform(body.platform)
    const token = typeof body.token === "string" ? body.token.trim() : ""
    const bundleId =
      typeof body.bundleId === "string" ? body.bundleId.trim() : "com.rendezvousil.braddcorp.app"
    const clerkUserId = ctx?.userId ?? (typeof body.clerkUserId === "string" ? body.clerkUserId : null)

    if (platform === "android") {
      if (!token || token.length < 20) {
        return NextResponse.json({ error: "Invalid device token" }, { status: 400 })
      }

      await sql`
        INSERT INTO android_device_tokens (token, bundle_id, clerk_user_id, is_active, updated_at)
        VALUES (${token}, ${bundleId}, ${clerkUserId}, 1, datetime('now'))
        ON CONFLICT(token) DO UPDATE SET
          bundle_id = excluded.bundle_id,
          clerk_user_id = COALESCE(excluded.clerk_user_id, android_device_tokens.clerk_user_id),
          is_active = 1,
          updated_at = datetime('now')
      `
    } else {
      const environment =
        body.environment === "sandbox" || body.environment === "production"
          ? body.environment
          : "production"

      if (!token || token.length < 32) {
        return NextResponse.json({ error: "Invalid device token" }, { status: 400 })
      }

      await sql`
        INSERT INTO ios_device_tokens (token, bundle_id, environment, clerk_user_id, is_active, updated_at)
        VALUES (${token}, ${bundleId}, ${environment}, ${clerkUserId}, 1, datetime('now'))
        ON CONFLICT(token) DO UPDATE SET
          bundle_id = excluded.bundle_id,
          environment = excluded.environment,
          clerk_user_id = COALESCE(excluded.clerk_user_id, ios_device_tokens.clerk_user_id),
          is_active = 1,
          updated_at = datetime('now')
      `
    }

    return NextResponse.json({ success: true, platform, linkedUser: Boolean(clerkUserId) })
  } catch (error) {
    console.error("[push/register] error:", error)
    return NextResponse.json({ error: "Failed to register device token" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    await ensurePushSchema()
    const body = await request.json()
    const platform = parsePlatform(body.platform)
    const token = typeof body.token === "string" ? body.token.trim() : ""
    if (!token) {
      return NextResponse.json({ error: "Token required" }, { status: 400 })
    }

    if (platform === "android") {
      await sql`
        UPDATE android_device_tokens
        SET is_active = 0, updated_at = datetime('now')
        WHERE token = ${token}
      `
    } else {
      await sql`
        UPDATE ios_device_tokens
        SET is_active = 0, updated_at = datetime('now')
        WHERE token = ${token}
      `
    }

    return NextResponse.json({ success: true, platform })
  } catch (error) {
    console.error("[push/register] delete error:", error)
    return NextResponse.json({ error: "Failed to unregister" }, { status: 500 })
  }
}
