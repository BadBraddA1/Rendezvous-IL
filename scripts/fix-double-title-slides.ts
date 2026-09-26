/**
 * Find + fix stacked title openers on library song PDFs.
 *
 * Case A — two exact 720×405 openers (rare after strip fix).
 * Case B — our exact opener + a native nearly-blank title at music size
 *          (~720×405.071). Detected by ink ratio on page 1 (no hand list).
 *
 *   npx tsx --env-file=.env.local scripts/fix-double-title-slides.ts \
 *     [--pack-id=UUID] [--apply] [--limit=N] [--ink=0.04]
 *
 * Default pack = Songs of Faith and Praise.
 */
import { createHash } from "crypto"
import { createClient } from "@libsql/client"
import { spawnSync } from "child_process"
import { mkdirSync, writeFileSync, readFileSync } from "fs"
import { join } from "path"
import { tmpdir } from "os"
import { PDFDocument } from "pdf-lib"
import {
  countPdfPages,
  prependSongTitleSlide,
  SFP_SLIDE_HEIGHT,
  SFP_SLIDE_WIDTH,
} from "../lib/song-pdf-title-slide"

const APPLY = process.argv.includes("--apply")
const packArg = process.argv.find((a) => a.startsWith("--pack-id="))
const PACK_ID =
  packArg?.slice("--pack-id=".length) ||
  process.env.SFP_PACK_ID ||
  "3eac16b6-fc68-43db-9d82-5cd7ccd2d5ce"
const limitArg = process.argv.find((a) => a.startsWith("--limit="))
const LIMIT = limitArg ? Number(limitArg.split("=")[1]) : 0
const inkArg = process.argv.find((a) => a.startsWith("--ink="))
const INK_MAX = inkArg ? Number(inkArg.split("=")[1]) : 0.04

const PY =
  process.env.SFP_PY ||
  join(process.env.HOME || "", "Code/Rendezvous-IL/scripts/sfp-lyric-band-ocr/.venv/bin/python")

function loadEnv(): Record<string, string> {
  const env = { ...process.env } as Record<string, string>
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
    /* use process.env */
  }
  return env
}

function isExactOpener(w: number, h: number): boolean {
  return Math.abs(w - SFP_SLIDE_WIDTH) < 0.02 && Math.abs(h - SFP_SLIDE_HEIGHT) < 0.02
}

