/**
 * Persist book/full-song OCR JSONL → R2 ocr_url + verses + review status.
 *
 *   npx tsx --env-file=.env.local scripts/persist-sfp-book-ocr.ts \
 *     --from=/tmp/sfp-book-ocr.jsonl [--apply] [--limit=N] [--pilot]
 *
 * Expects rows from runpod-sfp-book-ocr/batch_book_ocr.py:
 *   { item_id?, title?, printed_page?, verses, pages, confidence, status, method }
 */
import { createClient } from "@libsql/client"
import { createReadStream, existsSync, readFileSync } from "fs"
import { createInterface } from "readline"

const APPLY = process.argv.includes("--apply")
const PILOT = process.argv.includes("--pilot")
const fromArg = process.argv.find((a) => a.startsWith("--from="))
const FROM = fromArg?.slice("--from=".length)
const limitArg = process.argv.find((a) => a.startsWith("--limit="))
const LIMIT = limitArg ? Number(limitArg.split("=")[1]) : PILOT ? 20 : 0
const PACK_ID = "3eac16b6-fc68-43db-9d82-5cd7ccd2d5ce"

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

function pageFromTitle(title: string): number | null {
  const m = title.trim().match(/^(\d{1,4})\s*[·.•\-–—]/)
  if (!m) return null
  return Number(m[1])
}

async function main() {
  if (!FROM || !existsSync(FROM)) {
    console.error("pass --from=/path/to/sfp-book-ocr.jsonl")
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

  for (const stmt of [
    `ALTER TABLE song_pack_items ADD COLUMN ocr_status TEXT`,
    `ALTER TABLE song_pack_items ADD COLUMN ocr_confidence REAL`,
  ]) {
    await db.execute(stmt).catch(() => {})
  }

  const items = await db.execute({
    sql: `SELECT id, title FROM song_pack_items WHERE pack_id = ?`,
    args: [PACK_ID],
  })
  const byId = new Map(items.rows.map((r) => [String(r.id), String(r.title)]))
  const byTitle = new Map(items.rows.map((r) => [String(r.title), String(r.id)]))
  const byPage = new Map<number, { id: string; title: string }>()
  for (const r of items.rows) {
    const title = String(r.title)
    const page = pageFromTitle(title)
    if (page != null) byPage.set(page, { id: String(r.id), title })
  }

  let ok = 0
  let miss = 0
  let fail = 0
  const rl = createInterface({ input: createReadStream(FROM), crlfDelay: Infinity })
  for await (const line of rl) {
    if (!line.trim()) continue
    let row: {
      item_id?: string
      title?: string
      printed_page?: number | null
      confidence?: number
      status?: string
      method?: string
      verse_count?: number | null
      verses?: { index: number; text: string; lines?: string[] }[]
      pages?: { index: number; text: string; confidence?: number }[]
      matched?: boolean
      error?: string
    }
    try {
      row = JSON.parse(line)
    } catch {
      fail++
      continue
    }

    let id: string | null =
      (row.item_id && byId.has(row.item_id) ? row.item_id : null) ||
      (row.title ? byTitle.get(row.title) || null : null)
    if (!id && row.printed_page != null && byPage.has(Number(row.printed_page))) {
      id = byPage.get(Number(row.printed_page))!.id
    }
    if (!id) {
      miss++
      console.log(`MISS page=${row.printed_page} title=${row.title}`)
      continue
    }
    if (LIMIT > 0 && ok >= LIMIT) break

    const title = byId.get(id) || row.title || ""
    const status = row.status === "needs_review" ? "needs_review" : "auto"
    const confidence = Number(row.confidence) || 0
    const verses = Array.isArray(row.verses) ? row.verses : []
    const pages = Array.isArray(row.pages) ? row.pages : []
    // Also expose pages[] derived from verses for older clients
    const pagesFromVerses =
      pages.length > 0
        ? pages
        : verses.map((v) => ({
            index: Math.max(0, Number(v.index) - 1),
            text: v.text,
            confidence,
          }))

    const payload = {
      item_id: id,
      title,
      printed_page: row.printed_page ?? null,
      method: row.method || "paddleocr_book_scan",
      confidence,
      status,
      verse_count: row.verse_count ?? (verses.length || null),
      verses,
      pages: pagesFromVerses,
      error: row.error,
    }

    console.log(
      `${APPLY ? "PERSIST" : "DRY"} ${title} conf=${confidence.toFixed(2)} status=${status} verses=${verses.length}`,
    )
    if (!APPLY) {
      ok++
      continue
    }

    const key = `song-packs/${PACK_ID}/ocr/${id}.v3-clean.json`
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
      console.error("  upload fail", put.status)
      fail++
      continue
    }
    const ocrUrl = `${publicBase}/${key}`
    await db.execute({
      sql: `UPDATE song_pack_items
            SET ocr_url = ?,
                ocr_status = ?,
                ocr_confidence = ?,
                updated_at = datetime('now')
            WHERE id = ?`,
      args: [ocrUrl, status, confidence, id],
    })
    ok++
  }
  console.log(`done ok=${ok} miss=${miss} fail=${fail} apply=${APPLY}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
