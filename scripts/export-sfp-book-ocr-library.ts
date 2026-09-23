/**
 * Export SFP library items for book/full-song OCR page matching.
 *
 *   npx tsx --env-file=.env.local scripts/export-sfp-book-ocr-library.ts \
 *     --out=/tmp/sfp-library.json
 */
import { createClient } from "@libsql/client"
import { writeFileSync, readFileSync } from "fs"

const PACK_ID = "3eac16b6-fc68-43db-9d82-5cd7ccd2d5ce"
const outArg = process.argv.find((a) => a.startsWith("--out="))
const OUT = outArg?.slice("--out=".length) || "/tmp/sfp-library.json"

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
  const env = loadEnv()
  const db = createClient({
    url: env.TURSO_DATABASE_URL!,
    authToken: env.TURSO_AUTH_TOKEN!,
  })
  const res = await db.execute({
    sql: `SELECT id, title, verse_count, page_count, ocr_url, ocr_status
          FROM song_pack_items WHERE pack_id = ? ORDER BY sort_order ASC`,
    args: [PACK_ID],
  })
  const items = res.rows.map((r) => {
    const title = String(r.title)
    return {
      id: String(r.id),
      item_id: String(r.id),
      title,
      page: pageFromTitle(title),
      verse_count: r.verse_count != null ? Number(r.verse_count) : null,
      page_count: r.page_count != null ? Number(r.page_count) : null,
      ocr_url: r.ocr_url != null ? String(r.ocr_url) : null,
      ocr_status: r.ocr_status != null ? String(r.ocr_status) : null,
    }
  })
  const payload = {
    pack_id: PACK_ID,
    exported_at: new Date().toISOString(),
    items,
  }
  writeFileSync(OUT, JSON.stringify(payload, null, 2))
  const withPage = items.filter((i) => i.page != null).length
  console.log(`wrote ${OUT} items=${items.length} with_page=${withPage}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
