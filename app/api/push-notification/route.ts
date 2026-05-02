import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { title, message, url } = await request.json()

    if (!title || !message) {
      return NextResponse.json(
        { error: "Title and message are required" },
        { status: 400 }
      )
    }

    const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID
    const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY

    console.log("[v0] OneSignal App ID exists:", !!ONESIGNAL_APP_ID)
    console.log("[v0] OneSignal API Key exists:", !!ONESIGNAL_REST_API_KEY)
    console.log("[v0] OneSignal API Key length:", ONESIGNAL_REST_API_KEY?.length || 0)

    if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
      return NextResponse.json(
        { error: "OneSignal credentials not configured" },
        { status: 500 }
      )
    }

    const response = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${ONESIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        included_segments: ["All"],
        headings: { en: title },
        contents: { en: message },
        url: url || "https://rendezvousil.com/schedule",
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error("[v0] OneSignal error:", data)
      return NextResponse.json(
        { error: data.errors?.[0] || "Failed to send notification" },
        { status: response.status }
      )
    }

    return NextResponse.json({
      success: true,
      recipients: data.recipients,
      id: data.id,
    })
  } catch (error) {
    console.error("[v0] Push notification error:", error)
    return NextResponse.json(
      { error: "Failed to send notification" },
      { status: 500 }
    )
  }
}
