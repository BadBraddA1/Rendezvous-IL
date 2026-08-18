/**
 * Rewrite stored Vercel Blob URLs to their Cloudflare R2 equivalents.
 *
 * Objects were copied to R2 with identical keys, so the rewrite is a host swap.
 *
 *   npx tsx scripts/backfill-media-urls.ts [--apply]
 *   npx tsx scripts/backfill-media-urls.ts --rollback <journal.json> [--apply]
 */
import { readFileSync, writeFileSync } from "node:fs"
import { sql } from "@/lib/db"
import { mediaKeyFromUrl, r2PublicUrl } from "@/lib/media-keys"

const BLOB_HOST = "blob.vercel-storage.com"
const APPLY = process.argv.includes("--apply")
const ROLLBACK = process.argv.includes("--rollback")
const journalArg = process.argv.find((a, i) => process.argv[i - 1] === "--rollback")

type Change = { table: string; id: string; column: string; from: string; to: string }

function rewrite(url: string): string | null {
  if (!url.includes(BLOB_HOST)) return null
  const key = mediaKeyFromUrl(url)
  if (!key) return null
  return r2PublicUrl(key)
}

function rewriteJsonList(raw: string): string | null {
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return null
    let changed = false
    const next = parsed.map((item) => {
      if (typeof item !== "string") return item
      const rewritten = rewrite(item)
      if (rewritten && rewritten !== item) {
        changed = true
        return rewritten
      }
      return item
    })
    return changed ? JSON.stringify(next) : null
  } catch {
    return null
  }
}

async function writeChanges(changes: Change[]): Promise<number> {
  let written = 0
  for (const change of changes) {
    if (change.table === "families" && change.column === "photo_url") {
      await sql`UPDATE families SET photo_url = ${change.to} WHERE id = ${Number(change.id)} AND photo_url = ${change.from}`
    } else if (change.table === "live_updates_photos" && change.column === "image_url") {
      await sql`UPDATE live_updates_photos SET image_url = ${change.to} WHERE id = ${change.id} AND image_url = ${change.from}`
    } else if (change.table === "song_pack_items" && change.column === "file_url") {
      await sql`UPDATE song_pack_items SET file_url = ${change.to} WHERE id = ${change.id} AND file_url = ${change.from}`
    } else if (change.table === "chat_messages" && change.column === "image_url") {
      await sql`UPDATE chat_messages SET image_url = ${change.to} WHERE id = ${change.id} AND image_url = ${change.from}`
    } else if (change.table === "chat_messages" && change.column === "image_urls") {
      await sql`UPDATE chat_messages SET image_urls = ${change.to} WHERE id = ${change.id} AND image_urls = ${change.from}`
    } else {
      throw new Error(`unknown change ${change.table}.${change.column}`)
    }
    written += 1
  }
  return written
}

async function rollback() {
  if (!journalArg) {
    console.error("usage: tsx scripts/backfill-media-urls.ts --rollback <journal.json> [--apply]")
    process.exit(1)
  }
  const journal = JSON.parse(readFileSync(journalArg, "utf8")) as Change[]
  const reversed = journal.map((c) => ({ ...c, from: c.to, to: c.from }))
  console.log(`rollback journal: ${reversed.length} changes\nmode: ${APPLY ? "APPLY" : "dry run"}\n`)
  for (const change of reversed) {
    console.log(`  ${change.table}.${change.column} [${change.id}]`)
    console.log(`      - ${change.from}`)
    console.log(`      + ${change.to}`)
  }
  if (!APPLY) {
    console.log("\nDry run only. Re-run with --apply to restore.")
    return
  }
  console.log(`\nrestored ${await writeChanges(reversed)} rows`)
}

async function main() {
  if (ROLLBACK) return rollback()

  const planned: Change[] = []
  const unmatched: { table: string; id: string; url: string }[] = []

  const families = (await sql`
    SELECT id, photo_url FROM families
    WHERE photo_url LIKE ${"%" + BLOB_HOST + "%"}
  `) as { id: number; photo_url: string }[]

  for (const row of families) {
    const to = rewrite(row.photo_url)
    if (!to) unmatched.push({ table: "families", id: String(row.id), url: row.photo_url })
    else planned.push({ table: "families", id: String(row.id), column: "photo_url", from: row.photo_url, to })
  }

  try {
    const photos = (await sql`
      SELECT id, image_url FROM live_updates_photos
      WHERE image_url LIKE ${"%" + BLOB_HOST + "%"}
    `) as { id: string; image_url: string }[]
    for (const row of photos) {
      const to = rewrite(row.image_url)
      if (!to) unmatched.push({ table: "live_updates_photos", id: row.id, url: row.image_url })
      else planned.push({ table: "live_updates_photos", id: row.id, column: "image_url", from: row.image_url, to })
    }
  } catch {
    console.log("(no live_updates_photos table yet)")
  }

  try {
    const items = (await sql`
      SELECT id, file_url FROM song_pack_items
      WHERE file_url LIKE ${"%" + BLOB_HOST + "%"}
    `) as { id: string; file_url: string }[]
    for (const row of items) {
      const to = rewrite(row.file_url)
      if (!to) unmatched.push({ table: "song_pack_items", id: row.id, url: row.file_url })
      else planned.push({ table: "song_pack_items", id: row.id, column: "file_url", from: row.file_url, to })
    }
  } catch {
    console.log("(no song_pack_items table yet)")
  }

  try {
    const messages = (await sql`
      SELECT id, image_url, image_urls FROM chat_messages
      WHERE image_url LIKE ${"%" + BLOB_HOST + "%"}
         OR image_urls LIKE ${"%" + BLOB_HOST + "%"}
    `) as { id: string; image_url: string | null; image_urls: string | null }[]
    for (const row of messages) {
      if (row.image_url?.includes(BLOB_HOST)) {
        const to = rewrite(row.image_url)
        if (!to) unmatched.push({ table: "chat_messages", id: row.id, url: row.image_url })
        else planned.push({ table: "chat_messages", id: row.id, column: "image_url", from: row.image_url, to })
      }
      if (row.image_urls?.includes(BLOB_HOST)) {
        const to = rewriteJsonList(row.image_urls)
        if (!to) unmatched.push({ table: "chat_messages", id: `${row.id}:image_urls`, url: row.image_urls })
        else planned.push({ table: "chat_messages", id: row.id, column: "image_urls", from: row.image_urls, to })
      }
    }
  } catch {
    console.log("(no chat_messages table yet)")
  }

  console.log(`mode: ${APPLY ? "APPLY" : "dry run"}`)
  console.log(`planned updates: ${planned.length}`)
  console.log(`unmatched:       ${unmatched.length}\n`)
  for (const change of planned) {
    console.log(`  ${change.table}.${change.column} [${change.id}]`)
    console.log(`      - ${change.from}`)
    console.log(`      + ${change.to}`)
  }
  if (unmatched.length) {
    console.log("\nUNMATCHED — left untouched:")
    for (const miss of unmatched) console.log(`  ${miss.table} [${miss.id}] ${miss.url}`)
  }
  if (!APPLY) {
    console.log("\nDry run only. Re-run with --apply to write.")
    return
  }
  const journal = `scripts/backfill-media-urls-rollback-${Date.now()}.json`
  writeFileSync(journal, JSON.stringify(planned, null, 2))
  console.log(`\nrollback journal -> ${journal}`)
  console.log(`wrote ${await writeChanges(planned)} rows`)
}

main().catch((err) => {
  console.error("backfill failed:", err)
  process.exit(1)
})
