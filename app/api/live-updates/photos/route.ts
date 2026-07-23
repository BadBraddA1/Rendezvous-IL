import { NextResponse } from "next/server"
import { listChatChannelPhotoshowPhotos } from "@/lib/live-updates/chat-photoshow"
import { listActivePhotoshowPhotos, PHOTOSHOW_INTERVAL_MS } from "@/lib/live-updates/photoshow"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const channelId = searchParams.get("channel")?.trim() || null

    if (channelId) {
      const photos = await listChatChannelPhotoshowPhotos(channelId)
      return NextResponse.json({
        photos,
        intervalMs: PHOTOSHOW_INTERVAL_MS,
        source: "chat" as const,
        channelId,
      })
    }

    const photos = await listActivePhotoshowPhotos()
    return NextResponse.json({
      photos,
      intervalMs: PHOTOSHOW_INTERVAL_MS,
      source: "admin" as const,
    })
  } catch (error) {
    console.error("[live-updates/photos] error:", error)
    // Do not return a successful empty list — clients keep their last good slides.
    return NextResponse.json(
      { error: "Failed to load photos", photos: null, intervalMs: PHOTOSHOW_INTERVAL_MS },
      { status: 503 },
    )
  }
}
