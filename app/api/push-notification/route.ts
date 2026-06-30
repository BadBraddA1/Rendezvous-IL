import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { defaultApnsEnvironment, isApnsConfigured, sendApnsAlerts } from "@/lib/apns"
import { isFcmConfigured, isPermanentFcmTokenFailure, sendFcmAlerts } from "@/lib/fcm"

export async function POST(request: Request) {
  try {
    const { title, message, url } = await request.json()

    if (!title || !message) {
      return NextResponse.json({ error: "Title and message are required" }, { status: 400 })
    }

    const targetUrl = url || "https://rendezvousil.com/schedule"

    let apnsSent: number | null = null
    let apnsFailed = 0
    let fcmSent: number | null = null
    let fcmFailed = 0

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
          body: message,
          url: targetUrl,
          threadId: "rendezvous-announcements",
        })

        apnsSent = results.filter((r) => r.success).length
        const failed = results.filter((r) => !r.success)
        apnsFailed = failed.length

        for (const f of failed) {
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
      }
    }

    if (apnsSent !== null || fcmSent !== null) {
      if (apnsSent !== null && fcmSent !== null) {
        return NextResponse.json({
          success: true,
          channel: "apns+fcm",
          apns: { recipients: apnsSent, failed: apnsFailed },
          fcm: { recipients: fcmSent, failed: fcmFailed },
        })
      }

      if (apnsSent !== null) {
        return NextResponse.json({
          success: true,
          channel: "apns",
          recipients: apnsSent,
          failed: apnsFailed,
        })
      }

      return NextResponse.json({
        success: true,
        channel: "fcm",
        recipients: fcmSent,
        failed: fcmFailed,
      })
    }

    // Fallback: OneSignal (PWA / legacy subscribers).
    const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID
    const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY

    if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
      return NextResponse.json(
        { error: "No push channel configured (APNs, FCM, or OneSignal)" },
        { status: 500 },
      )
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

    const data = await response.json()

    if (!response.ok) {
      console.error("[push-notification] OneSignal error:", data)
      return NextResponse.json(
        { error: data.errors?.[0] || "Failed to send notification" },
        { status: response.status },
      )
    }

    return NextResponse.json({
      success: true,
      channel: "onesignal",
      recipients: data.recipients,
      id: data.id,
    })
  } catch (error) {
    console.error("[push-notification] error:", error)
    return NextResponse.json({ error: "Failed to send notification" }, { status: 500 })
  }
}
