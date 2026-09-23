/**
 * Persist lyric-band OCR JSONL → R2 ocr_url + review status on song_pack_items.
 *
 *   npx tsx --env-file=.env.local scripts/persist-sfp-lyric-ocr.ts \
 *     --from=/tmp/sfp-lyric-ocr.jsonl [--apply] [--limit=N]
 */
import { createClient } from "@libsql/client"
import { createReadStream, existsSync, readFileSync } from "fs"
import { createInterface } from "readline"

const APPLY = process.argv.includes("--apply")
const fromArg = process.argv.find((a) => a.startsWith("--from="))
const FROM = fromArg?.slice("--from=".length)
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

async function main() {
  if (!FROM || !existsSync(FROM)) {
    console.error("pass --from=/path/to/sfp-lyric-ocr.jsonl")
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
  const byTitle = new Map(items.rows.map((r) => [String(r.title), String(r.id)]))
  const byId = new Map(items.rows.map((r) => [String(r.id), String(r.title)]))

  let ok = 0
  let miss = 0
  let fail = 0
  const rl = createInterface({ input: createReadStream(FROM), crlfDelay: Infinity })
  for await (const line of rl) {
    if (!line.trim()) continue
    let row: {
      item_id?: string
      title?: string
      confidence?: number
      status?: string
      pages?: { index: number; text: string; confidence?: number }[]
      method?: string
      bands?: unknown
      error?: string
    }
    try {
      row = JSON.parse(line)
    } catch {
      fail++
      continue
    }
    const id =
      (row.item_id && byId.has(row.item_id) ? row.item_id : null) ||
      (row.title ? byTitle.get(row.title) : null)
    if (!id) {
      miss++
      continue
    }
    if (LIMIT > 0 && ok >= LIMIT) break

    const status = row.status === "needs_review" ? "needs_review" : "auto"
    const confidence = Number(row.confidence) || 0
    const payload = {
      item_id: id,
      title: row.title,
      method: row.method || "lyric_band_vision",
      confidence,
      status,
      bands: row.bands,
      pages: row.pages || [],
      error: row.error,
    }

    console.log(
      `${APPLY ? "PERSIST" : "DRY"} ${row.title} conf=${confidence.toFixed(2)} status=${status} pages=${payload.pages.length}`,
    )
    if (!APPLY) {
      ok++
      continue
    }

    const key = `song-packs/${PACK_ID}/ocr/${id}.json`
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
