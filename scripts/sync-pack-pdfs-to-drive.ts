/**
 * Pull current CDN pack PDFs down onto PRO-G40 keep dirs.
 * Use after CDN rebakes that ran while the drive was unmounted.
 *
 *   npx tsx --env-file=.env.local scripts/sync-pack-pdfs-to-drive.ts \
 *     --pack=tph|ph|sfp|ssoc [--stale-before=ISO] [--concurrency=6] [--apply]
 *
 * Default dry-run. --stale-before only rewrites keep files older than that date
 * (or missing). Omit to sync everything.
 */
import { createClient } from "@libsql/client"
import { createWriteStream, existsSync, mkdirSync, statSync } from "fs"
import { join } from "path"
import { pipeline } from "stream/promises"
import { Readable } from "stream"

const APPLY = process.argv.includes("--apply")
const packArg = process.argv.find((a) => a.startsWith("--pack="))?.slice(7) || "tph"
const staleArg = process.argv
  .find((a) => a.startsWith("--stale-before="))
  ?.slice("--stale-before=".length)
const concArg = process.argv.find((a) => a.startsWith("--concurrency="))
const CONCURRENCY = Math.max(1, Math.min(12, Number(concArg?.split("=")[1] || 6)))
const STALE_BEFORE = staleArg ? Date.parse(staleArg) : 0

const DRIVE = "/Volumes/PRO-G40-Bradd/_cloud-work"
const PACKS: Record<string, { id: string; dir: string }> = {
  tph: { id: "d7b0b452-5467-4099-917d-f10a9d052c0b", dir: join(DRIVE, "tph-full-pdf") },
  ph: { id: "6cc2a022-d1fd-4e00-8fe5-4649018b5818", dir: join(DRIVE, "ph-full-pdf") },
  sfp: { id: "3eac16b6-fc68-43db-9d82-5cd7ccd2d5ce", dir: join(DRIVE, "sfp-full-pdf") },
  ssoc: { id: "de98d363-5295-4788-b766-5febaa4e202d", dir: join(DRIVE, "ssoc-full-pdf") },
}

async function mapPool<T>(
  items: T[],
  n: number,
  fn: (t: T) => Promise<void>,
) {
  let i = 0
  await Promise.all(
    Array.from({ length: n }, async () => {
      while (i < items.length) {
        const idx = i++
        await fn(items[idx]!)
      }
    }),
  )
}

async function main() {
  if (!existsSync(DRIVE)) {
    console.error("PRO-G40 not mounted")
    process.exit(1)
  }
  const pack = PACKS[packArg]
  if (!pack) {
    console.error("unknown pack", packArg)
    process.exit(1)
  }
  mkdirSync(pack.dir, { recursive: true })

  const db = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  })
  const rows = await db.execute({
    sql: `SELECT title, sort_order, file_url FROM song_pack_items
          WHERE pack_id=? AND file_url IS NOT NULL AND file_url != ''
          ORDER BY sort_order`,
    args: [pack.id],
  })

  type Item = { title: string; sort: number; url: string; dest: string }
  const work: Item[] = []
  for (const row of rows.rows) {
    const title = String(row.title)
    const sort = Number(row.sort_order)
    const namePart = title.replace(/^\d+\s*·\s*/, "")
    const pageNum = String(sort).padStart(3, "0")
    const dest = join(pack.dir, `${pageNum} ${namePart}.pdf`)
    let needs = !existsSync(dest)
    if (!needs && STALE_BEFORE > 0) {
      const m = statSync(dest).mtimeMs
      needs = m < STALE_BEFORE
    } else if (!STALE_BEFORE) {
      needs = true // sync all when no stale filter
    }
    if (needs) {
      work.push({ title, sort, url: String(row.file_url), dest })
    }
  }

  console.log(
    `pack=${packArg} candidates=${work.length}/${rows.rows.length} apply=${APPLY} concurrency=${CONCURRENCY} staleBefore=${staleArg || "all"}`,
  )

  let ok = 0
  let fail = 0
  await mapPool(work, CONCURRENCY, async (item) => {
    try {
      if (!APPLY) {
        console.log(`DRY ${item.title}`)
        ok++
        return
      }
      const res = await fetch(item.url)
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`)
      await pipeline(Readable.fromWeb(res.body as any), createWriteStream(item.dest))
      ok++
      if (ok % 25 === 0) console.log(`… ${ok}/${work.length}`)
    } catch (e) {
      fail++
      console.error(`FAIL ${item.title}`, e instanceof Error ? e.message : e)
    }
  })
  console.log(`done ok=${ok} fail=${fail}${APPLY ? "" : " (dry)"}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
