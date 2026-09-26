/**
 * Import The Paperless Hymnal (TPH) numbered PPT/PPTX into a library song pack:
 *   .ppt(x) → PDF (LibreOffice headless) → title opener → R2 + Turso.
 *
 *   npx tsx --env-file=.env.local scripts/import-tph-songbook.ts \
 *     [--apply] [--limit=N] [--resume] [--fast] [--shard=i/n]
 *
 * Env overrides:
 *   TPH_PPT_SRC, TPH_PACK_ID, TPH_KEEP_PDF_DIR, SOFFICE
 *
 * Admin book code: C (see docs/ops/SONG-BOOK-CODES.md)
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
const FAST = process.argv.includes("--fast")
const limitArg = process.argv.find((a) => a.startsWith("--limit="))
const LIMIT = limitArg ? Number(limitArg.split("=")[1]) : 0
const shardArg = process.argv.find((a) => a.startsWith("--shard="))
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
  process.env.TPH_PPT_SRC ||
  "/Volumes/PRO-G40-Bradd/Song Books/TPH by NumberLocal Copy/IN PRO"
/** Prefer PRO-G40 — Mac disk is tight; drive stays mounted overnight. */
const DRIVE_WORK =
  process.env.TPH_DRIVE_WORK ||
  "/Volumes/PRO-G40-Bradd/_cloud-work"
const KEEP_PDF_DIR =
  process.env.TPH_KEEP_PDF_DIR || join(DRIVE_WORK, "tph-full-pdf")
const WORK_ROOT =
  process.env.TPH_WORK_ROOT || join(DRIVE_WORK, ".tmp-tph-import")
const LO_PROFILE =
  process.env.LO_USER_INSTALLATION ||
  `file://${join(DRIVE_WORK, "lo-profiles", `lo-tph-${process.pid}-s${SHARD.i}`)}`
const PACK_ID =
  process.env.TPH_PACK_ID ||
  readPackIdFallback() ||
  "d7b0b452-5467-4099-917d-f10a9d052c0b"
const PACK_NAME = "The Paperless Hymnal"
const PACK_SLUG = "the-paperless-hymnal"

function readPackIdFallback(): string | null {
  try {
    return readFileSync(join(WORK_ROOT, "pack-id.txt"), "utf8").trim()
  } catch {
    return null
  }
}

/** Strip soft hyphens / weird dashes that break leading-number parses. */
function normalizeName(raw: string): string {
  return raw
    .replace(/\u00ad/g, "")
    .replace(/[\u2013\u2014]/g, "-")
    .trim()
}

