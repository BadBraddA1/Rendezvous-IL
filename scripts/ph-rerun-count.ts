/**
 * Count truncated-rerun nums that already have page_count > 2.
 *   NUMS_FILE=... PH_PACK_ID=... npx tsx --env-file=.env.local scripts/ph-rerun-count.ts
 */
import { createClient } from "@libsql/client"
import { readFileSync } from "fs"

async function main() {
  const numsFile = process.env.NUMS_FILE
  const packId = process.env.PH_PACK_ID
  if (!numsFile || !packId) {
    console.error("NUMS_FILE and PH_PACK_ID required")
    process.exit(2)
  }
  if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
    console.error("TURSO credentials missing")
    process.exit(2)
  }

  const nums = readFileSync(numsFile, "utf8")
    .split(/\s+/)
    .map(Number)
    .filter((n) => n > 0)

  const db = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  })

  let good = 0
  for (let i = 0; i < nums.length; i += 80) {
    const chunk = nums.slice(i, i + 80)
    const r = await db.execute({
      sql: `SELECT count(*) AS n FROM song_pack_items WHERE pack_id=? AND sort_order IN (${chunk.map(() => "?").join(",")}) AND page_count > 2`,
      args: [packId, ...chunk],
    })
    good += Number(r.rows[0].n)
  }
  console.log(good)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
