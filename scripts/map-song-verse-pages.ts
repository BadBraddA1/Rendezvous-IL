/**
 * OCR each song PDF and store verse→page jump targets (`verse_pages`).
 *
 *   npx tsx --env-file=.env.local scripts/map-song-verse-pages.ts [--pack-slug=sfp-pilot-10] [--apply]
 */
import { createClient } from "@libsql/client"
import { spawnSync } from "child_process"
import { mkdirSync, readFileSync, writeFileSync, unlinkSync } from "fs"
import { join } from "path"
import { tmpdir } from "os"

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
  let scale: CGFloat = 2.5
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

func ocr(_ pageIndex: Int) -> String {
  guard let cg = render(pageIndex) else { return "" }
  let req = VNRecognizeTextRequest()
  req.recognitionLevel = .accurate
  let handler = VNImageRequestHandler(cgImage: cg, options: [:])
  try? handler.perform([req])
  return (req.results ?? []).compactMap { $0.topCandidates(1).first?.string }.joined(separator: " ")
}

var firstPage: [Int: Int] = [:]
let pattern = try! NSRegularExpression(pattern: #"(?:^|\\s)([1-9])\\.\\s"#)
for i in 0..<doc.pageCount {
  let text = ocr(i)
  let ns = text as NSString
  for m in pattern.matches(in: text, range: NSRange(location: 0, length: ns.length)) {
    if let n = Int(ns.substring(with: m.range(at: 1))), firstPage[n] == nil {
      firstPage[n] = i
    }
  }
}
let maxVerse = firstPage.keys.max() ?? 0
var pages: [Int] = []
if maxVerse > 0 {
  for v in 1...maxVerse {
    guard let p = firstPage[v] else { break }
    pages.append(p)
  }
}
let payload: [String: Any] = [
  "pages": doc.pageCount,
  "verseCount": pages.count,
  "versePages": pages,
]
let data = try! JSONSerialization.data(withJSONObject: payload)
FileHandle.standardOutput.write(data)
print("")
`

function inspectVerses(pdfPath: string): {
  pages: number
  verseCount: number
  versePages: number[]
} {
  const helperPath = join(tmpdir(), `ren-verse-map-${process.pid}.swift`)
  writeFileSync(helperPath, SWIFT_HELPER)
  try {
    const result = spawnSync("swift", [helperPath, pdfPath], {
      encoding: "utf8",
      maxBuffer: 10 * 1024 * 1024,
      timeout: 300_000,
    })
    if (result.status !== 0) {
      console.error("swift failed", result.stderr?.slice(0, 400))
      return { pages: 0, verseCount: 0, versePages: [] }
    }
    const line = (result.stdout || "").trim().split("\n").filter(Boolean).pop() || "{}"
    const parsed = JSON.parse(line) as {
      pages?: number
      verseCount?: number
      versePages?: number[]
    }
    return {
      pages: Number(parsed.pages ?? 0),
      verseCount: Number(parsed.verseCount ?? 0),
      versePages: Array.isArray(parsed.versePages)
        ? parsed.versePages.map((n) => Number(n)).filter((n) => Number.isFinite(n))
        : [],
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

  await db.execute(`ALTER TABLE song_pack_items ADD COLUMN verse_pages TEXT`).catch(() => {})

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
  const workDir = join(tmpdir(), `ren-verse-map-${process.pid}`)
  mkdirSync(workDir, { recursive: true })

  for (const row of items.rows) {
    if (String(row.file_type) !== "pdf") continue
    const res = await fetch(String(row.file_url))
    if (!res.ok) {
      console.error("fetch fail", row.title, res.status)
      continue
    }
    const tmpPdf = join(workDir, `${row.id}.pdf`)
    writeFileSync(tmpPdf, Buffer.from(await res.arrayBuffer()))
    const info = inspectVerses(tmpPdf)
    console.log(
      `${row.title} verses=${info.verseCount || "?"} pages=${info.pages} jumps=${JSON.stringify(info.versePages)}`,
    )
    if (!APPLY) continue
    await db.execute({
      sql: `UPDATE song_pack_items
            SET verse_count = COALESCE(?, verse_count),
                page_count = COALESCE(?, page_count),
                verse_pages = ?,
                updated_at = datetime('now')
            WHERE id = ?`,
      args: [
        info.verseCount > 0 ? info.verseCount : null,
        info.pages > 0 ? info.pages : null,
        info.versePages.length > 0 ? JSON.stringify(info.versePages) : null,
        row.id,
      ],
    })
  }

  console.log(APPLY ? "done (applied)" : "done (dry run — pass --apply to write)")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
