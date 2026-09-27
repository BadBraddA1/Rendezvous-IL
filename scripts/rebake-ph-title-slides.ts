/**
 * Rebake Praise & Harmony title openers using Gemini verse counts.
 * Same idea as rebake-tph-title-slides.ts — import used pages/2 guesses.
 *
 *   npx tsx --env-file=.env.local scripts/rebake-ph-title-slides.ts [--apply] [--resume] [--min-pages=3]
 */
import { createHash } from "crypto"
import { createClient } from "@libsql/client"
import { writeFileSync, mkdirSync, readFileSync, existsSync } from "fs"
import { join } from "path"
import { PDFDocument } from "pdf-lib"
import {
  countPdfPages,
  prependSongTitleSlide,
  SFP_SLIDE_WIDTH,
  SFP_SLIDE_HEIGHT,
} from "../lib/song-pdf-title-slide"

const APPLY = process.argv.includes("--apply")
const RESUME = process.argv.includes("--resume")
const limitArg = process.argv.find((a) => a.startsWith("--limit="))
const LIMIT = limitArg ? Number(limitArg.split("=")[1]) : 0
const minPagesArg = process.argv.find((a) => a.startsWith("--min-pages="))
const MIN_PAGES = minPagesArg ? Number(minPagesArg.split("=")[1]) : 3
const PACK_ID =
  process.env.PH_PACK_ID || "6cc2a022-d1fd-4e00-8fe5-4649018b5818"
const DRIVE_WORK =
  process.env.PH_DRIVE_WORK || "/Volumes/PRO-G40-Bradd/_cloud-work"
const KEEP_PDF_DIR =
  process.env.PH_KEEP_PDF_DIR || join(DRIVE_WORK, "ph-full-pdf")
const DONE_PATH = join(
  process.env.HOME || "",
  "Code/Rendezvous-IL/.tmp-ph-import/rebake-titles-done.json",
)

function canWriteKeepDir(): boolean {
  try {
    mkdirSync(KEEP_PDF_DIR, { recursive: true })
    return true
  } catch {
    console.warn("keep PDF dir unavailable:", KEEP_PDF_DIR)
    return false
  }
}

async function musicPageSize(pdfBytes: Uint8Array) {
  const doc = await PDFDocument.load(pdfBytes)
  for (let i = 0; i < doc.getPageCount(); i++) {
    const { width, height } = doc.getPage(i).getSize()
    const classic =
      Math.abs(width - SFP_SLIDE_WIDTH) < 0.5 &&
      Math.abs(height - SFP_SLIDE_HEIGHT) < 0.5
    if (classic && i === 0 && doc.getPageCount() > 1) {
      const next = doc.getPage(1).getSize()
      if (Math.abs(next.width - width) > 1 || Math.abs(next.height - height) > 1) {
        continue
      }
    }
    if (i > 0 || !classic) return { width, height }
  }
  const first = doc.getPage(0).getSize()
  return { width: first.width, height: first.height }
}

async function verseCountFromOcr(ocrUrl: string | null, fallback: number) {
  if (!ocrUrl) return fallback
  try {
    const j = (await (await fetch(ocrUrl, { cache: "no-store" })).json()) as {
      verse_count?: number
      verses?: unknown[]
    }
    const n =
      Number(j.verse_count) > 0
        ? Number(j.verse_count)
        : Array.isArray(j.verses)
          ? j.verses.length
          : 0
    if (n >= 1 && n <= 12) return n
  } catch {
    /* ignore */
  }
  return fallback
}

