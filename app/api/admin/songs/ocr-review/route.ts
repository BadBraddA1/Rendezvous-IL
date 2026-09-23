import { NextResponse } from "next/server"
import { getCurrentAdmin, getAdminPermissions } from "@/lib/clerk-auth"
import { ensureSongPacksSchema, type SongPackItem } from "@/lib/song-packs"
import { sql, type SqlRow } from "@/lib/db"
import { toPublicMediaUrl } from "@/lib/media-keys"

export const dynamic = "force-dynamic"

function mapRow(row: SqlRow): SongPackItem & { pack_name?: string } {
  const pageCount =
    row.page_count != null && row.page_count !== "" ? Number(row.page_count) : null
  const verseCount =
    row.verse_count != null && row.verse_count !== "" ? Number(row.verse_count) : null
  const conf =
    row.ocr_confidence != null && row.ocr_confidence !== ""
      ? Number(row.ocr_confidence)
      : null
  return {
    id: String(row.id),
    pack_id: String(row.pack_id),
    title: String(row.title),
    sort_order: Number(row.sort_order ?? 0),
    file_url: toPublicMediaUrl(String(row.file_url)) ?? String(row.file_url),
    file_type: String(row.file_type) === "pdf" ? "pdf" : "image",
    byte_size: Number(row.byte_size ?? 0),
    content_hash: String(row.content_hash),
    page_count: Number.isFinite(pageCount) ? pageCount : null,
    verse_count: Number.isFinite(verseCount) ? verseCount : null,
    verse_pages: null,
    ocr_url: row.ocr_url ? toPublicMediaUrl(String(row.ocr_url)) ?? String(row.ocr_url) : null,
    ocr_status: row.ocr_status != null ? String(row.ocr_status) : null,
    ocr_confidence: Number.isFinite(conf) ? conf : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
    pack_name: row.pack_name != null ? String(row.pack_name) : undefined,
  }
}

/** GET /api/admin/songs/ocr-review?status=needs_review */
export async function GET(request: Request) {
  const admin = await getCurrentAdmin(request)
  if (!admin || !getAdminPermissions(admin.role).canEdit) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  await ensureSongPacksSchema()
  const url = new URL(request.url)
  const status = url.searchParams.get("status") || "needs_review"
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") || 40)))

  const rows = await sql`
    SELECT i.*, p.name AS pack_name
    FROM song_pack_items i
    INNER JOIN song_packs p ON p.id = i.pack_id
    WHERE i.ocr_status = ${status}
    ORDER BY COALESCE(i.ocr_confidence, 0) ASC, i.title ASC
    LIMIT ${limit}
  `
  return NextResponse.json({
    status,
    items: rows.map((r) => mapRow(r as SqlRow)),
  })
}
