import { NextResponse } from "next/server"
import { getCurrentAdmin } from "@/lib/clerk-auth"
import { ensureSongPacksSchema } from "@/lib/song-packs"
import { sql, type SqlRow } from "@/lib/db"
import { toPublicMediaUrl } from "@/lib/media-keys"

export const dynamic = "force-dynamic"

/** Admin-only book codes — do not change stored titles (apps stay as-is). */
const BOOK_BY_SLUG: Record<string, { code: "A" | "B" | "C" | "D"; label: string }> = {
  "songs-of-faith-and-praise": { code: "A", label: "Songs of Faith and Praise" },
  "sacred-songs-of-the-church": { code: "B", label: "Sacred Songs of the Church" },
  "the-paperless-hymnal": { code: "C", label: "The Paperless Hymnal" },
  "praise-and-harmony": { code: "D", label: "Praise and Harmony" },
}

function pageFromTitle(title: string): number | null {
  const m = title.trim().match(/^(\d{1,4})\s*[·.•\-–— ]/)
  return m ? Number(m[1]) : null
}

function adminLabel(code: "A" | "B" | "C" | "D" | null, title: string): string {
  const page = pageFromTitle(title)
  if (code && page != null) {
    const rest = title.replace(/^\d{1,4}\s*[·.•\-–—]\s*/, "").trim()
    return rest ? `${code}-${page} · ${rest}` : `${code}-${page}`
  }
  if (code) return `${code} · ${title}`
  return title
}

/**
 * GET /api/admin/songs/library
 *   ?q=A-446|B-12|957|title
 *   &book=all|A|B
 *   &filter=all|missing|high|low|gemini
 *   &limit=200
 *
 * Browse library packs for OCR QA. Admin display uses A–D-### (SFP/SSOC/TPH/P&H).
 */
export async function GET(request: Request) {
  const admin = await getCurrentAdmin(request)
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  await ensureSongPacksSchema()

  const url = new URL(request.url)
  let q = (url.searchParams.get("q") || "").trim()
  const filter = (url.searchParams.get("filter") || "all").toLowerCase()
  const bookParam = (url.searchParams.get("book") || "all").toUpperCase()
  const limit = Math.min(500, Math.max(1, Number(url.searchParams.get("limit") || 200)))

  const where: string[] = ["COALESCE(p.is_library, 0) = 1"]
  const args: unknown[] = []

  // Parse A-123 / B-45 / C-89 / D-12 from query
  let bookFromQ: "A" | "B" | "C" | "D" | null = null
  const bookMatch = q.match(/^([A-Da-d])\s*[-–—]?\s*(\d{1,4})$/)
  if (bookMatch) {
    bookFromQ = bookMatch[1]!.toUpperCase() as "A" | "B" | "C" | "D"
    q = bookMatch[2]!
  }

  const book =
    bookFromQ ||
    (bookParam === "A" || bookParam === "B" || bookParam === "C" || bookParam === "D"
      ? bookParam
      : null)
  if (book === "A") {
    where.push(`p.slug = ?`)
    args.push("songs-of-faith-and-praise")
  } else if (book === "B") {
    where.push(`p.slug = ?`)
    args.push("sacred-songs-of-the-church")
  } else if (book === "C") {
    where.push(`p.slug = ?`)
    args.push("the-paperless-hymnal")
  } else if (book === "D") {
    where.push(`p.slug = ?`)
    args.push("praise-and-harmony")
  }

  if (q) {
    if (/^\d{1,4}$/.test(q)) {
      where.push(`(i.title LIKE ? OR i.title LIKE ?)`)
      args.push(`${q} ·%`, `${q} %`)
    } else {
      where.push(`i.title LIKE ?`)
      args.push(`%${q}%`)
    }
  }

  if (filter === "missing") {
    where.push(`(i.ocr_url IS NULL OR i.ocr_url NOT LIKE '%v4-gemini%')`)
  } else if (filter === "high") {
    where.push(`i.verse_count IS NOT NULL AND i.verse_count >= 7`)
  } else if (filter === "low") {
    where.push(
      `i.verse_count IS NOT NULL AND i.verse_count <= 1 AND i.page_count IS NOT NULL AND i.page_count >= 9`,
    )
  } else if (filter === "gemini") {
    where.push(`i.ocr_url LIKE '%v4-gemini%'`)
  } else if (filter === "old") {
    where.push(`i.ocr_url IS NOT NULL AND i.ocr_url NOT LIKE '%v4-gemini%'`)
  }

  args.push(limit)

  const rows = await sql.query(
    `SELECT i.id, i.pack_id, i.title, i.file_url, i.file_type, i.page_count, i.verse_count,
            i.ocr_url, i.ocr_status, i.ocr_confidence, i.sort_order,
            p.name AS pack_name, p.slug AS pack_slug
     FROM song_pack_items i
     INNER JOIN song_packs p ON p.id = i.pack_id
     WHERE ${where.join(" AND ")}
     ORDER BY
       CASE p.slug
         WHEN 'songs-of-faith-and-praise' THEN 0
         WHEN 'sacred-songs-of-the-church' THEN 1
         WHEN 'the-paperless-hymnal' THEN 2
         WHEN 'praise-and-harmony' THEN 3
         ELSE 4
       END ASC,
       CAST(
         CASE
           WHEN i.title GLOB '[0-9]*'
           THEN substr(i.title, 1, instr(i.title || ' ', ' ') - 1)
           ELSE '9999'
         END AS INTEGER
       ) ASC,
       i.title ASC
     LIMIT ?`,
    args,
  )

  const items = rows.map((row: SqlRow) => {
    const pageCount =
      row.page_count != null && row.page_count !== "" ? Number(row.page_count) : null
    const verseCount =
      row.verse_count != null && row.verse_count !== "" ? Number(row.verse_count) : null
    const conf =
      row.ocr_confidence != null && row.ocr_confidence !== ""
        ? Number(row.ocr_confidence)
        : null
    const ocrUrl = row.ocr_url
      ? toPublicMediaUrl(String(row.ocr_url)) ?? String(row.ocr_url)
      : null
    const method =
      ocrUrl?.includes("v4-gemini") ? "gemini" : ocrUrl ? "other" : "none"
    const slug = row.pack_slug != null ? String(row.pack_slug) : ""
    const bookMeta = BOOK_BY_SLUG[slug] || null
    const title = String(row.title)
    const page = pageFromTitle(title)
    const code = bookMeta?.code ?? null
    return {
      id: String(row.id),
      pack_id: String(row.pack_id),
      pack_name: row.pack_name != null ? String(row.pack_name) : undefined,
      pack_slug: slug || undefined,
      book_code: code,
      book_label: bookMeta?.label,
      page_number: page,
      title,
      admin_title: adminLabel(code, title),
      file_url: toPublicMediaUrl(String(row.file_url)) ?? String(row.file_url),
      file_type: String(row.file_type) === "pdf" ? "pdf" : "image",
      page_count: Number.isFinite(pageCount) ? pageCount : null,
      verse_count: Number.isFinite(verseCount) ? verseCount : null,
      ocr_url: ocrUrl,
      ocr_status: row.ocr_status != null ? String(row.ocr_status) : null,
      ocr_confidence: Number.isFinite(conf) ? conf : null,
      ocr_method: method,
      sort_order: Number(row.sort_order ?? 0),
    }
  })

  return NextResponse.json({
    q,
    book: book || "all",
    filter,
    count: items.length,
    items,
  })
}
