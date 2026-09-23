/**
 * Build a canonical full-song PPT list + optional LibreOffice PDF convert.
 *
 * Source (already copied off PRO-G40):
 *   ~/Code/sfp-full-song-ppt/*.ppt
 *
 * Prefers non–W-Opt / non-tag variants when multiple files share a page #.
 *
 *   npx tsx scripts/ingest-sfp-full-ppt.ts \
 *     --from=$HOME/Code/sfp-full-song-ppt \
 *     --out=/tmp/sfp-full-ppt-index.json \
 *     [--pdf-dir=/tmp/sfp-full-pdf] [--limit=20] [--convert]
 */
import { existsSync, mkdirSync, readdirSync, writeFileSync } from "fs"
import { basename, join } from "path"
import { spawnSync } from "child_process"

const fromArg = process.argv.find((a) => a.startsWith("--from="))
const FROM =
  fromArg?.slice("--from=".length) ||
  join(process.env.HOME || "", "Code/sfp-full-song-ppt")
const outArg = process.argv.find((a) => a.startsWith("--out="))
const OUT = outArg?.slice("--out=".length) || "/tmp/sfp-full-ppt-index.json"
const pdfArg = process.argv.find((a) => a.startsWith("--pdf-dir="))
const PDF_DIR = pdfArg?.slice("--pdf-dir=".length) || "/tmp/sfp-full-pdf"
const limitArg = process.argv.find((a) => a.startsWith("--limit="))
const LIMIT = limitArg ? Number(limitArg.split("=")[1]) : 0
const CONVERT = process.argv.includes("--convert")

function variantScore(name: string): number {
  const n = name.toLowerCase()
  let s = 0
  if (n.includes("w-opt") || n.includes("w opt")) s += 20
  if (/\bopt\b/.test(n) || n.includes("-opt")) s += 10
  if (n.includes("intro") || n.includes("descant") || n.includes("tag")) s += 5
  if (n.includes("end")) s += 3
  if (/\d+vr/.test(n)) s += 2
  // Prefer names that say full
  if (n.includes("full")) s -= 1
  return s
}

function pageFromName(name: string): number | null {
  const m = basename(name).match(/^0*(\d+)/)
  if (!m) return null
  const n = Number(m[1])
  return Number.isFinite(n) && n > 0 ? n : null
}

function main() {
  if (!existsSync(FROM)) {
    console.error("missing", FROM)
    process.exit(1)
  }
  const files = readdirSync(FROM).filter((f) => f.toLowerCase().endsWith(".ppt"))
  const byPage = new Map<number, string[]>()
  for (const f of files) {
    const page = pageFromName(f)
    if (page == null) continue
    const list = byPage.get(page) || []
    list.push(f)
    byPage.set(page, list)
  }

  const pages = [...byPage.keys()].sort((a, b) => a - b)
  const selected = pages.map((page) => {
    const alts = byPage.get(page)!
    const file = [...alts].sort((a, b) => variantScore(a) - variantScore(b) || a.localeCompare(b))[0]
    return {
      page,
      file,
      path: join(FROM, file),
      alt_count: alts.length - 1,
      alts: alts.length > 1 ? alts.filter((a) => a !== file) : [],
    }
  })

  const take = LIMIT > 0 ? selected.slice(0, LIMIT) : selected
  mkdirSync(PDF_DIR, { recursive: true })

  const indexPages: Array<{
    page: number
    ppt: string
    pdf: string | null
    pdf_index: number
    alt_count: number
  }> = []

  let converted = 0
  for (let i = 0; i < take.length; i++) {
    const row = take[i]
    let pdfPath: string | null = null
    if (CONVERT) {
      const expected = join(PDF_DIR, basename(row.file).replace(/\.ppt$/i, ".pdf"))
      if (existsSync(expected)) {
        pdfPath = expected
      } else {
        const r = spawnSync(
          "soffice",
          ["--headless", "--convert-to", "pdf", "--outdir", PDF_DIR, row.path],
          { encoding: "utf8", timeout: 120_000 },
        )
        if (r.status !== 0) {
          console.error("convert fail", row.file, r.stderr || r.stdout)
        } else if (existsSync(expected)) {
          pdfPath = expected
          converted++
        } else {
          // LibreOffice may sanitize the filename
          const found = readdirSync(PDF_DIR).find(
            (f) => f.endsWith(".pdf") && f.startsWith(String(row.page).padStart(4, "0")),
          )
          if (found) {
            pdfPath = join(PDF_DIR, found)
            converted++
          }
        }
      }
      console.log(
        `${pdfPath ? "PDF" : "FAIL"} ${row.page} ${row.file}${row.alt_count ? ` (+${row.alt_count} alts)` : ""}`,
      )
    } else {
      console.log(`INDEX ${row.page} ${row.file}${row.alt_count ? ` (+${row.alt_count} alts)` : ""}`)
    }
    indexPages.push({
      page: row.page,
      ppt: row.path,
      pdf: pdfPath,
      pdf_index: i,
      alt_count: row.alt_count,
    })
  }

  const index = {
    created_at: new Date().toISOString(),
    source: FROM,
    kind: "full_song_ppt",
    pdf_dir: PDF_DIR,
    unique_pages: selected.length,
    files_total: files.length,
    convert: CONVERT,
    converted,
    pages: indexPages,
  }
  writeFileSync(OUT, JSON.stringify(index, null, 2))
  console.log(`wrote ${OUT} songs=${indexPages.length} converted=${converted}`)
  console.log(
    "Next: python scripts/runpod-sfp-book-ocr/batch_book_ocr.py --index=… --library=… --out=…",
  )
}

main()
