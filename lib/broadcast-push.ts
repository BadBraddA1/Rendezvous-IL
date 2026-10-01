/**
 * Retreat-wide organizer push (APNs + FCM, OneSignal fallback).
 * Used by announcements, event pings, and the admin push API.
 */

import { sql } from "@/lib/db"
import { isApnsConfigured, sendApnsAlerts } from "@/lib/apns"
import { isFcmConfigured, isPermanentFcmTokenFailure, sendFcmAlerts } from "@/lib/fcm"
import { ensurePushSchema } from "@/lib/push-schema"

export type BroadcastPushResult = {
  success: boolean
  channel?: string
  recipients?: number
  apns?: { recipients: number; failed: number }
  fcm?: { recipients: number; failed: number }
  error?: string
}

/**
 * Send a push to all active device tokens (and OneSignal if native channels unset).
 */
export async function sendBroadcastPush(input: {
  title: string
  message: string
  url?: string
  threadId?: string
}): Promise<BroadcastPushResult> {
  const title = input.title.trim()
  const message = input.message.trim()
  if (!title || !message) {
    return { success: false, error: "Title and message are required" }
  }

  const targetUrl = input.url || "https://rendezvousil.com/schedule"
  const threadId = input.threadId || "rendezvous-announcements"

  await ensurePushSchema()

  let apnsSent: number | null = null
  let apnsFailed = 0
  let fcmSent: number | null = null
  let fcmFailed = 0

  if (isApnsConfigured()) {
    const rows = await sql`
      SELECT token, environment FROM ios_device_tokens
      WHERE is_active = 1
    `
    const byEnv = new Map<"sandbox" | "production", string[]>()
    for (const row of rows) {
      const env = String(row.environment) === "sandbox" ? "sandbox" : "production"
      const list = byEnv.get(env) ?? []
      list.push(String(row.token))
      byEnv.set(env, list)
    }

    let sent = 0
    let failed = 0
    for (const [environment, tokens] of byEnv) {
      if (tokens.length === 0) continue
      const results = await sendApnsAlerts(
        tokens,
        {
          title,
          body: message,
          url: targetUrl,
          threadId,
        },
        { environment },
      )
      sent += results.filter((r) => r.success).length
      const bad = results.filter((r) => !r.success)
      failed += bad.length
      for (const f of bad) {
        if (f.reason?.includes("BadDeviceToken") || f.reason?.includes("Unregistered")) {
          await sql`UPDATE ios_device_tokens SET is_active = 0 WHERE token = ${f.deviceToken}`
        }
      }
    }
    apnsSent = sent
    apnsFailed = failed
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
        body: message,
        url: targetUrl,
      })
      fcmSent = results.filter((r) => r.success).length
      const failed = results.filter((r) => !r.success)
      fcmFailed = failed.length
      for (const f of failed) {
        if (isPermanentFcmTokenFailure(f.reason)) {
          await sql`UPDATE android_device_tokens SET is_active = 0 WHERE token = ${f.deviceToken}`
        }
      }
    } else {
      fcmSent = 0
    }
  }

  if (apnsSent !== null || fcmSent !== null) {
    const recipients = (apnsSent ?? 0) + (fcmSent ?? 0)
    if (apnsSent !== null && fcmSent !== null) {
      return {
        success: true,
        channel: "apns+fcm",
        recipients,
        apns: { recipients: apnsSent, failed: apnsFailed },
        fcm: { recipients: fcmSent, failed: fcmFailed },
      }
    }
    if (apnsSent !== null) {
      return {
        success: true,
        channel: "apns",
        recipients: apnsSent,
        apns: { recipients: apnsSent, failed: apnsFailed },
      }
    }
    return {
      success: true,
      channel: "fcm",
      recipients: fcmSent ?? 0,
      fcm: { recipients: fcmSent ?? 0, failed: fcmFailed },
    }
  }

  const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID
  const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY
  if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
    return { success: false, error: "No push channel configured (APNs, FCM, or OneSignal)" }
  }

  const response = await fetch("https://onesignal.com/api/v1/notifications", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${ONESIGNAL_REST_API_KEY}`,
    },
    body: JSON.stringify({
      app_id: ONESIGNAL_APP_ID,
      included_segments: ["All"],
      headings: { en: title },
      contents: { en: message },
      url: targetUrl,
    }),
  })

  const data = (await response.json()) as {
    recipients?: number
    id?: string
    errors?: string[]
  }

  if (!response.ok) {
    return { success: false, error: data.errors?.[0] || "Failed to send notification" }
  }

  return {
    success: true,
    channel: "onesignal",
    recipients: data.recipients ?? 0,
  }
}
