import { NextResponse } from "next/server"
import { getCurrentAdmin, getAdminPermissions } from "@/lib/clerk-auth"
import {
  listChatChannelPhotoshowPhotos,
  setChatPhotoshowPhotoHidden,
} from "@/lib/live-updates/chat-photoshow"

export const dynamic = "force-dynamic"

/** List chat photos for a channel (includes hidden ones for moderation). */
export async function GET(request: Request) {
  const admin = await getCurrentAdmin(request)
  if (!admin || !getAdminPermissions(admin.role).canEdit) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const channelId = searchParams.get("channel")?.trim() || ""
    if (!channelId) {
      return NextResponse.json({ error: "channel is required" }, { status: 400 })
    }

    const photos = await listChatChannelPhotoshowPhotos(channelId, { includeHidden: true })
    return NextResponse.json({ photos, channelId })
  } catch (error) {
    console.error("[admin/photoshow/chat] GET error:", error)
    return NextResponse.json({ error: "Failed to load chat photos" }, { status: 500 })
  }
}

/** Hide or unhide a chat photo from the TV photoshow (does not delete the chat message). */
export async function PATCH(request: Request) {
  const admin = await getCurrentAdmin(request)
  if (!admin || !getAdminPermissions(admin.role).canEdit) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const body = await request.json()
    const photoId = typeof body.photoId === "string" ? body.photoId.trim() : ""
    const channelId = typeof body.channelId === "string" ? body.channelId.trim() : ""
    const hidden = Boolean(body.hidden)

    if (!photoId || !channelId) {
      return NextResponse.json({ error: "photoId and channelId are required" }, { status: 400 })
    }

    await setChatPhotoshowPhotoHidden({
      photoId,
      channelId,
      hidden,
      hiddenBy: admin.email,
    })

    const photos = await listChatChannelPhotoshowPhotos(channelId, { includeHidden: true })
    return NextResponse.json({ ok: true, photos })
  } catch (error) {
    console.error("[admin/photoshow/chat] PATCH error:", error)
    const message = error instanceof Error ? error.message : "Failed to update photo"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
