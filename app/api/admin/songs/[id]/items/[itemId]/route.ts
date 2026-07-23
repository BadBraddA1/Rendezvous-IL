import { NextResponse } from "next/server"
import { getCurrentAdmin, getAdminPermissions } from "@/lib/clerk-auth"
import {
  deleteSongPackItem,
  getSongPackDetail,
  updateSongPackItem,
  uploadSongPackFile,
  validateSongPackFile,
} from "@/lib/song-packs"
import { notifySongPackUpdated } from "@/lib/song-packs-notify"

export const dynamic = "force-dynamic"

type Params = { params: Promise<{ id: string; itemId: string }> }

export async function PATCH(request: Request, { params }: Params) {
  const admin = await getCurrentAdmin(request)
  if (!admin || !getAdminPermissions(admin.role).canEdit) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const { id: packId, itemId } = await params
    const contentType = request.headers.get("content-type") || ""

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData()
      const file = form.get("file")
      const titleRaw = form.get("title")
      const updates: {
        title?: string
        fileUrl?: string
        fileType?: "pdf" | "image"
        byteSize?: number
        contentHash?: string
      } = {}

      if (typeof titleRaw === "string" && titleRaw.trim()) {
        updates.title = titleRaw.trim()
      }

      if (file instanceof File && file.size > 0) {
        const validationError = validateSongPackFile(file)
        if (validationError) {
          return NextResponse.json({ error: validationError }, { status: 400 })
        }
        const uploaded = await uploadSongPackFile(packId, await file.arrayBuffer(), file.type)
        updates.fileUrl = uploaded.url
        updates.fileType = uploaded.fileType
        updates.byteSize = uploaded.byteSize
        updates.contentHash = uploaded.contentHash
      }

      const item = await updateSongPackItem(itemId, updates)
      if (!item || item.pack_id !== packId) {
        return NextResponse.json({ error: "Not found" }, { status: 404 })
      }
      const pack = await getSongPackDetail(packId)
      if (pack?.is_published && updates.fileUrl) {
        void notifySongPackUpdated(pack.name)
      }
      return NextResponse.json({ item, pack })
    }

    const body = await request.json()
    const item = await updateSongPackItem(itemId, {
      title: typeof body.title === "string" ? body.title : undefined,
      sortOrder: typeof body.sort_order === "number" ? body.sort_order : undefined,
    })
    if (!item || item.pack_id !== packId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }
    const pack = await getSongPackDetail(packId)
    return NextResponse.json({ item, pack })
  } catch (error) {
    console.error("[admin/songs/item] PATCH error:", error)
    const message = error instanceof Error ? error.message : "Failed to update song"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function DELETE(request: Request, { params }: Params) {
  const admin = await getCurrentAdmin(request)
  if (!admin || !getAdminPermissions(admin.role).canEdit) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const { id: packId, itemId } = await params
    const detail = await getSongPackDetail(packId)
    if (!detail?.items.some((item) => item.id === itemId)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }
    await deleteSongPackItem(itemId)
    const pack = await getSongPackDetail(packId)
    return NextResponse.json({ ok: true, pack })
  } catch (error) {
    console.error("[admin/songs/item] DELETE error:", error)
    return NextResponse.json({ error: "Failed to delete song" }, { status: 500 })
  }
}
