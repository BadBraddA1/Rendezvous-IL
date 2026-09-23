/**
 * Import the full SFP shape-note book into the library song pack:
 *   original .ppt → PDF (LibreOffice) → OCR verse count → white title opener with “N verses” → R2 + Turso.
 *
 * Uses original .ppt → PDF (LibreOffice) + Vision OCR for verse counts, then uploads to R2/Turso.
 *
 *   npx tsx --env-file=.env.local scripts/import-sfp-songbook.ts [--apply] [--limit=N] [--resume] [--fast] [--shard=i/n]
 *
 * --limit=N   process at most N *new* songs this run (skips resume hits). Use with --resume for chunks.
 * --resume    keep existing pack rows; skip pages already in DB / done.json
 * --fast      skip Vision OCR; estimate verses from PDF page count (much faster)
 * --shard=i/n only process pages where page % n === i (parallel workers)
 */
import { createHash, randomUUID } from "crypto"
import { createClient } from "@libsql/client"
import { spawnSync } from "child_process"
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
  unlinkSync,
  copyFileSync,
} from "fs"
import { basename, join } from "path"
import { tmpdir } from "os"
import { PDFDocument } from "pdf-lib"
import {
  countPdfPages,
  extractVerseCountHint,
  prependSongTitleSlide,
  stripLegacyDarkTitleSlides,
} from "../lib/song-pdf-title-slide"

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

const APPLY = process.argv.includes("--apply")
const RESUME = process.argv.includes("--resume")
/** Skip Vision OCR — estimate verses from PDF page count (much faster). */
const FAST = process.argv.includes("--fast")
const limitArg = process.argv.find((a) => a.startsWith("--limit="))
const LIMIT = limitArg ? Number(limitArg.split("=")[1]) : 0
const shardArg = process.argv.find((a) => a.startsWith("--shard="))
/** e.g. --shard=0/3 — process only pages where page % 3 === 0 */
const SHARD = (() => {
  if (!shardArg) return { i: 0, n: 1 }
  const [i, n] = shardArg
    .slice("--shard=".length)
    .split("/")
    .map((x) => Number(x))
  if (!Number.isFinite(i) || !Number.isFinite(n) || n < 1) return { i: 0, n: 1 }
  return { i: Math.max(0, i), n }
})()

const SOFFICE =
  process.env.SOFFICE ||
  "/Applications/LibreOffice.app/Contents/MacOS/soffice"
const SRC =
  process.env.SFP_PPT_SRC ||
  "/Volumes/PRO-G40-Bradd/Song Books/SFP Songbook/SFP Shape note PP 16X9 by Page number"
const PACK_SLUG = process.env.SFP_PACK_SLUG || "sfp-pilot-10"
const PACK_ID = "3eac16b6-fc68-43db-9d82-5cd7ccd2d5ce"
const LO_PROFILE =
  process.env.LO_USER_INSTALLATION ||
  `file://${join(tmpdir(), `lo-sfp-${process.pid}-s${SHARD.i}`)}`

