/**
 * Retreat-wide organizer push (APNs + FCM, OneSignal fallback).
 * Used by announcements, event pings, and the admin push API.
 */

import { sql } from "@/lib/db"
import { isApnsConfigured, sendApnsAlerts } from "@/lib/apns"
import { isFcmConfigured, isPermanentFcmTokenFailure, sendFcmAlerts } from "@/lib/fcm"
import { logPushSend, type PushFailureDetail } from "@/lib/push-activity"
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
  let apnsAttempted = 0
  let sandboxTokens = 0
  let productionTokens = 0
  let fcmSent: number | null = null
  let fcmFailed = 0
  let fcmAttempted = 0
  const failures: PushFailureDetail[] = []

  if (isApnsConfigured()) {
    const rows = await sql`
      SELECT token, environment, clerk_user_id FROM ios_device_tokens
      WHERE is_active = 1
    `
    const byEnv = new Map<"sandbox" | "production", { token: string; clerkUserId: string | null }[]>()
    for (const row of rows) {
      const env = String(row.environment) === "sandbox" ? "sandbox" : "production"
      const list = byEnv.get(env) ?? []
      list.push({
        token: String(row.token),
        clerkUserId: row.clerk_user_id != null ? String(row.clerk_user_id) : null,
      })
      byEnv.set(env, list)
    }

    let sent = 0
    let failed = 0
    for (const [environment, devices] of byEnv) {
      if (devices.length === 0) continue
      if (environment === "sandbox") sandboxTokens += devices.length
      else productionTokens += devices.length

      const byToken = new Map(devices.map((d) => [d.token, d.clerkUserId]))
      const results = await sendApnsAlerts(
        devices.map((d) => d.token),
        {
          title,
          body: message,
          url: targetUrl,
          threadId,
        },
        { environment },
      )
      apnsAttempted += results.length
      sent += results.filter((r) => r.success).length
      for (const f of results.filter((r) => !r.success)) {
        failed += 1
        failures.push({
          platform: "ios",
          environment,
          clerkUserId: byToken.get(f.deviceToken) ?? null,
          token: f.deviceToken,
          reason: f.reason ?? null,
          statusCode: f.status ?? null,
        })
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
      SELECT token, clerk_user_id FROM android_device_tokens
      WHERE is_active = 1
    `
    const devices = rows.map((r) => ({
      token: String(r.token),
      clerkUserId: r.clerk_user_id != null ? String(r.clerk_user_id) : null,
    }))
    if (devices.length > 0) {
      const byToken = new Map(devices.map((d) => [d.token, d.clerkUserId]))
      const results = await sendFcmAlerts(
        devices.map((d) => d.token),
        {
          title,
          body: message,
          url: targetUrl,
        },
      )
      fcmAttempted = results.length
      fcmSent = results.filter((r) => r.success).length
      const failed = results.filter((r) => !r.success)
      fcmFailed = failed.length
      for (const f of failed) {
        failures.push({
          platform: "android",
          clerkUserId: byToken.get(f.deviceToken) ?? null,
          token: f.deviceToken,
          reason: f.reason ?? null,
          statusCode: f.status ?? null,
        })
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
    await logPushSend({
      source: "broadcast",
      title,
      bodyPreview: message,
      iosAttempted: apnsAttempted,
      iosSucceeded: apnsSent ?? 0,
      iosFailed: apnsFailed,
      androidAttempted: fcmAttempted,
      androidSucceeded: fcmSent ?? 0,
      androidFailed: fcmFailed,
      sandboxTokens,
      productionTokens,
      failures,
    })

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
    await logPushSend({
      source: "broadcast",
      title,
      bodyPreview: message,
      iosAttempted: 0,
      iosSucceeded: 0,
      iosFailed: 0,
      androidAttempted: 0,
      androidSucceeded: 0,
      androidFailed: 0,
      meta: { error: "No push channel configured" },
    })
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
    await logPushSend({
      source: "broadcast",
      title,
      bodyPreview: message,
      iosAttempted: 0,
      iosSucceeded: 0,
      iosFailed: 0,
      androidAttempted: 0,
      androidSucceeded: 0,
      androidFailed: 0,
      meta: { channel: "onesignal", error: data.errors?.[0] || "Failed" },
    })
    return { success: false, error: data.errors?.[0] || "Failed to send notification" }
  }

  await logPushSend({
    source: "broadcast",
    title,
    bodyPreview: message,
    iosAttempted: 0,
    iosSucceeded: 0,
    iosFailed: 0,
    androidAttempted: 0,
    androidSucceeded: 0,
    androidFailed: 0,
    meta: { channel: "onesignal", recipients: data.recipients ?? 0 },
  })

  return {
    success: true,
    channel: "onesignal",
    recipients: data.recipients ?? 0,
  }
}
