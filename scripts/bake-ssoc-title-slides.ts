/**
 * Bake SSOC title openers into PowerPoints on the drive (same idea as SFP):
 * strip old title-like slides, insert page · "title" · N verses at the front.
 * Writes a sibling folder — never overwrites the source 16x9 PPTXs.
 *
 *   npx tsx --env-file=.env.local scripts/bake-ssoc-title-slides.ts --pilot [--apply]
 *   npx tsx --env-file=.env.local scripts/bake-ssoc-title-slides.ts --all [--apply] [--resume]
 */
import { createClient } from "@libsql/client"
import { spawnSync } from "child_process"
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "fs"
import { basename, join } from "path"
import { parseSongDisplayTitle } from "../lib/song-pdf-title-slide"

const SRC =
  process.env.SSOC_PPT_SRC ||
  "/Volumes/PRO-G40-Bradd/Song Books/Sacred Songs of the Church/16x9"
const OUT =
  process.env.SSOC_PPT_OUT ||
  "/Volumes/PRO-G40-Bradd/Song Books/Sacred Songs of the Church/16x9 - titled"
const PACK_ID =
  process.env.SSOC_PACK_ID || "de98d363-5295-4788-b766-5febaa4e202d"
const PY =
  process.env.BAKE_PY ||
  join(
    process.env.HOME || "",
    "Code/Rendezvous-IL/.tmp-bake-titles/venv/bin/python",
  )
const BAKE_PY = join(
  process.env.HOME || "",
  "Code/Rendezvous-IL/scripts/bake_pptx_title.py",
)
const DONE_PATH = join(
  process.env.HOME || "",
  "Code/Rendezvous-IL/.tmp-ssoc-import/bake-pptx-done.json",
)

const APPLY = process.argv.includes("--apply")
const ALL = process.argv.includes("--all")
const RESUME = process.argv.includes("--resume")
const FORCE = process.argv.includes("--force")
const PILOT = process.argv.includes("--pilot") || !ALL
const limitArg = process.argv.find((a) => a.startsWith("--limit="))
const LIMIT = limitArg ? Number(limitArg.split("=")[1]) : 0
const PILOT_PAGES = [1, 2, 16, 141, 500, 631]

function cleanSongTitle(raw: string): string {
  let s = raw.trim()
  if (!s) return s
  s = s.replace(/^.*[/\\]/, "").replace(/\.[^.]+$/i, "")
  s = s
    .replace(/\s*-\s*16x9\s*$/i, "")
    .replace(/-William.?s?\s*iMac.*/i, "")
    .replace(/[_]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .replace(/[\s-]+$/g, "")
    .trim()
  const numbered = s.match(/^(\d{1,4})\s+(.+)$/)
  if (numbered) {
    const page = Number(numbered[1])
    const name = numbered[2].replace(/^[\s.-]+/, "").trim()
    if (Number.isFinite(page) && name) return `${page} · ${name}`
  }
  return s || raw.trim()
}

function isBaseSong(name: string): boolean {
  if (!/\.pptx$/i.test(name)) return false
  if (/iMac|^\._/i.test(name)) return false
  return /^\d{1,4}\s+\S/.test(name)
}

function pageFromName(name: string): number | null {
  const m = name.match(/^(\d{1,4})\s/)
  return m ? Number(m[1]) : null
}

async function loadVerseMap(): Promise<Map<number, number>> {
  const map = new Map<number, number>()
  try {
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
      /* ignore */
    }
    const db = createClient({
      url: env.TURSO_DATABASE_URL!,
      authToken: env.TURSO_AUTH_TOKEN!,
    })
    const rows = await db.execute({
      sql: `SELECT title, verse_count FROM song_pack_items
            WHERE pack_id = ? AND verse_count IS NOT NULL AND verse_count > 0`,
      args: [PACK_ID],
    })
    for (const row of rows.rows) {
      const parsed = parseSongDisplayTitle(String(row.title))
      if (parsed.pageNumber) {
        map.set(Number(parsed.pageNumber), Number(row.verse_count))
      }
    }
  } catch (e) {
    console.warn("verse map load failed", e)
  }
  return map
}

async function main() {
  if (!existsSync(SRC)) {
    console.error("source folder missing", SRC)
    process.exit(1)
  }
  if (!existsSync(PY) || !existsSync(BAKE_PY)) {
    console.error("python bake helper missing", PY, BAKE_PY)
    process.exit(1)
  }

  const verseMap = await loadVerseMap()
  let done = new Set<string>()
  if (RESUME && existsSync(DONE_PATH)) {
    try {
      done = new Set(JSON.parse(readFileSync(DONE_PATH, "utf8")) as string[])
      console.log(`resume: ${done.size} already baked`)
    } catch {
      /* ignore */
    }
  }

  const files = readdirSync(SRC)
    .filter(isBaseSong)
    .filter((name) => {
      if (!PILOT) return true
      const page = pageFromName(name)
      return page != null && PILOT_PAGES.includes(page)
    })
    .sort(
      (a, b) =>
        (pageFromName(a) ?? 0) - (pageFromName(b) ?? 0) || a.localeCompare(b),
    )

  console.log(
    `src=${SRC}\nout=${OUT}\nfiles=${files.length} verses=${verseMap.size} mode=${PILOT ? "pilot" : "all"} apply=${APPLY} resume=${RESUME}`,
  )
  mkdirSync(OUT, { recursive: true })
  mkdirSync(join(process.env.HOME || "", "Code/Rendezvous-IL/.tmp-ssoc-import"), {
    recursive: true,
  })

  let ok = 0
  let fail = 0
  let skipped = 0
  let attempted = 0
  for (const name of files) {
    const page = pageFromName(name)!
    if (done.has(name)) {
      skipped++
      continue
    }
    if (LIMIT > 0 && attempted >= LIMIT) break
    attempted++

    const cleaned = cleanSongTitle(name)
    const { pageNumber, name: titleName } = parseSongDisplayTitle(cleaned)
    let verses = verseMap.get(page) ?? 0

    console.log(
      `${APPLY ? "BAKE" : "dry"} ${name} → page=${pageNumber || page} title="${titleName}" verses=${verses || "?"}`,
    )
    if (!APPLY) {
      ok++
      continue
    }

    const outName = basename(name).replace(/\s*-\s*16x9\.pptx$/i, " - titled.pptx")
    const outPptx = join(OUT, outName)
    if (!FORCE && existsSync(outPptx) && done.has(name)) {
      skipped++
      continue
    }

    const pptPath = join(SRC, name)
    if (!verses) {
      const pyCount = spawnSync(
        PY,
        [
          "-c",
          "from pptx import Presentation; import sys; p=Presentation(sys.argv[1]); print(max(1,min(12,max(1,len(p.slides)//2))))",
          pptPath,
        ],
        { encoding: "utf8" },
      )
      const n = Number((pyCount.stdout || "").trim())
      if (Number.isFinite(n) && n > 0) verses = n
    }

    const bake = spawnSync(
      PY,
      [
        BAKE_PY,
        pptPath,
        outPptx,
        "--page",
        String(pageNumber || page),
        "--title",
        titleName,
        "--verses",
        String(verses || 0),
      ],
      { encoding: "utf8" },
    )
    if (bake.status !== 0) {
      console.error(bake.stdout, bake.stderr)
      fail++
      continue
    }
    console.log(" ", bake.stdout.trim())
    done.add(name)
    writeFileSync(DONE_PATH, JSON.stringify([...done]))
    ok++
  }

  console.log(
    `done ok=${ok} skip=${skipped} fail=${fail}${APPLY ? "" : " (dry — pass --apply)"}`,
  )
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
