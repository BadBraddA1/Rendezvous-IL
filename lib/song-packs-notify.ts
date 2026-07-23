import { sql } from "@/lib/db"
import { defaultApnsEnvironment, isApnsConfigured, sendApnsAlerts } from "@/lib/apns"
import { isFcmConfigured, isPermanentFcmTokenFailure, sendFcmAlerts } from "@/lib/fcm"

/**
 * Broadcast that a song pack was published or updated.
 * Best-effort — never throws; apps still download opportunistically on open.
 */
export async function notifySongPackUpdated(packName: string): Promise<void> {
  const title = "Song pack updated"
  const body = `${packName} — open the app to finish downloading for offline use.`
  const url = "https://rendezvousil.com"

  try {
    if (isApnsConfigured()) {
      const rows = await sql`
        SELECT token FROM ios_device_tokens
        WHERE is_active = 1
          AND environment = ${defaultApnsEnvironment()}
      `
      const tokens = rows.map((r: { token: string }) => r.token)
      if (tokens.length > 0) {
        const results = await sendApnsAlerts(tokens, {
          title,
          body,
          url,
          threadId: "rendezvous-songs",
        })
        for (const f of results.filter((r) => !r.success)) {
          if (f.reason?.includes("BadDeviceToken") || f.reason?.includes("Unregistered")) {
            await sql`UPDATE ios_device_tokens SET is_active = 0 WHERE token = ${f.deviceToken}`
          }
        }
      }
    }

    if (isFcmConfigured()) {
      const rows = await sql`
        SELECT token FROM android_device_tokens
        WHERE is_active = 1
      `
      const tokens = rows.map((r: { token: string }) => r.token)
      if (tokens.length > 0) {
        const results = await sendFcmAlerts(tokens, {
          title,
          body,
          url,
        })
        for (const f of results.filter((r) => !r.success)) {
          if (isPermanentFcmTokenFailure(f.reason)) {
            await sql`UPDATE android_device_tokens SET is_active = 0 WHERE token = ${f.deviceToken}`
          }
        }
      }
    }
  } catch (error) {
    console.error("[song-packs-notify] push failed:", error)
  }
}
