import { NextResponse } from "next/server"
import { listActivePhotoshowPhotos, PHOTOSHOW_INTERVAL_MS } from "@/lib/live-updates/photoshow"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const photos = await listActivePhotoshowPhotos()
    return NextResponse.json({
      photos,
      intervalMs: PHOTOSHOW_INTERVAL_MS,
    })
  } catch (error) {
    console.error("[live-updates/photos] error:", error)
    return NextResponse.json({ photos: [], intervalMs: PHOTOSHOW_INTERVAL_MS })
  }
}
