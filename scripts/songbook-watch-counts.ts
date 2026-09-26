/**
 * Print songbook watch counts for the completion watcher.
 *   npx tsx --env-file=.env.local scripts/songbook-watch-counts.ts
 *
 * ph_good_* = page_count > 2 (excludes truncated PPTX title+1 stubs)
 */
import { createClient } from "@libsql/client"
import { readFileSync } from "fs"
import { join } from "path"

function loadEnv() {
  const env: Record<string, string> = { ...process.env } as Record<
    string,
    string
  >
  try {
    for (const line of readFileSync(
      join(process.cwd(), ".env.local"),
      "utf8",
    ).split("\n")) {
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
  const env = loadEnv()
  const db = createClient({
    url: env.TURSO_DATABASE_URL!,
    authToken: env.TURSO_AUTH_TOKEN!,
  })

  for (const [k, id] of [
    ["ph", "6cc2a022-d1fd-4e00-8fe5-4649018b5818"],
    ["tph", "d7b0b452-5467-4099-917d-f10a9d052c0b"],
  ] as const) {
    const r = await db.execute({
      sql: `SELECT count(*) AS n,
              coalesce(sum(case when ocr_url like '%v4-gemini%' then 1 else 0 end), 0) AS g,
              coalesce(sum(case when page_count > 2 then 1 else 0 end), 0) AS good_n,
              coalesce(sum(case when page_count > 2 and ocr_url like '%v4-gemini%' then 1 else 0 end), 0) AS good_g
            FROM song_pack_items WHERE pack_id=?`,
      args: [id],
    })
    console.log(`${k}_n=${r.rows[0].n}`)
    console.log(`${k}_g=${r.rows[0].g}`)
    console.log(`${k}_good_n=${r.rows[0].good_n}`)
    console.log(`${k}_good_g=${r.rows[0].good_g}`)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
