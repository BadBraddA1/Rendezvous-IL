/**
 * Ingest an SFP hymnal book scan (PDF or image folder) → R2 + local page index.
 *
 * Text mode will OCR this scan on RunPod (PaddleOCR). Slides stay on digital PDFs.
 *
 *   npx tsx --env-file=.env.local scripts/ingest-sfp-book-scan.ts \
 *     --from=/path/to/SFP-scan.pdf [--apply]
 *
 *   npx tsx --env-file=.env.local scripts/ingest-sfp-book-scan.ts \
 *     --from=/path/to/page-images/ [--apply]
 *
 * Writes:
 *   - R2 song-packs/sfp-book-scan/… (when --apply)
 *   - /tmp/sfp-book-scan-index.json (always; pdf page → key / url)
 */
import { createReadStream, existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "fs"
import { basename, extname, join } from "path"
import { createInterface } from "readline"

const APPLY = process.argv.includes("--apply")
const fromArg = process.argv.find((a) => a.startsWith("--from="))
const FROM = fromArg?.slice("--from=".length)
const outArg = process.argv.find((a) => a.startsWith("--out="))
const OUT = outArg?.slice("--out=".length) || "/tmp/sfp-book-scan-index.json"
const R2_PREFIX = "song-packs/sfp-book-scan"

const IMAGE_EXT = new Set([".png", ".jpg", ".jpeg", ".webp", ".tif", ".tiff"])

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

/** Guess printed SFP page # from filename (0002, page-87, 87.png, …). */
function pageHintFromName(name: string): number | null {
  const base = basename(name, extname(name))
  const m =
    base.match(/(?:^|[^\d])(\d{1,4})(?:[^\d]|$)/) ||
    base.match(/^0*(\d+)$/)
  if (!m) return null
  const n = Number(m[1])
  return Number.isFinite(n) && n > 0 && n < 2000 ? n : null
}

async function putObject(
  worker: string,
  secret: string,
  key: string,
  body: Buffer,
  contentType: string,
): Promise<boolean> {
  const put = await fetch(`${worker}/object?key=${encodeURIComponent(key)}`, {
    method: "PUT",
    headers: {
      "x-upload-secret": secret,
      "content-type": contentType,
    },
    body,
  })
  return put.ok
}

type IndexPage = {
  pdf_index: number
  source: string
  key: string | null
  url: string | null
  page_hint: number | null
  byte_size: number
}

async function main() {
  if (!FROM || !existsSync(FROM)) {
    console.error("pass --from=/path/to/scan.pdf or --from=/path/to/images/")
    process.exit(1)
  }
  const env = loadEnv()
  const worker = (env.R2_UPLOAD_WORKER_URL || "").replace(/\/$/, "")
  const secret = env.R2_UPLOAD_SECRET || ""
  const publicBase = (env.R2_PUBLIC_BASE_URL || "https://cdn.rendezvousil.com").replace(
    /\/$/,
    "",
  )
  if (APPLY && (!worker || !secret)) {
    console.error("R2 upload env missing (need R2_UPLOAD_WORKER_URL + R2_UPLOAD_SECRET)")
    process.exit(1)
  }

  const st = statSync(FROM)
  const pages: IndexPage[] = []

  if (st.isDirectory()) {
    const files = readdirSync(FROM)
      .filter((f) => IMAGE_EXT.has(extname(f).toLowerCase()))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    if (files.length === 0) {
      console.error("no images in", FROM)
      process.exit(1)
    }
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const abs = join(FROM, file)
      const buf = readFileSync(abs)
      const ext = extname(file).toLowerCase().replace(".", "")
      const ct =
        ext === "png"
          ? "image/png"
          : ext === "webp"
            ? "image/webp"
            : ext === "tif" || ext === "tiff"
              ? "image/tiff"
              : "image/jpeg"
      const key = `${R2_PREFIX}/pages/${String(i).padStart(4, "0")}-${file}`
      let url: string | null = null
      if (APPLY) {
        const ok = await putObject(worker, secret, key, buf, ct)
        if (!ok) {
          console.error("upload fail", key)
          process.exit(1)
        }
        url = `${publicBase}/${key}`
        console.log(`UPLOADED ${i} ${file} → ${url}`)
      } else {
        console.log(`DRY ${i} ${file} key=${key} hint=${pageHintFromName(file)}`)
      }
      pages.push({
        pdf_index: i,
        source: abs,
        key: APPLY ? key : null,
        url,
        page_hint: pageHintFromName(file),
        byte_size: buf.length,
      })
    }
  } else {
    // Single PDF — upload whole file; RunPod will rasterize pages.
    const buf = readFileSync(FROM)
    const name = basename(FROM)
    const key = `${R2_PREFIX}/${name}`
    let url: string | null = null
    if (APPLY) {
      const ok = await putObject(worker, secret, key, buf, "application/pdf")
      if (!ok) {
        console.error("upload fail", key)
        process.exit(1)
      }
      url = `${publicBase}/${key}`
      console.log(`UPLOADED pdf → ${url} (${buf.length} bytes)`)
    } else {
      console.log(`DRY pdf ${FROM} key=${key} (${buf.length} bytes)`)
    }
    // Index entry for the PDF as a whole; batch OCR expands pdf_index per page.
    pages.push({
      pdf_index: 0,
      source: FROM,
      key: APPLY ? key : null,
      url,
      page_hint: null,
      byte_size: buf.length,
    })
  }

  const index = {
    created_at: new Date().toISOString(),
    source: FROM,
    apply: APPLY,
    r2_prefix: R2_PREFIX,
    kind: st.isDirectory() ? "images" : "pdf",
    page_count: pages.length,
    pages,
  }
  writeFileSync(OUT, JSON.stringify(index, null, 2))
  console.log(`wrote ${OUT} pages=${pages.length} apply=${APPLY}`)
  console.log(
    "Next: on RunPod, run scripts/runpod-sfp-book-ocr/batch_book_ocr.py --index=… --out=…",
  )
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