const SWIFT_HELPER = `
import Vision
import AppKit
import Foundation
import PDFKit

let path = CommandLine.arguments[1]
guard let doc = PDFDocument(url: URL(fileURLWithPath: path)) else {
  fputs("{\\"error\\":\\"open failed\\"}\\n", stderr)
  exit(1)
}

func render(_ pageIndex: Int) -> CGImage? {
  guard let page = doc.page(at: pageIndex) else { return nil }
  let bounds = page.bounds(for: .mediaBox)
  let scale: CGFloat = 2
  let size = CGSize(width: bounds.width * scale, height: bounds.height * scale)
  let img = NSImage(size: size)
  img.lockFocus()
  if let ctx = NSGraphicsContext.current?.cgContext {
    ctx.setFillColor(NSColor.white.cgColor)
    ctx.fill(CGRect(origin: .zero, size: size))
    ctx.scaleBy(x: scale, y: scale)
    page.draw(with: .mediaBox, to: ctx)
  }
  img.unlockFocus()
  guard let tiff = img.tiffRepresentation,
        let rep = NSBitmapImageRep(data: tiff) else { return nil }
  return rep.cgImage
}

func inkRatio(_ pageIndex: Int) -> Double {
  guard let cg = render(pageIndex) else { return -1 }
  let rep = NSBitmapImageRep(cgImage: cg)
  var dark = 0, total = 0
  for y in stride(from: 0, to: rep.pixelsHigh, by: 6) {
    for x in stride(from: 0, to: rep.pixelsWide, by: 6) {
      guard let c = rep.colorAt(x: x, y: y) else { continue }
      total += 1
      let L = 0.299*c.redComponent + 0.587*c.greenComponent + 0.114*c.blueComponent
      if L < 0.85 { dark += 1 }
    }
  }
  return total > 0 ? Double(dark)/Double(total) : -1
}

func ocr(_ pageIndex: Int) -> String {
  guard let cg = render(pageIndex) else { return "" }
  let req = VNRecognizeTextRequest()
  req.recognitionLevel = .accurate
  let handler = VNImageRequestHandler(cgImage: cg, options: [:])
  try? handler.perform([req])
  return (req.results ?? []).compactMap { $0.topCandidates(1).first?.string }.joined(separator: " ")
}

var verses = Set<Int>()
let pattern = try! NSRegularExpression(pattern: #"(?:^|\\s)([1-9])\\.\\s+[A-Za-z]"#)
for i in 0..<doc.pageCount {
  let text = ocr(i)
  let ns = text as NSString
  for m in pattern.matches(in: text, range: NSRange(location: 0, length: ns.length)) {
    if let n = Int(ns.substring(with: m.range(at: 1))) { verses.insert(n) }
  }
}
let ink0 = inkRatio(0)
let payload: [String: Any] = [
  "pages": doc.pageCount,
  "ink0": ink0,
  "hasNativeTitle": ink0 >= 0 && ink0 < 0.04,
  "verseCount": verses.max() ?? 0,
]
let data = try! JSONSerialization.data(withJSONObject: payload)
FileHandle.standardOutput.write(data)
print("")
`

