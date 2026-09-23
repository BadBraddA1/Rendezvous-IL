import { NextResponse } from "next/server"
import { getCurrentAdmin, getAdminPermissions } from "@/lib/clerk-auth"
import {
  ensureSongPacksSchema,
  getSongPackDetail,
  updateSongPackItem,
} from "@/lib/song-packs"
import { isR2MediaConfigured, putMediaObject } from "@/lib/r2-media"
import { sql } from "@/lib/db"

export const dynamic = "force-dynamic"

type Params = { params: Promise<{ itemId: string }> }

/**
 * Confirm or edit lyric OCR for one song.
 * Body: { status?: "confirmed"|"needs_review"|"auto", pages?: [{index,text}], confidence?: number }
 */
export async function PATCH(request: Request, { params }: Params) {
  const admin = await getCurrentAdmin(request)
  if (!admin || !getAdminPermissions(admin.role).canEdit) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  await ensureSongPacksSchema()
  const { itemId } = await params
  const [existing] = await sql`
    SELECT * FROM song_pack_items WHERE id = ${itemId} LIMIT 1
  `
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const body = await request.json().catch(() => ({}))
  const status =
    typeof body.status === "string" && body.status.trim()
      ? String(body.status).trim()
      : "confirmed"

  let ocrUrl = existing.ocr_url != null ? String(existing.ocr_url) : null
  let confidence =
    existing.ocr_confidence != null ? Number(existing.ocr_confidence) : null

  if (Array.isArray(body.pages) || body.confidence != null || status === "confirmed") {
    let prev: Record<string, unknown> = {}
    if (ocrUrl) {
      try {
        const res = await fetch(ocrUrl)
        if (res.ok) prev = (await res.json()) as Record<string, unknown>
      } catch {
        /* ignore */
      }
    }
    const pages = Array.isArray(body.pages) ? body.pages : prev.pages || []
    if (typeof body.confidence === "number") confidence = body.confidence
    const payload = {
      ...prev,
      item_id: itemId,
      title: String(existing.title),
      pages,
      confidence: confidence ?? 1,
      status,
      method: prev.method || "lyric_band_vision",
      reviewed_at: new Date().toISOString(),
    }
    if (!isR2MediaConfigured()) {
      return NextResponse.json({ error: "R2 not configured" }, { status: 500 })
    }
    const key = `song-packs/${String(existing.pack_id)}/ocr/${itemId}.json`
    const { url } = await putMediaObject(
      key,
      Buffer.from(JSON.stringify(payload), "utf8"),
      "application/json",
    )
    ocrUrl = url
  }

  await sql`
    UPDATE song_pack_items
    SET ocr_url = ${ocrUrl},
        ocr_status = ${status},
        ocr_confidence = ${confidence},
        updated_at = datetime('now')
    WHERE id = ${itemId}
  `

  const item = await updateSongPackItem(itemId, {
    ocrUrl,
    ocrStatus: status,
    ocrConfidence: confidence,
  })
  const pack = await getSongPackDetail(String(existing.pack_id))
  return NextResponse.json({ item, pack, ocr_status: status })
}
