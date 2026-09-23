/**
 * Export published SFP library songs as OCR jobs for RunPod.
 *
 *   npx tsx --env-file=.env.local scripts/export-sfp-ocr-jobs.ts > /tmp/sfp-ocr-jobs.json
 */
import { createClient } from "@libsql/client"
import { readFileSync, writeFileSync } from "fs"

const PACK_ID = "3eac16b6-fc68-43db-9d82-5cd7ccd2d5ce"
const outArg = process.argv.find((a) => a.startsWith("--out="))
const OUT = outArg?.slice("--out=".length) || "/tmp/sfp-ocr-jobs.json"

function loadEnv() {
  const env: Record<string, string> = { ...process.env } as Record<string, string>
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
  return env
}

async function main() {
  const env = loadEnv()
  const db = createClient({
    url: env.TURSO_DATABASE_URL!,
    authToken: env.TURSO_AUTH_TOKEN!,
  })
  const rows = await db.execute({
    sql: `SELECT id, title, file_url, verse_count, page_count, sort_order
          FROM song_pack_items WHERE pack_id = ? ORDER BY sort_order`,
    args: [PACK_ID],
  })
  const jobs = rows.rows.map((r) => {
    const title = String(r.title)
    const m = title.match(/^(\d+)\s*·/)
    return {
      item_id: String(r.id),
      page: m ? Number(m[1]) : null,
      title,
      file_url: String(r.file_url),
      verse_count_estimate: r.verse_count != null ? Number(r.verse_count) : null,
      page_count: r.page_count != null ? Number(r.page_count) : null,
    }
  })
  writeFileSync(OUT, JSON.stringify(jobs, null, 2))
  console.log(`wrote ${jobs.length} jobs → ${OUT}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
