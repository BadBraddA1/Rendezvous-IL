/**
 * Sync `verse_count` from cleaned book OCR JSONL into Turso, and optionally
 * rebake white PDF title slides so the opener shows the correct “N verses”.
 *
 *   npx tsx --env-file=.env.local scripts/sync-sfp-verses-from-ocr.ts \
 *     --from=/tmp/sfp-book-ocr-clean.jsonl [--apply] [--rebake] [--limit=N]
 *
 * Source PPT title bake (when PRO-G40 is mounted) still uses Turso via:
 *   npx tsx --env-file=.env.local scripts/bake-sfp-title-slides.ts --all --apply --force
 */
import { createClient } from "@libsql/client"
import { createHash } from "crypto"
import { createReadStream, existsSync, readFileSync } from "fs"
import { createInterface } from "readline"
import {
  countPdfPages,
  prependSongTitleSlide,
} from "../lib/song-pdf-title-slide"

const APPLY = process.argv.includes("--apply")
const REBAKE = process.argv.includes("--rebake")
const fromArg = process.argv.find((a) => a.startsWith("--from="))
const FROM = fromArg?.split("=")[1] || "/tmp/sfp-book-ocr-clean.jsonl"
const limitArg = process.argv.find((a) => a.startsWith("--limit="))
const LIMIT = limitArg ? Number(limitArg.split("=")[1]) : 0
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

function verseCountFromRow(row: {
  verse_count?: number | null
  verses?: { text?: string }[]
  status?: string
}): number | null {
  const verses = Array.isArray(row.verses) ? row.verses : []
  const sung = verses.filter((v) => {
    const t = (v.text || "").trim()
    return t.length > 0 && !t.startsWith("Chorus")
  })
  if (row.verse_count != null && Number(row.verse_count) > 0) {
    return Math.max(1, Math.min(12, Math.floor(Number(row.verse_count))))
  }
  if (sung.length > 0) {
    return Math.max(1, Math.min(12, sung.length))
  }
  return null
}

async function main() {
  if (!existsSync(FROM)) {
    console.error("missing --from=", FROM)
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
  if (REBAKE && APPLY && (!worker || !secret)) {
    console.error("R2 upload env missing (needed for --rebake)")
    process.exit(1)
  }

  const items = await db.execute({
    sql: `SELECT id, title, verse_count, page_count, file_url, file_type
          FROM song_pack_items WHERE pack_id = ?`,
    args: [PACK_ID],
  })
  const byId = new Map(items.rows.map((r) => [String(r.id), r]))
  const byTitle = new Map(items.rows.map((r) => [String(r.title), r]))
  const byPage = new Map<number, (typeof items.rows)[0]>()
  for (const r of items.rows) {
    const m = String(r.title).match(/^(\d+)\s*·/)
    if (m) byPage.set(Number(m[1]), r)
  }

  let ok = 0
  let skip = 0
  let fail = 0
  let same = 0

  const rl = createInterface({ input: createReadStream(FROM), crlfDelay: Infinity })
  for await (const line of rl) {
    if (!line.trim()) continue
    let row: {
      item_id?: string
      title?: string
      printed_page?: number | null
      verse_count?: number | null
      verses?: { text?: string }[]
      status?: string
    }
    try {
      row = JSON.parse(line)
    } catch {
      fail++
      continue
    }

    const next = verseCountFromRow(row)
    if (next == null) {
      skip++
      continue
    }

    const item =
      (row.item_id && byId.get(row.item_id)) ||
      (row.title ? byTitle.get(row.title) : undefined) ||
      (row.printed_page != null ? byPage.get(Number(row.printed_page)) : undefined)
    if (!item) {
      skip++
      continue
    }

    const dbVc = item.verse_count != null ? Number(item.verse_count) : null
    if (dbVc === next) {
      same++
      continue
    }
    if (LIMIT > 0 && ok >= LIMIT) break

    console.log(
      `${APPLY ? "FIX" : "DRY"} ${item.title} verses ${dbVc ?? "?"} → ${next}${REBAKE ? " +rebake" : ""}`,
    )
    if (!APPLY) {
      ok++
      continue
    }

    if (!REBAKE || String(item.file_type) !== "pdf") {
      await db.execute({
        sql: `UPDATE song_pack_items SET verse_count = ?, updated_at = datetime('now') WHERE id = ?`,
        args: [next, String(item.id)],
      })
      ok++
      continue
    }

    try {
      const res = await fetch(String(item.file_url))
      if (!res.ok) throw new Error(`download ${res.status}`)
      let pdfBytes = new Uint8Array(await res.arrayBuffer())
      pdfBytes = await prependSongTitleSlide(pdfBytes, String(item.title), {
        verseCount: next,
        force: true,
      })
      const pageCount = await countPdfPages(pdfBytes)
      const contentHash = createHash("sha256").update(Buffer.from(pdfBytes)).digest("hex")
      const m = String(item.title).match(/^(\d+)\s*·/)
      const pageKey = m ? m[1]!.padStart(4, "0") : "xxxx"
      const key = `song-packs/${PACK_ID}/${pageKey}-${contentHash.slice(0, 12)}.pdf`
      const put = await fetch(`${worker}/object?key=${encodeURIComponent(key)}`, {
        method: "PUT",
        headers: { "x-upload-secret": secret, "content-type": "application/pdf" },
        body: Buffer.from(pdfBytes),
      })
      if (!put.ok) throw new Error(`upload ${put.status}`)
      const newUrl = `${publicBase}/${key}`
      await db.execute({
        sql: `UPDATE song_pack_items
              SET verse_count = ?, page_count = ?, file_url = ?, content_hash = ?, byte_size = ?,
                  updated_at = datetime('now')
              WHERE id = ?`,
        args: [
          next,
          pageCount,
          newUrl,
          contentHash,
          pdfBytes.byteLength,
          String(item.id),
        ],
      })
      // Keep in-memory maps current if the same title appears twice (shouldn't).
      ;(item as { verse_count: number }).verse_count = next
      ok++
      console.log(`  ok`)
    } catch (e) {
      fail++
      console.error("  fail", e)
    }
  }

  console.log(
    `done ok=${ok} same=${same} skip=${skip} fail=${fail} apply=${APPLY} rebake=${REBAKE}`,
  )
  if (!APPLY) {
    console.log("Pass --apply to write Turso; add --rebake to rewrite PDF title slides on R2.")
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
