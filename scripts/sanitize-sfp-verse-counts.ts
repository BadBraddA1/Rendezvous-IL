/**
 * Sanitize suspect SFP verse_counts (OCR re-read our own bad title estimates)
 * and optionally rebake title slides.
 *
 *   npx tsx --env-file=.env.local scripts/sanitize-sfp-verse-counts.ts [--apply] [--rebake] [--limit=N]
 */
import { createClient } from "@libsql/client"
import { createHash } from "crypto"
import { readFileSync } from "fs"
import {
  countPdfPages,
  prependSongTitleSlide,
} from "../lib/song-pdf-title-slide"
import { estimateVerseCountFromPages } from "./verse-count-from-ocr"

const APPLY = process.argv.includes("--apply")
const REBAKE = process.argv.includes("--rebake")
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

function isSuspect(vc: number, pc: number): boolean {
  if (pc <= 1) return false
  // More verses than music slides — impossible
  if (vc > pc - 1) return true
  // OCR digit soup often invents 10–12
  if (vc >= 10) return true
  // “8 verses” on a short deck usually means we re-read our own bad estimate
  if (vc >= 8 && pc < 17) return true
  return false
}

async function main() {
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
  if (REBAKE && (!worker || !secret)) {
    console.error("R2 upload env missing (needed for --rebake)")
    process.exit(1)
  }

  const items = await db.execute({
    sql: `SELECT id, title, verse_count, page_count, file_url
          FROM song_pack_items WHERE pack_id = ? ORDER BY sort_order`,
    args: [PACK_ID],
  })

  let ok = 0
  let skip = 0
  let fail = 0
  for (const row of items.rows) {
    const vc = row.verse_count != null ? Number(row.verse_count) : 0
    const pc = row.page_count != null ? Number(row.page_count) : 0
    if (!pc || !vc || !isSuspect(vc, pc)) {
      skip++
      continue
    }
    const next = estimateVerseCountFromPages(pc)
    if (next === vc) {
      skip++
      continue
    }
    if (LIMIT > 0 && ok >= LIMIT) break

    console.log(
      `${APPLY ? "FIX" : "DRY"} ${row.title} verses ${vc} → ${next} (pages=${pc})`,
    )
    if (!APPLY) {
      ok++
      continue
    }

    if (!REBAKE) {
      await db.execute({
        sql: `UPDATE song_pack_items SET verse_count = ?, updated_at = datetime('now') WHERE id = ?`,
        args: [next, String(row.id)],
      })
      ok++
      continue
    }

    try {
      const res = await fetch(String(row.file_url))
      if (!res.ok) throw new Error(`download ${res.status}`)
      let pdfBytes = new Uint8Array(await res.arrayBuffer())
      pdfBytes = await prependSongTitleSlide(pdfBytes, String(row.title), {
        verseCount: next,
        force: true,
      })
      const pageCount = await countPdfPages(pdfBytes)
      const contentHash = createHash("sha256").update(Buffer.from(pdfBytes)).digest("hex")
      const m = String(row.title).match(/^(\d+)\s*·/)
      const pageKey = m ? m[1]!.padStart(4, "0") : "xxxx"
      const key = `song-packs/${PACK_ID}/${pageKey}-${contentHash.slice(0, 12)}.pdf`
      const put = await fetch(`${worker}/object?key=${encodeURIComponent(key)}`, {
        method: "PUT",
        headers: { "x-upload-secret": secret, "content-type": "application/pdf" },
        body: Buffer.from(pdfBytes),
      })
      if (!put.ok) throw new Error(`upload ${put.status}`)
      const newUrl = `${publicBase}/${key}`
      await db.execute({
        sql: `UPDATE song_pack_items
              SET verse_count = ?, page_count = ?, file_url = ?, content_hash = ?, byte_size = ?,
                  updated_at = datetime('now')
              WHERE id = ?`,
        args: [
          next,
          pageCount,
          newUrl,
          contentHash,
          pdfBytes.byteLength,
          String(row.id),
        ],
      })
      ok++
      console.log(`  ok ${newUrl}`)
    } catch (e) {
      fail++
      console.error("  fail", e)
    }
  }

  console.log(
    `done ok=${ok} skip=${skip} fail=${fail} apply=${APPLY} rebake=${REBAKE}`,
  )
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