async function main() {
  if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
    console.error("Turso env missing")
    process.exit(1)
  }
  if (!process.env.R2_UPLOAD_WORKER_URL || !process.env.R2_UPLOAD_SECRET) {
    console.error("R2 upload env missing")
    process.exit(1)
  }

  const db = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  })
  const worker = process.env.R2_UPLOAD_WORKER_URL.replace(/\/$/, "")
  const secret = process.env.R2_UPLOAD_SECRET
  const publicBase = (
    process.env.R2_PUBLIC_BASE_URL || "https://cdn.rendezvousil.com"
  ).replace(/\/$/, "")

  const writeKeep = canWriteKeepDir()
  mkdirSync(
    join(process.env.HOME || "", "Code/Rendezvous-IL/.tmp-ph-import"),
    { recursive: true },
  )

  let done = new Set<string>()
  if (RESUME && existsSync(DONE_PATH)) {
    try {
      done = new Set(JSON.parse(readFileSync(DONE_PATH, "utf8")) as string[])
      console.log(`resume: ${done.size} already rebaked`)
    } catch {
      /* ignore */
    }
  }

  const items = await db.execute({
    sql: `SELECT id, title, file_url, verse_count, page_count, sort_order, ocr_url
          FROM song_pack_items
          WHERE pack_id = ? AND file_type = 'pdf'
            AND COALESCE(page_count, 0) >= ?
            AND ocr_url LIKE '%v4-gemini%'
          ORDER BY sort_order`,
    args: [PACK_ID, MIN_PAGES],
  })

  console.log(
    `pack=${PACK_ID} gemini_items=${items.rows.length} apply=${APPLY} resume=${RESUME} minPages=${MIN_PAGES}`,
  )

  let ok = 0
  let fail = 0
  let skipped = 0
  let n = 0
  for (const row of items.rows) {
    if (done.has(String(row.id))) {
      skipped++
      continue
    }
    if (LIMIT > 0 && n >= LIMIT) break
    n++
    const title = String(row.title)
    const fallback = Math.max(1, Math.min(12, Number(row.verse_count) || 1))
    const verseCount = await verseCountFromOcr(
      row.ocr_url ? String(row.ocr_url) : null,
      fallback,
    )
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
        `${APPLY ? "REBAKE" : "DRY"} ${title} vc=${verseCount} pages=${pageCount}`,
      )

      const pageMatch = title.match(/^(\d+)/)
      const pageNum = pageMatch ? pageMatch[1].padStart(3, "0") : "000"
      const namePart = title.replace(/^\d+\s*·\s*/, "")
      if (writeKeep) {
        writeFileSync(
          join(KEEP_PDF_DIR, `${pageNum} ${namePart}.pdf`),
          Buffer.from(withTitle),
        )
      }
      if (!APPLY) {
        ok++
        continue
      }

      const hash = createHash("sha256")
        .update(Buffer.from(withTitle))
        .digest("hex")
      const key = `song-packs/${PACK_ID}/${String(pageMatch?.[1] || n).padStart(4, "0")}-${hash.slice(0, 12)}.pdf`
      const put = await fetch(
        `${worker}/object?key=${encodeURIComponent(key)}`,
        {
          method: "PUT",
          headers: {
            "x-upload-secret": secret!,
            "content-type": "application/pdf",
          },
          body: Buffer.from(withTitle),
        },
      )
      if (!put.ok) throw new Error(`upload ${await put.text()}`)
      const fileUrl = `${publicBase}/${key}`
      await db.execute({
        sql: `UPDATE song_pack_items
              SET file_url=?, byte_size=?, content_hash=?, page_count=?,
                  verse_count=?, updated_at=datetime('now')
              WHERE id=?`,
        args: [
          fileUrl,
          withTitle.byteLength,
          hash,
          pageCount,
          verseCount,
          String(row.id),
        ],
      })
      done.add(String(row.id))
      writeFileSync(DONE_PATH, JSON.stringify([...done]))
      ok++
    } catch (e) {
      fail++
      console.error(`FAIL ${title}`, e instanceof Error ? e.message : e)
    }
  }

  await db.execute({
    sql: "UPDATE song_packs SET updated_at=datetime('now') WHERE id=?",
    args: [PACK_ID],
  })
  console.log(
    `done ok=${ok} skip=${skipped} fail=${fail}${APPLY ? "" : " (dry)"}`,
  )
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