function cleanSongTitle(raw: string): string {
  let s = normalizeName(raw)
  if (!s) return s
  s = s.replace(/^.*[/\\]/, "").replace(/\.[^.]+$/i, "")
  s = s
    .replace(/-PftL\b/gi, "")
    .replace(/-PFTL\b/gi, "")
    .replace(/-Pftl\b/gi, "")
    .replace(/-SFP\b/gi, "")
    .replace(/-PH\d?\b/gi, "")
    .replace(/\s+copy$/i, "")
    .replace(/[_]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .replace(/[\s-]+$/g, "")
    .trim()
  // `001 - Title` or `001 Title` or soft-hyphen leftovers already stripped
  const numbered = s.match(/^(\d{1,4})\s*[-–—.]?\s*(.+)$/)
  if (numbered) {
    const page = Number(numbered[1])
    const name = numbered[2].replace(/^[\s.-]+/, "").trim()
    if (Number.isFinite(page) && name) return `${page} · ${name}`
  }
  return s || raw.trim()
}

function isBaseSong(name: string): boolean {
  if (!/\.pptx?$/i.test(name)) return false
  if (/iMac|^\._|^~\$/i.test(name)) return false
  const n = normalizeName(name)
  return /^\d{1,4}\s*[-–—.]?\s*\S/.test(n)
}

function pageFromName(name: string): number | null {
  const m = normalizeName(name).match(/^(\d{1,4})/)
  return m ? Number(m[1]) : null
}

function sortOrderFor(name: string, allSamePage: string[]): number {
  const page = pageFromName(name) ?? 0
  const sorted = [...allSamePage].sort((a, b) => a.localeCompare(b))
  const idx = Math.max(0, sorted.indexOf(name))
  return page * 10 + idx
}

function convertPptxToPdf(srcPath: string, outDir: string): string | null {
  mkdirSync(outDir, { recursive: true })
  const ext = /\.pptx$/i.test(srcPath) ? ".pptx" : ".ppt"
  const simple = join(outDir, `in-${process.pid}-${Date.now()}${ext}`)
  copyFileSync(srcPath, simple)
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
    { encoding: "utf8", timeout: 180_000 },
  )
  try {
    unlinkSync(simple)
  } catch {
    /* ignore */
  }
  if (result.status !== 0) {
    console.error("  soffice fail", basename(srcPath), result.stderr?.slice(0, 200))
    return null
  }
  const pdfName = basename(simple).replace(/\.pptx?$/i, ".pdf")
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
    .sort(
      (a, b) =>
        (pageFromName(a) ?? 0) - (pageFromName(b) ?? 0) || a.localeCompare(b),
    )

  const byPage = new Map<number, string[]>()
  for (const name of files) {
    const page = pageFromName(name)!
    const list = byPage.get(page) ?? []
    list.push(name)
    byPage.set(page, list)
  }

  console.log(
    `src=${SRC}\npack=${PACK_SLUG} id=${PACK_ID}\nfiles=${files.length} pages=${byPage.size} apply=${APPLY} resume=${RESUME} limit=${LIMIT || "all"} fast=${FAST} shard=${SHARD.i}/${SHARD.n}`,
  )

  const workRoot = WORK_ROOT
  const pdfDir = join(workRoot, "pdf")
  const donePath = join(workRoot, "done-titles.json")
  mkdirSync(pdfDir, { recursive: true })
  mkdirSync(KEEP_PDF_DIR, { recursive: true })
  mkdirSync(join(DRIVE_WORK, "lo-profiles"), { recursive: true })
  writeFileSync(join(workRoot, "pack-id.txt"), PACK_ID)

  let doneTitles = new Set<string>()
  if (RESUME && existsSync(donePath)) {
    try {
      doneTitles = new Set(JSON.parse(readFileSync(donePath, "utf8")) as string[])
      console.log(`resume: skipping ${doneTitles.size} titles from done-titles.json`)
    } catch {
      /* ignore */
    }
  } else if (APPLY && !RESUME) {
    writeFileSync(donePath, "[]")
  }

  if (APPLY && !RESUME) {
    const existing = await db.execute({
      sql: "SELECT id FROM song_packs WHERE id = ?",
      args: [PACK_ID],
    })
    if (!existing.rows[0]) {
      await db.execute({
        sql: `INSERT INTO song_packs (
          id, name, slug, description, event_year, sort_order, is_published, is_library
        ) VALUES (?, ?, ?, ?, 2027, 52, 1, 1)`,
        args: [
          PACK_ID,
          PACK_NAME,
          PACK_SLUG,
          "Full The Paperless Hymnal songbook (numbered)",
        ],
      })
      console.log("created pack", PACK_ID)
    } else {
      await db.execute({
        sql: `UPDATE song_packs
              SET name = ?, slug = ?, description = ?, is_library = 1, is_published = 1,
                  updated_at = datetime('now')
              WHERE id = ?`,
        args: [
          PACK_NAME,
          PACK_SLUG,
          "Full The Paperless Hymnal songbook (numbered)",
          PACK_ID,
        ],
      })
      await db.execute({
        sql: "DELETE FROM song_pack_items WHERE pack_id = ?",
        args: [PACK_ID],
      })
      console.log("cleared existing pack items")
    }
    doneTitles = new Set()
    writeFileSync(donePath, "[]")
  }

  if (APPLY && RESUME) {
    const existingPack = await db.execute({
      sql: "SELECT id FROM song_packs WHERE id = ?",
      args: [PACK_ID],
    })
    if (!existingPack.rows[0]) {
      await db.execute({
        sql: `INSERT INTO song_packs (
          id, name, slug, description, event_year, sort_order, is_published, is_library
        ) VALUES (?, ?, ?, ?, 2027, 52, 1, 1)`,
        args: [
          PACK_ID,
          PACK_NAME,
          PACK_SLUG,
          "Full The Paperless Hymnal songbook (numbered)",
        ],
      })
      console.log("created pack (resume path)", PACK_ID)
    }
    const existing = await db.execute({
      sql: "SELECT title FROM song_pack_items WHERE pack_id = ?",
      args: [PACK_ID],
    })
    for (const row of existing.rows) {
      doneTitles.add(String(row.title))
    }
    writeFileSync(donePath, JSON.stringify([...doneTitles]))
    console.log(`resume: ${doneTitles.size} songs already in pack`)
  }

  let ok = 0
  let fail = 0
  let attempted = 0

  for (const name of files) {
    const page = pageFromName(name)!
    if (SHARD.n > 1 && page % SHARD.n !== SHARD.i) continue

    const title = cleanSongTitle(name)
    if (!/^\d+\s*·\s*\S/.test(title)) {
      console.log(`skip junk filename ${name}`)
      continue
    }
    if (doneTitles.has(title)) continue
    if (LIMIT > 0 && attempted >= LIMIT) {
      console.log(`chunk cap reached (--limit=${LIMIT})`)
      break
    }
    attempted++

    console.log(`IMPORT ${name} → ${title}`)

    const pptPath = join(SRC, name)
    const pdfPath = convertPptxToPdf(pptPath, pdfDir)
    if (!pdfPath) {
      fail++
      continue
    }

    let pdfBytes = new Uint8Array(readFileSync(pdfPath))
    pdfBytes = await stripLegacyDarkTitleSlides(pdfBytes)
    writeFileSync(pdfPath, Buffer.from(pdfBytes))

    const hint = extractVerseCountHint(name)
    let verseCount = hint && hint > 0 ? hint : 0

    if (verseCount <= 0) {
      const pages = await countPdfPages(pdfBytes)
      verseCount = Math.max(1, Math.min(12, Math.round(pages / 2) || 1))
      console.log(
        `  verses estimated=${verseCount} (pages=${pages}${FAST ? " fast" : ""})`,
      )
    }

    const withTitle = await prependSongTitleSlide(pdfBytes, title, {
      verseCount,
      force: true,
      hasNativeTitle: false,
    })
    const pageCount = await countPdfPages(withTitle)
    const contentHash = createHash("sha256").update(Buffer.from(withTitle)).digest("hex")

    const keepName = `${String(page).padStart(3, "0")} ${title.replace(/^\d+\s*·\s*/, "")}.pdf`
    writeFileSync(join(KEEP_PDF_DIR, keepName), Buffer.from(withTitle))

    if (!APPLY) {
      console.log(`  dry pages=${pageCount} bytes=${withTitle.byteLength}`)
      ok++
      continue
    }

    const samePage = byPage.get(page) ?? [name]
    const sortOrder = sortOrderFor(name, samePage)
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
        sortOrder,
        fileUrl,
        withTitle.byteLength,
        contentHash,
        pageCount,
        verseCount,
      ],
    })

    doneTitles.add(title)
    writeFileSync(donePath, JSON.stringify([...doneTitles]))
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
