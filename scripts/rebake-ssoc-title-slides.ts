/**
 * Rebake Sacred Songs title openers using Gemini verse_count from Turso.
 * Matches music page size (usually 960×540) so titles aren't tiny inset cards.
 *
 *   npx tsx --env-file=.env.local scripts/rebake-ssoc-title-slides.ts [--apply] [--limit=N]
 */
import { createHash } from "crypto"
import { createClient } from "@libsql/client"
import { writeFileSync, mkdirSync } from "fs"
import { join } from "path"
import { PDFDocument } from "pdf-lib"
import {
  countPdfPages,
  prependSongTitleSlide,
} from "../lib/song-pdf-title-slide"

const APPLY = process.argv.includes("--apply")
const limitArg = process.argv.find((a) => a.startsWith("--limit="))
const LIMIT = limitArg ? Number(limitArg.split("=")[1]) : 0
const PACK_ID =
  process.env.SSOC_PACK_ID || "de98d363-5295-4788-b766-5febaa4e202d"
const KEEP_PDF_DIR =
  process.env.SSOC_KEEP_PDF_DIR ||
  join(process.env.HOME || "", "Code/ssoc-full-pdf")

async function musicPageSize(
  pdfBytes: Uint8Array,
): Promise<{ width: number; height: number }> {
  // After strip of title cards, page 0 is music — but we detect from any
  // non-720×405 page in the raw PDF (title is 720×405 today).
  const doc = await PDFDocument.load(pdfBytes)
  for (let i = 0; i < doc.getPageCount(); i++) {
    const { width, height } = doc.getPage(i).getSize()
    if (Math.abs(width - 720) > 1 || Math.abs(height - 405) > 1) {
      return { width, height }
    }
  }
  // Fallback widescreen
  return { width: 960, height: 540 }
}

async function main() {
  const env = process.env
  if (!env.TURSO_DATABASE_URL || !env.TURSO_AUTH_TOKEN) {
    console.error("Turso env missing")
    process.exit(1)
  }
  if (!env.R2_UPLOAD_WORKER_URL || !env.R2_UPLOAD_SECRET) {
    console.error("R2 upload env missing")
    process.exit(1)
  }

  const db = createClient({
    url: env.TURSO_DATABASE_URL,
    authToken: env.TURSO_AUTH_TOKEN,
  })
  const worker = env.R2_UPLOAD_WORKER_URL.replace(/\/$/, "")
  const secret = env.R2_UPLOAD_SECRET
  const publicBase = (env.R2_PUBLIC_BASE_URL || "https://cdn.rendezvousil.com").replace(
    /\/$/,
    "",
  )

  mkdirSync(KEEP_PDF_DIR, { recursive: true })

  const items = await db.execute({
    sql: `SELECT id, title, file_url, verse_count, page_count, sort_order
          FROM song_pack_items
          WHERE pack_id = ? AND file_type = 'pdf'
          ORDER BY sort_order`,
    args: [PACK_ID],
  })

  console.log(
    `pack=${PACK_ID} items=${items.rows.length} apply=${APPLY} limit=${LIMIT || "all"}`,
  )

  let ok = 0
  let fail = 0
  let n = 0
  for (const row of items.rows) {
    if (LIMIT > 0 && n >= LIMIT) break
    n++
    const title = String(row.title)
    const verseCount = Math.max(1, Math.min(12, Number(row.verse_count) || 1))
    try {
      const res = await fetch(String(row.file_url))
      if (!res.ok) throw new Error(`fetch ${res.status}`)
      const original = new Uint8Array(await res.arrayBuffer())
      const size = await musicPageSize(original)
      const withTitle = await prependSongTitleSlide(original, title, {
        verseCount,
        force: true,
        slideWidth: size.width,
        slideHeight: size.height,
      })
      const pageCount = await countPdfPages(withTitle)
      console.log(
        `${APPLY ? "REBAKE" : "DRY"} ${title} vc=${verseCount} slide=${Math.round(size.width)}x${Math.round(size.height)} pages=${pageCount}`,
      )

      // Keep local copy for Gemini / inspection
      const pageMatch = title.match(/^(\d+)/)
      const pageNum = pageMatch ? pageMatch[1].padStart(3, "0") : "000"
      const namePart = title.replace(/^\d+\s*·\s*/, "")
      writeFileSync(
        join(KEEP_PDF_DIR, `${pageNum} ${namePart}.pdf`),
        Buffer.from(withTitle),
      )

      if (!APPLY) {
        ok++
        continue
      }

      const hash = createHash("sha256").update(Buffer.from(withTitle)).digest("hex")
      const key = `song-packs/${PACK_ID}/${String(pageMatch?.[1] || n).padStart(4, "0")}-${hash.slice(0, 12)}.pdf`
      const put = await fetch(`${worker}/object?key=${encodeURIComponent(key)}`, {
        method: "PUT",
        headers: { "x-upload-secret": secret, "content-type": "application/pdf" },
        body: Buffer.from(withTitle),
      })
      if (!put.ok) throw new Error(`upload ${await put.text()}`)
      const fileUrl = `${publicBase}/${key}`
      await db.execute({
        sql: `UPDATE song_pack_items
              SET file_url = ?, byte_size = ?, content_hash = ?, page_count = ?,
                  verse_count = ?, updated_at = datetime('now')
              WHERE id = ?`,
        args: [
          fileUrl,
          withTitle.byteLength,
          hash,
          pageCount,
          verseCount,
          String(row.id),
        ],
      })
      ok++
    } catch (e) {
      fail++
      console.error(`FAIL ${title}`, e instanceof Error ? e.message : e)
    }
  }

  await db.execute({
    sql: "UPDATE song_packs SET updated_at = datetime('now') WHERE id = ?",
    args: [PACK_ID],
  })
  console.log(`done ok=${ok} fail=${fail}${APPLY ? "" : " (dry — pass --apply)"}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
