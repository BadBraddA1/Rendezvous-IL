import { NextResponse } from "next/server"
import { getCurrentAdmin, getAdminPermissions } from "@/lib/clerk-auth"
import {
  addSongPackItem,
  getSongPackDetail,
  reorderSongPackItems,
  uploadSongPackFile,
  validateSongPackFile,
} from "@/lib/song-packs"
import { notifySongPackUpdated } from "@/lib/song-packs-notify"

export const dynamic = "force-dynamic"

type Params = { params: Promise<{ id: string }> }

export async function POST(request: Request, { params }: Params) {
  const admin = await getCurrentAdmin(request)
  if (!admin || !getAdminPermissions(admin.role).canEdit) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const { id: packId } = await params
    const pack = await getSongPackDetail(packId)
    if (!pack) return NextResponse.json({ error: "Pack not found" }, { status: 404 })

    const contentType = request.headers.get("content-type") || ""

    if (contentType.includes("application/json")) {
      const body = await request.json()
      if (Array.isArray(body.orderedIds)) {
        await reorderSongPackItems(packId, body.orderedIds.map(String))
        const updated = await getSongPackDetail(packId)
        return NextResponse.json({ pack: updated })
      }
      return NextResponse.json({ error: "Unsupported request" }, { status: 400 })
    }

    const form = await request.formData()
    const file = form.get("file")
    if (!(file instanceof File) || file.size <= 0) {
      return NextResponse.json({ error: "File is required" }, { status: 400 })
    }
    const validationError = validateSongPackFile(file)
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 })
    }

    const title =
      typeof form.get("title") === "string" && String(form.get("title")).trim()
        ? String(form.get("title")).trim()
        : file.name.replace(/\.[^.]+$/, "") || "Song"

    const uploaded = await uploadSongPackFile(packId, await file.arrayBuffer(), file.type)
    const item = await addSongPackItem({
      packId,
      title,
      fileUrl: uploaded.url,
      fileType: uploaded.fileType,
      byteSize: uploaded.byteSize,
      contentHash: uploaded.contentHash,
    })

    const updated = await getSongPackDetail(packId)
    if (updated?.is_published) {
      void notifySongPackUpdated(updated.name)
    }
    return NextResponse.json({ item, pack: updated })
  } catch (error) {
    console.error("[admin/songs/items] POST error:", error)
    const message = error instanceof Error ? error.message : "Failed to add song"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
