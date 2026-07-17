#!/usr/bin/env node
/**
 * Re-download family directory photos, normalize (max 1600px JPEG), re-upload,
 * and update families.photo_url. Use after huge camera uploads break cards.
 *
 * Usage:
 *   node --env-file=/tmp/ren-env-dev.local scripts/reprocess-directory-photos.mjs
 *   node --env-file=... scripts/reprocess-directory-photos.mjs --family=13
 *   node --env-file=... scripts/reprocess-directory-photos.mjs --all
 */
import { createClient } from "@libsql/client"
import { put, del } from "@vercel/blob"
import sharp from "sharp"

const MAX_EDGE = 1600
const QUALITY = 82

function argValue(name) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`))
  return hit ? hit.slice(name.length + 3) : null
}

const familyFilter = argValue("family")
const all = process.argv.includes("--all")

if (!familyFilter && !all) {
  console.error("Pass --family=<id> or --all")
  process.exit(1)
}

const url = process.env.TURSO_DATABASE_URL
const authToken = process.env.TURSO_AUTH_TOKEN
const blobToken = process.env.BLOB_READ_WRITE_TOKEN
if (!url || !authToken || !blobToken) {
  console.error("Need TURSO_DATABASE_URL, TURSO_AUTH_TOKEN, BLOB_READ_WRITE_TOKEN")
  process.exit(1)
}

const client = createClient({ url, authToken })

const sql = familyFilter
  ? {
      sql: `SELECT id, family_last_name, photo_url FROM families WHERE id = ? AND photo_url IS NOT NULL AND trim(photo_url) != ''`,
      args: [Number(familyFilter)],
    }
  : {
      sql: `SELECT id, family_last_name, photo_url FROM families WHERE photo_url IS NOT NULL AND trim(photo_url) != '' ORDER BY id`,
      args: [],
    }

const { rows } = await client.execute(sql)
console.log(`Reprocessing ${rows.length} photo(s)…`)

for (const row of rows) {
  const familyId = Number(row.id)
  const oldUrl = String(row.photo_url)
  process.stdout.write(`#${familyId} ${row.family_last_name}: `)
  try {
    const res = await fetch(oldUrl)
    if (!res.ok) throw new Error(`download ${res.status}`)
    const input = Buffer.from(await res.arrayBuffer())
    const meta = await sharp(input, { failOn: "none" }).metadata()
    const buffer = await sharp(input, { failOn: "none" })
      .rotate()
      .resize({
        width: MAX_EDGE,
        height: MAX_EDGE,
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: QUALITY, mozjpeg: true })
      .toBuffer()
    const outMeta = await sharp(buffer).metadata()
    const pathname = `family-photos/${familyId}-${Date.now()}.jpg`
    const blob = await put(pathname, buffer, {
      access: "public",
      contentType: "image/jpeg",
      addRandomSuffix: false,
      token: blobToken,
    })
    await client.execute({
      sql: `UPDATE families SET photo_url = ?, photo_updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      args: [blob.url, familyId],
    })
    if (oldUrl.includes("blob.vercel-storage.com") && oldUrl !== blob.url) {
      try {
        await del(oldUrl, { token: blobToken })
      } catch {
        // old blob may already be gone
      }
    }
    console.log(
      `${meta.width}x${meta.height} (${input.length}B) → ${outMeta.width}x${outMeta.height} (${buffer.length}B)`,
    )
  } catch (error) {
    console.log(`FAILED: ${error instanceof Error ? error.message : error}`)
  }
}

await client.close()
console.log("Done.")
