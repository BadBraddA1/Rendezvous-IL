/**
 * Persist RunPod fulltext OCR: upload per-song page text JSON to R2 and store
 * ocr_url + verse_count (+ optional verse_pages) on song_pack_items.
 *
 * Fulltext JSONL lines look like:
 *   { "title", "page", "verse_count", "page_count", "pages": [{ "index", "text" }], "method" }
 *
 *   npx tsx --env-file=.env.local scripts/persist-sfp-ocr.ts \
 *     --from=/tmp/sfp-fulltext.jsonl [--apply] [--limit=N]
 */
import { createClient } from "@libsql/client"
import { existsSync, readFileSync } from "fs"
import { createInterface } from "readline"
import { createReadStream } from "fs"
import { verseCountFromTitleLabel } from "./verse-count-from-ocr"

const APPLY = process.argv.includes("--apply")
const fromArg = process.argv.find((a) => a.startsWith("--from="))
const FROM = fromArg?.slice("--from=".length)
const limitArg = process.argv.find((a) => a.startsWith("--limit="))
const LIMIT = limitArg ? Number(limitArg.split("=")[1]) : 0
const PACK_ID = "3eac16b6-fc68-43db-9d82-5cd7ccd2d5ce"

type OcrPage = { index: number; text: string }
type OcrRow = {
  title?: string
  page?: number
  verse_count?: number
  page_count?: number
  pages?: OcrPage[]
  method?: string
  verse_pages?: number[]
}

function loadEnv() {
  const env: Record<string, string> = { ...process.env } as Record<string, string>
  try {
    for (const line of readFileSync(".env.local", "utf8").split("\n")) {
      if (!line || line.startsWith("#") || !line.includes("=")) continue
      const i = line.indexOf("=")
      const k = line.slice(0, i).trim()
      let v = line.slice(i + 1).trim()
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      ) {
        v = v.slice(1, -1)
      }
      env[k] = v
    }
  } catch {
    /* ignore */
  }
  return env
}

/** Guess verse start pages from OCR labels ("1 ", "2.", etc.) on music pages. */
function inferVersePages(pages: OcrPage[]): number[] | null {
  const starts: number[] = []
  const seen = new Set<number>()
  for (const p of pages) {
    if (p.index === 0) continue // title slide
    const text = (p.text || "").replace(/\f/g, "\n")
    // Leading verse numeral at start of a line (sheet music OCR is noisy)
    const m = text.match(/(?:^|\n)\s*([1-8])(?:\s|[.)])/m)
    if (!m) continue
    const v = Number(m[1])
    if (!Number.isFinite(v) || v < 1 || v > 8 || seen.has(v)) continue
    // Only accept ascending verse order
    if (starts.length > 0 && v <= starts[starts.length - 1]!) continue
    seen.add(v)
    starts.push(p.index)
  }
  return starts.length > 0 ? starts : null
}

async function main() {
  if (!FROM || !existsSync(FROM)) {
    console.error("pass --from=/path/to/sfp-fulltext.jsonl")
    process.exit(1)
  }

  const env = loadEnv()
  const db = createClient({
    url: env.TURSO_DATABASE_URL!,
    authToken: env.TURSO_AUTH_TOKEN!,
  })
  const worker = (env.R2_UPLOAD_WORKER_URL || "").replace(/\/$/, "")
  const secret = env.R2_UPLOAD_SECRET || ""
  const publicBase = (env.R2_PUBLIC_BASE_URL || "https://cdn.rendezvousil.com").replace(
    /\/$/,
    "",
  )
  if (!worker || !secret) {
    console.error("R2 upload env missing")
    process.exit(1)
  }

  await db.execute(`ALTER TABLE song_pack_items ADD COLUMN ocr_url TEXT`).catch(() => {})

  const items = await db.execute({
    sql: `SELECT id, title, verse_count, ocr_url, sort_order
          FROM song_pack_items WHERE pack_id = ? ORDER BY sort_order`,
    args: [PACK_ID],
  })
  const byTitle = new Map<string, (typeof items.rows)[0]>()
  const byPage = new Map<number, (typeof items.rows)[0]>()
  for (const row of items.rows) {
    const title = String(row.title)
    byTitle.set(title, row)
    const m = title.match(/^(\d+)\s*·/)
    if (m) byPage.set(Number(m[1]), row)
  }

  let ok = 0
  let skip = 0
  let fail = 0
  let missing = 0

  const rl = createInterface({ input: createReadStream(FROM), crlfDelay: Infinity })
  for await (const line of rl) {
    if (!line.trim()) continue
    let row: OcrRow
    try {
      row = JSON.parse(line) as OcrRow
    } catch {
      fail++
      continue
    }
    const title = String(row.title || "")
    const page = row.page != null ? Number(row.page) : null
    const item =
      (title && byTitle.get(title)) ||
      (page != null && Number.isFinite(page) ? byPage.get(page) : undefined)
    if (!item) {
      missing++
      continue
    }

    const verseCount =
      verseCountFromTitleLabel(pages) ??
      (row.verse_count != null && Number.isFinite(Number(row.verse_count))
        ? Math.max(1, Math.min(12, Math.floor(Number(row.verse_count))))
        : null)
    const pages = Array.isArray(row.pages)
      ? row.pages.map((p) => ({
          index: Number(p.index),
          text: String(p.text || ""),
        }))
      : []
    const versePages =
      (Array.isArray(row.verse_pages) && row.verse_pages.length > 0
        ? row.verse_pages.map((n) => Math.floor(Number(n))).filter((n) => n >= 0)
        : null) || inferVersePages(pages)

    const payload = {
      item_id: String(item.id),
      title: String(item.title),
      page: page,
      verse_count: verseCount,
      page_count: row.page_count ?? pages.length,
      method: row.method || "ocr",
      pages,
      verse_pages: versePages,
    }

    const already = item.ocr_url != null && String(item.ocr_url).length > 0
    const sameVerse =
      verseCount != null &&
      item.verse_count != null &&
      Number(item.verse_count) === verseCount
    if (already && sameVerse && !APPLY) {
      skip++
      continue
    }
    if (LIMIT > 0 && ok >= LIMIT) break

    console.log(
      `${APPLY ? "PERSIST" : "DRY"} ${item.title} verses=${verseCount ?? "?"} pages=${pages.length} verse_pages=${versePages ? versePages.join(",") : "-"}`,
    )
    if (!APPLY) {
      ok++
      continue
    }

    const key = `song-packs/${PACK_ID}/ocr/${String(item.id)}.json`
    const body = Buffer.from(JSON.stringify(payload), "utf8")
    const put = await fetch(`${worker}/object?key=${encodeURIComponent(key)}`, {
      method: "PUT",
      headers: {
        "x-upload-secret": secret,
        "content-type": "application/json",
      },
      body,
    })
    if (!put.ok) {
      console.error("  upload fail", put.status, await put.text().catch(() => ""))
      fail++
      continue
    }
    const ocrUrl = `${publicBase}/${key}`
    const versePagesJson =
      versePages && versePages.length > 0 ? JSON.stringify(versePages) : null

    await db.execute({
      sql: `UPDATE song_pack_items
            SET ocr_url = ?,
                verse_count = COALESCE(?, verse_count),
                verse_pages = COALESCE(?, verse_pages),
                updated_at = datetime('now')
            WHERE id = ?`,
      args: [ocrUrl, verseCount, versePagesJson, String(item.id)],
    })
    ok++
  }

  console.log(
    `done ok=${ok} skip=${skip} fail=${fail} missing=${missing} apply=${APPLY}`,
  )
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