function cleanSongTitle(raw: string): string {
  let s = raw.trim()
  if (!s) return s
  s = s.replace(/^.*[/\\]/, "").replace(/\.[^.]+$/i, "")
  s = s
    .replace(/-W-Opt[^-]*(?:-[^-]+)*/gi, "")
    .replace(/-SFP(?:-HD|-Full|-full)?(?:copy)?/gi, "")
    .replace(/-Full(?:-SFP)?/gi, "")
    .replace(/-HDcopy/gi, "")
    .replace(/-HD(?:copy)?/gi, "")
    .replace(/-3vr/gi, "")
    .replace(/-Moz\b/gi, "")
    .replace(/-Vale\b/gi, "")
    .replace(/-copy\b/gi, "")
    .replace(/\s+-?HDcopy$/i, "")
    .replace(/[_]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .replace(/[\s-]+$/g, "")
    .trim()
  const numbered = s.match(/^(\d+)\s+(.+)$/)
  if (numbered) {
    const page = Number(numbered[1])
    const name = numbered[2].replace(/^[\s.-]+/, "").trim()
    if (Number.isFinite(page) && name) return `${page} · ${name}`
  }
  return s || raw.trim()
}

function isBaseSong(name: string): boolean {
  if (!/\.ppt$/i.test(name) || /\.pptx$/i.test(name)) return false
  if (/W-Opt|3vr|optional|Refrain/i.test(name)) return false
  return /^\d{4}\s/.test(name)
}

function pageFromName(name: string): number | null {
  const m = name.match(/^(\d{4})\s/)
  return m ? Number(m[1]) : null
}

async function dropFirstPage(pdfBytes: Uint8Array): Promise<Uint8Array> {
  const source = await PDFDocument.load(pdfBytes)
  if (source.getPageCount() <= 1) return pdfBytes
  const out = await PDFDocument.create()
  const rest = await out.copyPages(source, source.getPageIndices().slice(1))
  for (const page of rest) out.addPage(page)
  return out.save()
}

function inspectPdf(pdfPath: string, helperPath: string): {
  pages: number
  ink0: number
  hasNativeTitle: boolean
  verseCount: number
} {
  const result = spawnSync("swift", [helperPath, pdfPath], {
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
    timeout: 180_000,
  })
  if (result.status !== 0) {
    console.error("  swift inspect fail", result.stderr?.slice(0, 200))
    return { pages: 0, ink0: -1, hasNativeTitle: false, verseCount: 0 }
  }
  const line = (result.stdout || "").trim().split("\n").filter(Boolean).pop() || "{}"
  const parsed = JSON.parse(line) as {
    pages?: number
    ink0?: number
    hasNativeTitle?: boolean
    verseCount?: number
  }
  return {
    pages: Number(parsed.pages ?? 0),
    ink0: Number(parsed.ink0 ?? -1),
    hasNativeTitle: Boolean(parsed.hasNativeTitle),
    verseCount: Number(parsed.verseCount ?? 0),
  }
}

function convertPptToPdf(pptPath: string, outDir: string): string | null {
  mkdirSync(outDir, { recursive: true })
  const simple = join(outDir, `in-${process.pid}-${Date.now()}.ppt`)
  copyFileSync(pptPath, simple)
  const result = spawnSync(
    SOFFICE,
    [
      "--headless",
      "--norestore",
      "--nologo",
      "--nodefault",
      `-env:UserInstallation=${LO_PROFILE}`,
      "--convert-to",
      "pdf",
      "--outdir",
      outDir,
      simple,
    ],
    { encoding: "utf8", timeout: 120_000 },
  )
  try {
    unlinkSync(simple)
  } catch {
    /* ignore */
  }
  if (result.status !== 0) {
    console.error("  soffice fail", basename(pptPath), result.stderr?.slice(0, 160))
    return null
  }
  const pdfName = basename(simple).replace(/\.ppt$/i, ".pdf")
  const dest = join(outDir, pdfName)
  return existsSync(dest) ? dest : null
}

async function main() {
  if (!existsSync(SRC)) {
    console.error("source missing", SRC)
    process.exit(1)
  }
  if (!existsSync(SOFFICE)) {
    console.error("LibreOffice missing", SOFFICE)
    process.exit(1)
  }

  const env = loadEnv()
  if (!env.TURSO_DATABASE_URL || !env.TURSO_AUTH_TOKEN) {
    console.error("Turso env missing")
    process.exit(1)
  }
  if (!env.R2_UPLOAD_WORKER_URL || !env.R2_UPLOAD_SECRET) {
    console.error("R2 upload env missing")
    process.exit(1)
  }

  const db = createClient({
    url: env.TURSO_DATABASE_URL,
    authToken: env.TURSO_AUTH_TOKEN,
  })
  const worker = env.R2_UPLOAD_WORKER_URL.replace(/\/$/, "")
  const secret = env.R2_UPLOAD_SECRET
  const publicBase = (env.R2_PUBLIC_BASE_URL || "https://cdn.rendezvousil.com").replace(
    /\/$/,
    "",
  )

  const files = readdirSync(SRC)
    .filter(isBaseSong)
    .sort((a, b) => (pageFromName(a) ?? 0) - (pageFromName(b) ?? 0))

  console.log(
    `src=${SRC}\npack=${PACK_SLUG} id=${PACK_ID}\nfiles=${files.length} apply=${APPLY} resume=${RESUME} limit=${LIMIT || "all"} fast=${FAST} shard=${SHARD.i}/${SHARD.n}`,
  )

  const workRoot = join(
    process.env.HOME || tmpdir(),
    "Code/Rendezvous-IL/.tmp-sfp-import",
  )
  const pdfDir = join(workRoot, "pdf")
  const donePath = join(workRoot, "done.json")
  mkdirSync(pdfDir, { recursive: true })

  const helperPath = join(workRoot, "inspect.swift")
  writeFileSync(helperPath, SWIFT_HELPER)

  let donePages = new Set<number>()
  if (RESUME && existsSync(donePath)) {
    try {
      donePages = new Set(JSON.parse(readFileSync(donePath, "utf8")) as number[])
      console.log(`resume: skipping ${donePages.size} already imported`)
    } catch {
      /* ignore */
    }
  } else if (APPLY && !RESUME) {
    // Seed done.json from whatever we write as we go
    writeFileSync(donePath, "[]")
  }

  if (APPLY && !RESUME) {
    // Clear pilot items so the pack becomes the full book
    await db.execute({
      sql: "DELETE FROM song_pack_items WHERE pack_id = ?",
      args: [PACK_ID],
    })
    await db.execute({
      sql: `UPDATE song_packs
            SET name = ?, slug = ?, description = ?, is_library = 1, is_published = 1,
                updated_at = datetime('now')
            WHERE id = ?`,
      args: [
        "Songs of Faith and Praise",
        "songs-of-faith-and-praise",
        "Full shape-note songbook",
        PACK_ID,
      ],
    })
    console.log("cleared existing pack items; renamed slug → songs-of-faith-and-praise")
    donePages = new Set()
    writeFileSync(donePath, "[]")
  }

  let ok = 0
  let fail = 0
  // Page number is stable across parallel shards (avoid racing MAX(sort_order))
  void 0

  // If resuming after a partial apply, mark DB pages as done
  if (APPLY && RESUME) {
    const existing = await db.execute({
      sql: "SELECT title FROM song_pack_items WHERE pack_id = ?",
      args: [PACK_ID],
    })
    for (const row of existing.rows) {
      const m = String(row.title).match(/^(\d+)\s*·/)
      if (m) donePages.add(Number(m[1]))
    }
    writeFileSync(donePath, JSON.stringify([...donePages]))
    console.log(`resume: ${donePages.size} songs already in pack`)
  }
  let attempted = 0
  for (const name of files) {
    const page = pageFromName(name)!
    if (SHARD.n > 1 && page % SHARD.n !== SHARD.i) {
      continue
    }
    if (donePages.has(page)) {
      continue
    }
    if (LIMIT > 0 && attempted >= LIMIT) {
      console.log(`chunk cap reached (--limit=${LIMIT}); re-run with --resume for next chunk`)
      break
    }
    attempted++

    const title = cleanSongTitle(name)
    console.log(`IMPORT ${name} → ${title}`)

    const pptPath = join(SRC, name)
    const pdfPath = convertPptToPdf(pptPath, pdfDir)
    if (!pdfPath) {
      fail++
      continue
    }

    let pdfBytes = new Uint8Array(readFileSync(pdfPath))
    pdfBytes = await stripLegacyDarkTitleSlides(pdfBytes)
    writeFileSync(pdfPath, Buffer.from(pdfBytes))

    const hint = extractVerseCountHint(name)
    let verseCount = hint && hint > 0 ? hint : 0

    if (!FAST) {
      const info = inspectPdf(pdfPath, helperPath)
      if (info.hasNativeTitle && info.pages > 1) {
        pdfBytes = await dropFirstPage(pdfBytes)
        writeFileSync(pdfPath, Buffer.from(pdfBytes))
      }
      if (info.verseCount > 0) verseCount = info.verseCount
      if (verseCount > 0) {
        console.log(
          `  verses=${verseCount} ink0=${info.ink0.toFixed(3)} nativeTitle=${info.hasNativeTitle}`,
        )
      }
    }

    if (verseCount <= 0) {
      const pages = await countPdfPages(pdfBytes)
      verseCount = Math.max(1, Math.min(12, Math.round(pages / 2) || 1))
      console.log(
        `  verses estimated=${verseCount} (pages=${pages}${FAST ? " fast" : " ocr=0"})`,
      )
    }

    const withTitle = await prependSongTitleSlide(pdfBytes, title, {
      verseCount,
      force: true,
      hasNativeTitle: false,
    })
    const pageCount = await countPdfPages(withTitle)
    const contentHash = createHash("sha256").update(Buffer.from(withTitle)).digest("hex")

    if (!APPLY) {
      console.log(`  dry pages=${pageCount} bytes=${withTitle.byteLength}`)
      ok++
      continue
    }

    const key = `song-packs/${PACK_ID}/${String(page).padStart(4, "0")}-${contentHash.slice(0, 12)}.pdf`
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
    const fileUrl = `${publicBase}/${key}`
    const id = randomUUID()
    await db.execute({
      sql: `INSERT INTO song_pack_items (
        id, pack_id, title, sort_order, file_url, file_type, byte_size, content_hash,
        page_count, verse_count
      ) VALUES (?, ?, ?, ?, ?, 'pdf', ?, ?, ?, ?)`,
      args: [
        id,
        PACK_ID,
        title,
        page, // page number = sort order (safe for parallel shards)
        fileUrl,
        withTitle.byteLength,
        contentHash,
        pageCount,
        verseCount,
      ],
    })

    donePages.add(page)
    writeFileSync(donePath, JSON.stringify([...donePages]))
    ok++
    console.log(`  ok ${fileUrl}`)

    try {
      unlinkSync(pdfPath)
    } catch {
      /* ignore */
    }
  }

  if (APPLY) {
    await db.execute({
      sql: "UPDATE song_packs SET updated_at = datetime('now') WHERE id = ?",
      args: [PACK_ID],
    })
  }

  console.log(
    `done ok=${ok} fail=${fail}${APPLY ? "" : " (dry run — pass --apply)"}`,
  )
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
