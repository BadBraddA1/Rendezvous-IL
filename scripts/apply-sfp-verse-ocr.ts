/**
 * Phase 2: apply RunPod (or local) OCR verse counts, rebuild title slides, re-upload PDFs.
 *
 * Input JSON: [{ "page": 4, "verse_count": 2 }, ...] or { "4": 2, ... }
 *
 *   npx tsx --env-file=.env.local scripts/apply-sfp-verse-ocr.ts --from=/tmp/sfp-verse-ocr.json [--apply] [--limit=N]
 */
import { createHash } from "crypto"
import { createClient } from "@libsql/client"
import { existsSync, readFileSync } from "fs"
import {
  countPdfPages,
  prependSongTitleSlide,
  stripLegacyDarkTitleSlides,
} from "../lib/song-pdf-title-slide"

const APPLY = process.argv.includes("--apply")
const FORCE = process.argv.includes("--force")
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

function parseVerseMap(raw: unknown): {
  byPage: Map<number, number>
  byTitle: Map<string, number>
} {
  const byPage = new Map<number, number>()
  const byTitle = new Map<string, number>()
  if (Array.isArray(raw)) {
    for (const row of raw) {
      const page = Number((row as { page?: number }).page)
      const vc = Number((row as { verse_count?: number }).verse_count)
      const title = String((row as { title?: string }).title || "")
      if (Number.isFinite(vc) && vc >= 1 && vc <= 12) {
        if (Number.isFinite(page)) byPage.set(page, vc)
        if (title) byTitle.set(title, vc)
      }
    }
  } else if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>
    if (obj.by_title && typeof obj.by_title === "object") {
      for (const [k, v] of Object.entries(obj.by_title as Record<string, unknown>)) {
        const vc = Number(v)
        if (Number.isFinite(vc) && vc >= 1 && vc <= 12) byTitle.set(k, vc)
      }
    }
    if (obj.by_page && typeof obj.by_page === "object") {
      for (const [k, v] of Object.entries(obj.by_page as Record<string, unknown>)) {
        const page = Number(k)
        const vc = Number(v)
        if (Number.isFinite(page) && Number.isFinite(vc) && vc >= 1 && vc <= 12) {
          byPage.set(page, vc)
        }
      }
    }
    for (const [k, v] of Object.entries(obj)) {
      if (k === "by_title" || k === "by_page" || k === "results") continue
      const page = Number(k)
      const vc = Number(v)
      if (Number.isFinite(page) && Number.isFinite(vc) && vc >= 1 && vc <= 12) {
        byPage.set(page, vc)
      }
    }
  }
  return { byPage, byTitle }
}

async function main() {
  if (!FROM || !existsSync(FROM)) {
    console.error("pass --from=/path/to/sfp-verse-ocr.json")
    process.exit(1)
  }
  const { byPage, byTitle } = parseVerseMap(JSON.parse(readFileSync(FROM, "utf8")))
  console.log(
    `verse map pages=${byPage.size} titles=${byTitle.size} apply=${APPLY} force=${FORCE}`,
  )

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

  const items = await db.execute({
    sql: `SELECT id, title, file_url, verse_count, sort_order
          FROM song_pack_items WHERE pack_id = ? ORDER BY sort_order`,
    args: [PACK_ID],
  })

  let ok = 0
  let skip = 0
  let fail = 0
  for (const row of items.rows) {
    const title = String(row.title)
    const m = title.match(/^(\d+)\s*·/)
    const page = m ? Number(m[1]) : null
    const next = byTitle.get(title) ?? (page != null ? byPage.get(page) : undefined)
    if (next == null) {
      skip++
      continue
    }
    const prev = row.verse_count != null ? Number(row.verse_count) : null
    if (!FORCE && prev === next) {
      skip++
      continue
    }
    if (LIMIT > 0 && ok >= LIMIT) break

    console.log(`REBAKE ${title} verses ${prev ?? "?"} → ${next}`)
    if (!APPLY) {
      ok++
      continue
    }

    const fileUrl = String(row.file_url)
    const res = await fetch(fileUrl)
    if (!res.ok) {
      console.error("  download fail", res.status)
      fail++
      continue
    }
    let pdfBytes = new Uint8Array(await res.arrayBuffer())
    pdfBytes = await stripLegacyDarkTitleSlides(pdfBytes)
    const withTitle = await prependSongTitleSlide(pdfBytes, title, {
      verseCount: next,
      force: true,
      hasNativeTitle: false,
    })
    const pageCount = await countPdfPages(withTitle)
    const contentHash = createHash("sha256").update(Buffer.from(withTitle)).digest("hex")
    const pageKey = page != null ? String(page).padStart(4, "0") : "xxxx"
    const key = `song-packs/${PACK_ID}/${pageKey}-${contentHash.slice(0, 12)}.pdf`
    const put = await fetch(`${worker}/object?key=${encodeURIComponent(key)}`, {
      method: "PUT",
      headers: { "x-upload-secret": secret, "content-type": "application/pdf" },
      body: Buffer.from(withTitle),
    })
    if (!put.ok) {
      console.error("  upload fail", await put.text())
      fail++
      continue
    }
    const newUrl = `${publicBase}/${key}`
    await db.execute({
      sql: `UPDATE song_pack_items
            SET verse_count = ?, page_count = ?, file_url = ?, content_hash = ?, byte_size = ?
            WHERE id = ?`,
      args: [
        next,
        pageCount,
        newUrl,
        contentHash,
        withTitle.byteLength,
        String(row.id),
      ],
    })
    ok++
    console.log(`  ok ${newUrl}`)
  }

  console.log(`done ok=${ok} skip=${skip} fail=${fail}${APPLY ? "" : " (dry)"}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