function pageInks(pdfPath: string, maxPages = 3): number[] {
  const script = `
import sys, warnings
warnings.filterwarnings("ignore")
import pymupdf
doc = pymupdf.open(sys.argv[1])
n = min(int(sys.argv[2]), len(doc))
inks = []
for i in range(n):
    page = doc[i]
    pix = page.get_pixmap(matrix=pymupdf.Matrix(0.4, 0.4), alpha=False)
    samples = pix.samples
    dark = total = 0
    step = 3 * 5
    for j in range(0, len(samples) - 2, step):
        r, g, b = samples[j], samples[j + 1], samples[j + 2]
        L = (0.299 * r + 0.587 * g + 0.114 * b) / 255.0
        total += 1
        if L < 0.85:
            dark += 1
    inks.append(dark / total if total else -1)
print(",".join(f"{x:.5f}" for x in inks))
`
  const dir = join(tmpdir(), "sfp-double-title")
  mkdirSync(dir, { recursive: true })
  const pyPath = join(dir, "ink.py")
  writeFileSync(pyPath, script)
  const r = spawnSync(PY, [pyPath, pdfPath, String(maxPages)], { encoding: "utf8" })
  if (r.status !== 0) {
    throw new Error(r.stderr || "ink scan failed")
  }
  const line = (r.stdout || "").trim().split("\n").filter(Boolean).pop() || ""
  return line.split(",").map(Number).filter((n) => Number.isFinite(n))
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
  if (APPLY && (!worker || !secret)) {
    throw new Error("Need R2_UPLOAD_WORKER_URL and R2_UPLOAD_SECRET")
  }

  const items = await db.execute({
    sql: `SELECT id, title, file_url, verse_count, file_type
          FROM song_pack_items
          WHERE pack_id = ? AND file_url IS NOT NULL AND file_url != ''
          ORDER BY sort_order`,
    args: [PACK_ID],
  })

  const tmp = join(tmpdir(), "sfp-double-title-fix")
  mkdirSync(tmp, { recursive: true })

  let scanned = 0
  let hit = 0
  let fixed = 0
  let fail = 0

  for (const row of items.rows) {
    if (LIMIT > 0 && hit >= LIMIT) break
    const title = String(row.title)
    const fileUrl = String(row.file_url)
    scanned++

    try {
      const res = await fetch(fileUrl)
      if (!res.ok) throw new Error(`download ${res.status}`)
      const buf = Buffer.from(await res.arrayBuffer())
      const pdfPath = join(tmp, `${row.id}.pdf`)
      writeFileSync(pdfPath, buf)

      const doc = await PDFDocument.load(buf, { ignoreEncryption: true })
      const pages = doc.getPages()
      if (pages.length < 2) continue

      let leadingExact = 0
      for (const p of pages) {
        const s = p.getSize()
        if (isExactOpener(s.width, s.height)) leadingExact++
        else break
      }

      const inks = pageInks(pdfPath, 3)
      const ink1 = inks[1] ?? 1
      const nativeBlankUnderOpener =
        leadingExact === 1 && ink1 >= 0 && ink1 < INK_MAX

      if (leadingExact < 2 && !nativeBlankUnderOpener) continue

      hit++
      const reason =
        leadingExact >= 2
          ? `stacked exact openers=${leadingExact}`
          : `native blank under opener ink1=${ink1.toFixed(4)}`
      console.log(`${APPLY ? "FIX" : "HIT"} ${title}  ${reason}`)

      if (!APPLY) continue

      // Peel every leading exact opener + any immediate near-blank music-sized
      // native title, then rebuild a single white opener.
      let bytes = new Uint8Array(buf)
      let working = await PDFDocument.load(bytes, { ignoreEncryption: true })
      const drop: number[] = []
      for (let i = 0; i < working.getPageCount(); i++) {
        const s = working.getPage(i).getSize()
        if (isExactOpener(s.width, s.height)) {
          drop.push(i)
          continue
        }
        break
      }
      // After exact openers, drop one near-blank page if present (native title).
      const afterExact = drop.length
      if (afterExact < working.getPageCount() && inks[afterExact] != null) {
        if (inks[afterExact]! >= 0 && inks[afterExact]! < INK_MAX) {
          drop.push(afterExact)
        }
      }
      if (drop.length > 0 && drop.length < working.getPageCount()) {
        const out = await PDFDocument.create()
        const keep = working
          .getPageIndices()
          .filter((i) => !drop.includes(i))
        const copied = await out.copyPages(working, keep)
        for (const p of copied) out.addPage(p)
        bytes = await out.save()
      }

      const verseCount =
        row.verse_count != null && Number(row.verse_count) > 0
          ? Number(row.verse_count)
          : null
      bytes = await prependSongTitleSlide(bytes, title, {
        verseCount,
        force: true,
      })

      const pageCount = await countPdfPages(bytes)
      const contentHash = createHash("sha256").update(Buffer.from(bytes)).digest("hex")
      const m = title.match(/^(\d+)\s*·/)
      const pageKey = m ? m[1]!.padStart(4, "0") : "xxxx"
      const key = `song-packs/${PACK_ID}/${pageKey}-${contentHash.slice(0, 12)}.pdf`
      const put = await fetch(`${worker}/object?key=${encodeURIComponent(key)}`, {
        method: "PUT",
        headers: { "x-upload-secret": secret, "content-type": "application/pdf" },
        body: Buffer.from(bytes),
      })
      if (!put.ok) throw new Error(`upload ${put.status}`)
      const newUrl = `${publicBase}/${key}`
      await db.execute({
        sql: `UPDATE song_pack_items
              SET file_url = ?, content_hash = ?, byte_size = ?, page_count = ?,
                  updated_at = datetime('now')
              WHERE id = ?`,
        args: [newUrl, contentHash, bytes.byteLength, pageCount, String(row.id)],
      })
      fixed++
      console.log(`  ok pages=${pageCount}`)
    } catch (e) {
      fail++
      console.error(`  fail ${title}`, e)
    }
  }

  console.log(
    `done scanned=${scanned} hits=${hit} fixed=${fixed} fail=${fail} apply=${APPLY} ink<${INK_MAX}`,
  )
  if (!APPLY && hit > 0) {
    console.log("Pass --apply to strip doubles and rewrite R2 + Turso.")
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
