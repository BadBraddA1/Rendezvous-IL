/** Tiny helper for ssoc-gemini-watchdog.sh — prints: gemini_count low_fat needs_review */
import { createClient } from "@libsql/client"

const id =
  process.env.SSOC_PACK_ID || "de98d363-5295-4788-b766-5febaa4e202d"
const db = createClient({
  url: process.env.TURSO_DATABASE_URL as string,
  authToken: process.env.TURSO_AUTH_TOKEN as string,
})

async function main() {
  const gem = await db.execute({
    sql: "SELECT COUNT(*) AS n FROM song_pack_items WHERE pack_id = ? AND ocr_url IS NOT NULL AND ocr_url != ''",
    args: [id],
  })
  const low = await db.execute({
    sql: `SELECT COUNT(*) AS n FROM song_pack_items
          WHERE pack_id = ? AND ocr_url IS NOT NULL
            AND verse_count <= 1 AND page_count >= 9`,
    args: [id],
  })
  const fails = await db.execute({
    sql: `SELECT COUNT(*) AS n FROM song_pack_items
          WHERE pack_id = ? AND ocr_status = 'needs_review'`,
    args: [id],
  })
  console.log(`${gem.rows[0].n} ${low.rows[0].n} ${fails.rows[0].n}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
