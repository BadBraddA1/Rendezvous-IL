/**
 * Prepend title slides to existing song PDF items (pilot / bulk).
 *
 *   npx tsx --env-file=.env.local scripts/prepend-song-title-slides.ts [--pack-slug=sfp-pilot-10] [--apply]
 */
import { createHash } from "crypto"
import { createClient } from "@libsql/client"
import { readFileSync } from "fs"
import { prependSongTitleSlide } from "../lib/song-pdf-title-slide"

function loadEnv() {
  const env: Record<string, string> = { ...process.env } as Record<string, string>
  try {
    for (const line of readFileSync(".env.local", "utf8").split("\n")) {
      if (!line || line.startsWith("#") || !line.includes("=")) continue
      const i = line.indexOf("=")
      let k = line.slice(0, i).trim()
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
    /* use process.env */
  }
  return env
}

const APPLY = process.argv.includes("--apply")
const slugArg = process.argv.find((a) => a.startsWith("--pack-slug="))
const PACK_SLUG = slugArg?.split("=")[1] || "sfp-pilot-10"

async function main() {
  const env = loadEnv()
  const db = createClient({
    url: env.TURSO_DATABASE_URL!,
    authToken: env.TURSO_AUTH_TOKEN!,
  })
  const worker = env.R2_UPLOAD_WORKER_URL!.replace(/\/$/, "")
  const secret = env.R2_UPLOAD_SECRET!
  const publicBase = (env.R2_PUBLIC_BASE_URL || "https://cdn.rendezvousil.com").replace(
    /\/$/,
    "",
  )

  const packs = await db.execute({
    sql: "SELECT id, name FROM song_packs WHERE slug = ? LIMIT 1",
    args: [PACK_SLUG],
  })
  const pack = packs.rows[0]
  if (!pack) {
    console.error("pack not found", PACK_SLUG)
    process.exit(1)
  }

  const items = await db.execute({
    sql: "SELECT id, title, file_url, file_type FROM song_pack_items WHERE pack_id = ? ORDER BY sort_order",
    args: [pack.id],
  })

  console.log(`pack=${pack.name} items=${items.rows.length} apply=${APPLY}`)

  for (const row of items.rows) {
    if (String(row.file_type) !== "pdf") {
      console.log("skip non-pdf", row.title)
      continue
    }
    const url = String(row.file_url)
    const res = await fetch(url)
    if (!res.ok) {
      console.error("fetch fail", row.title, res.status)
      continue
    }
    const bytes = new Uint8Array(await res.arrayBuffer())
    const withTitle = await prependSongTitleSlide(bytes, String(row.title))
    if (withTitle.byteLength === bytes.byteLength) {
      console.log("already has title slide?", row.title)
      continue
    }
    const hash = createHash("sha256").update(Buffer.from(withTitle)).digest("hex")
    const key = `song-packs/${pack.id}/${Date.now()}-${hash.slice(0, 12)}.pdf`
    console.log(`${APPLY ? "PUT" : "dry"} ${row.title} ${bytes.byteLength}→${withTitle.byteLength}`)
    if (!APPLY) continue

    const put = await fetch(`${worker}/object?key=${encodeURIComponent(key)}`, {
      method: "PUT",
      headers: { "x-upload-secret": secret, "content-type": "application/pdf" },
      body: Buffer.from(withTitle),
    })
    if (!put.ok) {
      console.error("upload fail", await put.text())
      continue
    }
    const newUrl = `${publicBase}/${key}`
    await db.execute({
      sql: `UPDATE song_pack_items
            SET file_url = ?, byte_size = ?, content_hash = ?, updated_at = datetime('now')
            WHERE id = ?`,
      args: [newUrl, withTitle.byteLength, hash, row.id],
    })
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
