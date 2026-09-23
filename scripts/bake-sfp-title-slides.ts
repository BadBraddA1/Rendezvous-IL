/**
 * Convert SFP .ppt → .pptx, strip old title slides, insert uniform opener
 * (page · quoted title · N verses) into a sibling “- titled” folder.
 *
 * Pilot (10 songs):
 *   npx tsx --env-file=.env.local scripts/bake-sfp-title-slides.ts --pilot [--apply]
 *
 * Full book:
 *   npx tsx --env-file=.env.local scripts/bake-sfp-title-slides.ts --all [--apply]
 */
import { createClient } from "@libsql/client"
import { spawnSync } from "child_process"
import { existsSync, mkdirSync, readFileSync, readdirSync } from "fs"
import { basename, join } from "path"
import { tmpdir } from "os"
import { parseSongDisplayTitle } from "../lib/song-pdf-title-slide"

/** Local copy — avoid importing lib/song-packs (pulls server-only R2). */
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

const SOFFICE =
  process.env.SOFFICE ||
  "/Applications/LibreOffice.app/Contents/MacOS/soffice"
const SRC =
  process.env.SFP_PPT_SRC ||
  "/Volumes/PRO-G40-Bradd/Song Books/SFP Songbook/SFP Shape note PP 16X9 by Page number"
const OUT =
  process.env.SFP_PPT_OUT ||
  "/Volumes/PRO-G40-Bradd/Song Books/SFP Songbook/SFP Shape note PP 16X9 by Page number - titled"
const PY =
  process.env.BAKE_PY ||
  join(process.env.HOME || "", "Code/Rendezvous-IL/.tmp-bake-titles/venv/bin/python")
const BAKE_PY = join(
  process.env.HOME || "",
  "Code/Rendezvous-IL/scripts/bake_pptx_title.py",
)

const APPLY = process.argv.includes("--apply")
const ALL = process.argv.includes("--all")
const PILOT = process.argv.includes("--pilot") || !ALL
const FORCE = process.argv.includes("--force")

const PILOT_PAGES = [2, 121, 234, 356, 470, 580, 687, 796, 905, 1030]

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

function isBaseSong(name: string): boolean {
  if (!/\.ppt$/i.test(name) || /\.pptx$/i.test(name)) return false
  if (/W-Opt|3vr|optional|Refrain/i.test(name)) return false
  return /^\d{4}\s/.test(name)
}

function pageFromName(name: string): number | null {
  const m = name.match(/^(\d{4})\s/)
  return m ? Number(m[1]) : null
}

function convertToPptx(pptPath: string, outDir: string): string | null {
  mkdirSync(outDir, { recursive: true })
  const result = spawnSync(
    SOFFICE,
    ["--headless", "--convert-to", "pptx", "--outdir", outDir, pptPath],
    { encoding: "utf8", timeout: 120_000 },
  )
  if (result.status !== 0) {
    console.error("soffice fail", basename(pptPath), result.stderr?.slice(0, 200))
    return null
  }
  const base = basename(pptPath).replace(/\.ppt$/i, ".pptx")
  const dest = join(outDir, base)
  return existsSync(dest) ? dest : null
}

async function loadVerseMap(): Promise<Map<number, number>> {
  const env = loadEnv()
  const map = new Map<number, number>()
  if (!env.TURSO_DATABASE_URL || !env.TURSO_AUTH_TOKEN) return map
  try {
    const db = createClient({
      url: env.TURSO_DATABASE_URL,
      authToken: env.TURSO_AUTH_TOKEN,
    })
    const rows = await db.execute(`
      SELECT title, verse_count FROM song_pack_items
      WHERE verse_count IS NOT NULL AND verse_count > 0
    `)
    for (const row of rows.rows) {
      const title = String(row.title || "")
      const parsed = parseSongDisplayTitle(cleanSongTitle(title))
      if (parsed.pageNumber) {
        map.set(Number(parsed.pageNumber), Number(row.verse_count))
      }
    }
  } catch (e) {
    console.warn("verse map load failed", e)
  }
  return map
}

function verseHintFromFilename(name: string): number | null {
  const m = name.match(/-(\d+)vr\b/i)
  return m ? Number(m[1]) : null
}

async function main() {
  if (!existsSync(SRC)) {
    console.error("source folder missing", SRC)
    process.exit(1)
  }
  if (!existsSync(SOFFICE)) {
    console.error("LibreOffice soffice missing", SOFFICE)
    process.exit(1)
  }
  if (!existsSync(PY) || !existsSync(BAKE_PY)) {
    console.error("python bake helper missing — create venv with python-pptx")
    process.exit(1)
  }

  const verseMap = await loadVerseMap()
  const files = readdirSync(SRC)
    .filter(isBaseSong)
    .filter((name) => {
      if (!PILOT) return true
      const page = pageFromName(name)
      return page != null && PILOT_PAGES.includes(page)
    })
    .sort()

  console.log(
    `src=${SRC}\nout=${OUT}\nfiles=${files.length} mode=${PILOT ? "pilot" : "all"} apply=${APPLY}`,
  )
  mkdirSync(OUT, { recursive: true })
  const work = join(tmpdir(), `sfp-bake-${process.pid}`)
  mkdirSync(work, { recursive: true })

  let ok = 0
  let fail = 0
  for (const name of files) {
    const page = pageFromName(name)!
    const pptPath = join(SRC, name)
    const cleaned = cleanSongTitle(name)
    const { pageNumber, name: titleName } = parseSongDisplayTitle(cleaned)
    const verses =
      verseMap.get(page) ?? verseHintFromFilename(name) ?? 0

    console.log(
      `${APPLY ? "BAKE" : "dry"} ${name} → page=${pageNumber || page} title="${titleName}" verses=${verses || "?"}`,
    )
    if (!APPLY) {
      ok++
      continue
    }

    const expectedOut = join(OUT, basename(name).replace(/\.ppt$/i, ".pptx"))
    if (!FORCE && existsSync(expectedOut)) {
      console.log("  skip existing", basename(expectedOut))
      ok++
      continue
    }

    const pptx = convertToPptx(pptPath, work)
    if (!pptx) {
      fail++
      continue
    }
    const outPptx = join(OUT, basename(pptx))
    // Prefer DB / -Nvr; else estimate from slide count so every opener has “N verses”
    let verseCount = verses
    if (!verseCount) {
      const pyCount = spawnSync(
        PY,
        [
          "-c",
          "from pptx import Presentation; import sys; p=Presentation(sys.argv[1]); print(max(1,min(12,max(1,len(p.slides)//2))))",
          pptx,
        ],
        { encoding: "utf8" },
      )
      const n = Number((pyCount.stdout || "").trim())
      if (Number.isFinite(n) && n > 0) verseCount = n
    }

    const bake = spawnSync(
      PY,
      [
        BAKE_PY,
        pptx,
        outPptx,
        "--page",
        String(pageNumber || page),
        "--title",
        titleName,
        "--verses",
        String(verseCount || 0),
      ],
      { encoding: "utf8" },
    )
    if (bake.status !== 0) {
      console.error(bake.stdout, bake.stderr)
      fail++
      continue
    }
    console.log(" ", bake.stdout.trim())
    ok++
  }

  console.log(`done ok=${ok} fail=${fail}${APPLY ? "" : " (dry run — pass --apply)"}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
