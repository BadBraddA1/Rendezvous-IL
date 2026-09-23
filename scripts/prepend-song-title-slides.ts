/**
 * Upgrade song PDFs to the white SFP-style title opener (like #2 We Praise Thee O God),
 * strip legacy dark 1920×1080 cards, OCR verse counts (macOS Vision), and update Turso.
 *
 *   npx tsx --env-file=.env.local scripts/prepend-song-title-slides.ts [--pack-slug=sfp-pilot-10] [--apply]
 */
import { createHash } from "crypto"
import { createClient } from "@libsql/client"
import { spawnSync } from "child_process"
import { mkdirSync, readFileSync, writeFileSync, unlinkSync } from "fs"
import { join } from "path"
import { tmpdir } from "os"
import {
  countPdfPages,
  prependSongTitleSlide,
  stripLegacyDarkTitleSlides,
} from "../lib/song-pdf-title-slide"

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
  "verses": verses.sorted(),
]
let data = try! JSONSerialization.data(withJSONObject: payload)
FileHandle.standardOutput.write(data)
print("")
`

function inspectPdf(pdfPath: string): {
  pages: number
  ink0: number
  hasNativeTitle: boolean
  verseCount: number
} {
  const helperPath = join(tmpdir(), `ren-song-inspect-${process.pid}.swift`)
  writeFileSync(helperPath, SWIFT_HELPER)
  try {
    const result = spawnSync("swift", [helperPath, pdfPath], {
      encoding: "utf8",
      maxBuffer: 10 * 1024 * 1024,
      timeout: 180_000,
    })
    if (result.status !== 0) {
      console.error("swift inspect failed", result.stderr?.slice(0, 400))
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
  } finally {
    try {
      unlinkSync(helperPath)
    } catch {
      /* ignore */
    }
  }
}

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

  await db.execute(`ALTER TABLE song_pack_items ADD COLUMN page_count INTEGER`).catch(() => {})
  await db.execute(`ALTER TABLE song_pack_items ADD COLUMN verse_count INTEGER`).catch(() => {})

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
  const workDir = join(tmpdir(), `ren-song-title-${process.pid}`)
  mkdirSync(workDir, { recursive: true })

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
    const original = new Uint8Array(await res.arrayBuffer())
    const stripped = await stripLegacyDarkTitleSlides(original)
    const tmpPdf = join(workDir, `${row.id}.pdf`)
    writeFileSync(tmpPdf, Buffer.from(stripped))

    const info = inspectPdf(tmpPdf)
    const verseCount = info.verseCount > 0 ? info.verseCount : null
    const withTitle = await prependSongTitleSlide(stripped, String(row.title), {
      verseCount,
      force: true,
      hasNativeTitle: info.hasNativeTitle,
    })
    const pageCount = await countPdfPages(withTitle)
    const unchanged =
      withTitle.byteLength === original.byteLength &&
      Buffer.from(withTitle).equals(Buffer.from(original))

    console.log(
      `${row.title} ink0=${info.ink0.toFixed(3)} nativeTitle=${info.hasNativeTitle} verses=${verseCount ?? "?"} pages=${pageCount} ${unchanged ? "unchanged" : `${original.byteLength}→${withTitle.byteLength}`}`,
    )

    if (!APPLY) continue

    const hash = createHash("sha256").update(Buffer.from(withTitle)).digest("hex")
    const key = `song-packs/${pack.id}/${Date.now()}-${hash.slice(0, 12)}.pdf`
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
            SET file_url = ?, byte_size = ?, content_hash = ?,
                page_count = ?, verse_count = ?, updated_at = datetime('now')
            WHERE id = ?`,
      args: [newUrl, withTitle.byteLength, hash, pageCount, verseCount, row.id],
    })
  }

  console.log(APPLY ? "done (applied)" : "done (dry run — pass --apply to write)")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
