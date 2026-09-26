/**
 * Full song-book lyric OCR via Gemini (Vercel AI Gateway) → R2 + Turso.
 *
 * Prefers local 1-page full-song PDFs (~/Code/sfp-full-pdf); falls back to CDN
 * pack PDFs (skips title opener, sends up to MAX_CDN_PAGES music slides).
 *
 * Chorus handling (matches pilot on #2 / #4):
 *   - Gemini returns verses[] + chorus separately
 *   - We append the chorus under EVERY verse so Text mode shows it while singing
 *   - verse_count = sung verses only (chorus is not an extra verse)
 *
 *   npx tsx --env-file=.env.local scripts/gemini-sfp-book-ocr.ts \
 *     [--apply] [--limit=N] [--concurrency=4] [--model=google/gemini-2.5-flash] \
 *     [--from-page=N] [--only=2,4,480] [--min-pages=N] [--suspect-verses] [--force] \
 *     [--pack-id=UUID] [--local-pdf-dir=PATH] [--out=PATH]
 *
 * --min-pages=N: skip pack items with page_count < N (use 3 to ignore
 *   title+1 truncated PPTX conversions until rebake).
 *
 * --suspect-verses: re-check songs with odd verse counts:
 *   - high: verse_count >= 7
 *   - low for a fat pack: verse_count <= 1 and page_count >= 9
 *   - still missing Gemini lyrics (empty / failed earlier)
 * Implies --force for those rows.
 *
 * Resume-safe: skips items whose ocr_url already has method=gemini_vision_v1
 * (or --force / --suspect-verses to redo). JSONL progress: /tmp/sfp-gemini-ocr.jsonl
 */
import { createClient } from "@libsql/client"
import { spawnSync } from "child_process"
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "fs"
import { basename, join } from "path"

const APPLY = process.argv.includes("--apply")
const FORCE = process.argv.includes("--force")
const SUSPECT_VERSES = process.argv.includes("--suspect-verses")
const limitArg = process.argv.find((a) => a.startsWith("--limit="))
const LIMIT = limitArg ? Number(limitArg.split("=")[1]) : 0
const concArg = process.argv.find((a) => a.startsWith("--concurrency="))
const CONCURRENCY = Math.max(1, Math.min(16, Number(concArg?.split("=")[1] || 8)))
const modelArg = process.argv.find((a) => a.startsWith("--model="))
const MODEL =
  modelArg?.slice("--model=".length) ||
  process.env.GEMINI_OCR_MODEL ||
  "google/gemini-2.5-flash"
const fromPageArg = process.argv.find((a) => a.startsWith("--from-page="))
const FROM_PAGE = fromPageArg ? Number(fromPageArg.split("=")[1]) : 0
const onlyArg = process.argv.find((a) => a.startsWith("--only="))
const ONLY = new Set(
  (onlyArg?.slice("--only=".length) || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map(Number)
    .filter((n) => n > 0),
)
const minPagesArg = process.argv.find((a) => a.startsWith("--min-pages="))
const MIN_PAGES = minPagesArg ? Number(minPagesArg.split("=")[1]) : 0
const outArg = process.argv.find((a) => a.startsWith("--out="))
const packIdArg = process.argv.find((a) => a.startsWith("--pack-id="))
const localPdfArg = process.argv.find((a) => a.startsWith("--local-pdf-dir="))
const PACK_ID =
  packIdArg?.slice("--pack-id=".length) ||
  process.env.SFP_PACK_ID ||
  "3eac16b6-fc68-43db-9d82-5cd7ccd2d5ce"
const LOCAL_PDF_DIR =
  localPdfArg?.slice("--local-pdf-dir=".length) ||
  process.env.SFP_FULL_PDF_DIR ||
  join(process.env.HOME || "", "Code/sfp-full-pdf")
const OUT =
  outArg?.slice("--out=".length) ||
  (PACK_ID === "3eac16b6-fc68-43db-9d82-5cd7ccd2d5ce"
    ? "/tmp/sfp-gemini-ocr.jsonl"
    : `/tmp/gemini-ocr-${PACK_ID.slice(0, 8)}.jsonl`)
const PY =
  process.env.SFP_PY ||
  join(
    process.env.HOME || "",
    "Code/Rendezvous-IL/scripts/sfp-lyric-band-ocr/.venv/bin/python",
  )
const GATEWAY = "https://ai-gateway.vercel.sh/v1"
const METHOD = "gemini_vision_v1"
const MAX_CDN_PAGES = 6
/** Multi-page pack PDFs (SSOC etc.): skip title opener, send more music slides. */
const MAX_MULTI_PAGES = 14
const REQUEST_TIMEOUT_MS = 120_000
/** Treat these as “odd” for --suspect-verses. */
const SUSPECT_HIGH_VC = 7
const SUSPECT_LOW_VC = 1
const SUSPECT_FAT_PAGES = 9

const SYSTEM = `You extract singable hymn lyrics from church songbook projection slides (shape-note / lyric slides).

Output ONLY valid JSON:
{"verses":[{"index":1,"text":"line1\\nline2"},...],"chorus":{"text":"line1\\nline2"}|null,"confidence":0.0-1.0}

Rules:
- Join hyphenated syllables: "Hal-le - lu - jah" → "Hallelujah", "glo - ry" → "glory".
- Prefer natural hymn verse counts (usually 2–5 sung verses). Do not split every music system into its own verse.
- Put the shared refrain/chorus in "chorus" (once), exactly as on the slide — e.g. "Hallelujah! Thine the glory…" or "Praise the Lord, praise the Lord…".
- Chorus/refrain must include EVERY sung line of the refrain. Never truncate mid-phrase (watch for wrap-under-music second lines like "And His glory is exalted…").
- Verse text is verse-only: do NOT paste the chorus into each verse.
- If the song has no separate chorus/refrain, set "chorus": null.
- Do NOT invent lyrics that are not visible. Prefer incomplete over fabricated.
- Drop author, scripture refs, copyright, page numbers, Fine / D.S. / music directions.
- Real poetic line breaks only (as in the hymnal).
- confidence: how sure you are the text matches the slide (0.5–1.0).`

type Item = {
  id: string
  title: string
  file_url: string
  page: number | null
  verse_count: number | null
  page_count: number | null
  ocr_url: string | null
  ocr_status: string | null
}

function loadEnv() {
  const env: Record<string, string> = { ...process.env } as Record<string, string>
  for (const path of [
    ".env.local",
    join(process.env.HOME || "", ".config/openai/agent.env"),
  ]) {
    try {
      for (const line of readFileSync(path, "utf8").split("\n")) {
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
        if (!env[k]) env[k] = v
      }
    } catch {
      /* ignore */
    }
  }
  return env
}

function pageFromTitle(title: string): number | null {
  const m = title.trim().match(/^(\d{1,4})\s*[·.•\-–—]/)
  return m ? Number(m[1]) : null
}

function indexLocalPdfs(dir: string): Map<number, string> {
  const map = new Map<number, string>()
  if (!dir || !existsSync(dir)) return map
  try {
    if (!statSync(dir).isDirectory()) return map
  } catch {
    return map
  }
  for (const name of readdirSync(dir)) {
    if (!name.toLowerCase().endsWith(".pdf")) continue
    const m = name.match(/^0*(\d+)/)
    if (!m) continue
    map.set(Number(m[1]), join(dir, name))
  }
  return map
}

/** Page count via pymupdf (cheap). */
function pdfPageCount(pdfPath: string): number {
  const r = spawnSync(
    PY,
    [
      "-c",
      "import sys,warnings; warnings.filterwarnings('ignore'); import pymupdf; print(len(pymupdf.open(sys.argv[1])))",
      pdfPath,
    ],
    { encoding: "utf8" },
  )
  if (r.status !== 0) return 0
  const n = Number((r.stdout || "").trim())
  return Number.isFinite(n) ? n : 0
}

/** Render PDF pages → PNG base64 list (pymupdf). */
function renderPdfPages(
  pdfPath: string,
  opts: { maxPages: number; skipTitle: boolean; scale?: number },
): string[] {
  const scale = opts.scale ?? 2.5
  const script = `
import sys, base64, warnings, json
warnings.filterwarnings('ignore')
import pymupdf
path, max_pages, skip_title, scale = sys.argv[1], int(sys.argv[2]), sys.argv[3]=='1', float(sys.argv[4])
doc = pymupdf.open(path)
out = []
start = 1 if (skip_title and len(doc) > 1) else 0
for i in range(start, min(len(doc), start + max_pages)):
    pix = doc[i].get_pixmap(matrix=pymupdf.Matrix(scale, scale), alpha=False)
    out.append(base64.b64encode(pix.tobytes('png')).decode())
print(json.dumps(out))
`
  const r = spawnSync(
    PY,
    [
      "-c",
      script,
      pdfPath,
      String(opts.maxPages),
      opts.skipTitle ? "1" : "0",
      String(scale),
    ],
    { encoding: "utf8", maxBuffer: 80_000_000 },
  )
  if (r.status !== 0) {
    throw new Error((r.stderr || r.stdout || "render failed").slice(0, 400))
  }
  const raw = r.stdout.trim()
  const start = raw.indexOf("[")
  return JSON.parse(start >= 0 ? raw.slice(start) : raw) as string[]
}

async function downloadToTemp(url: string, dest: string): Promise<void> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`download ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  writeFileSync(dest, buf)
}

function fixSoftWraps(text: string): string {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
  if (lines.length <= 1) return lines.join("\n")
  const out: string[] = []
  for (const line of lines) {
    const prev = out[out.length - 1]
    if (!prev) {
      out.push(line)
      continue
    }
    const prevEndsHard = /[.!?:;"”']$/.test(prev)
    const prevEndsHyphen = /-$/.test(prev)
    const nextContinues =
      /^[a-z]/.test(line) ||
      prevEndsHyphen ||
      (/[a-zA-Z]$/.test(prev) && /^[a-z]/.test(line))
    if (!prevEndsHard && (prevEndsHyphen || nextContinues)) {
      out[out.length - 1] = prevEndsHyphen
        ? prev.slice(0, -1) + line
        : `${prev} ${line}`
    } else {
      out.push(line)
    }
  }
  return out.join("\n")
}

/** Append chorus under every verse for Text-mode singing. */
function versesWithChorus(
  verses: { index: number; text: string }[],
  chorus: string | null,
): { index: number; text: string; lines: string[] }[] {
  const c = chorus?.trim() || null
  return verses
    .map((v, i) => {
      const body = fixSoftWraps(
        String(v.text || "")
          .replace(/\\n/g, "\n")
          .trim(),
      )
      if (!body) return null
      const text = c ? `${body}\n\n${c}` : body
      return {
        index: Number(v.index) || i + 1,
        text,
        lines: text.split("\n"),
      }
    })
    .filter(Boolean) as { index: number; text: string; lines: string[] }[]
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

/** Soft pacing between Gemini calls (0 = full concurrency). Paid Gateway: keep low. */
const MIN_GAP_MS = Math.max(
  0,
  Number(process.env.GEMINI_OCR_MIN_GAP_MS ?? "200"),
)
let lastGeminiAt = 0
const rateLock = { p: Promise.resolve() }

async function withRateLimit<T>(fn: () => Promise<T>): Promise<T> {
  if (MIN_GAP_MS <= 0) return fn()
  let release!: () => void
  const prev = rateLock.p
  rateLock.p = new Promise<void>((r) => {
    release = r
  })
  await prev
  try {
    const wait = Math.max(0, MIN_GAP_MS - (Date.now() - lastGeminiAt))
    if (wait > 0) await sleep(wait)
    lastGeminiAt = Date.now()
    return await fn()
  } finally {
    release()
  }
}

async function callGemini(
  apiKey: string,
  title: string,
  imagesB64: string[],
): Promise<{
  verses: { index: number; text: string }[]
  chorus: string | null
  confidence: number
  raw?: string
  error?: string
}> {
  const content: unknown[] = [
    {
      type: "text",
      text: `Song: ${title}\nExtract verses + chorus from ${imagesB64.length === 1 ? "this slide" : "these slides"}.`,
    },
  ]
  for (const b64 of imagesB64) {
    content.push({
      type: "image_url",
      image_url: { url: `data:image/png;base64,${b64}` },
    })
  }

  const body = JSON.stringify({
    model: MODEL,
    temperature: 0.1,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM },
      { role: "user", content },
    ],
  })

  let lastErr = ""
  for (let attempt = 0; attempt < 8; attempt++) {
    const result = await withRateLimit(async () => {
      const ac = new AbortController()
      const timer = setTimeout(() => ac.abort(), REQUEST_TIMEOUT_MS)
      try {
        const res = await fetch(`${GATEWAY}/chat/completions`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          signal: ac.signal,
          body,
        })
        const raw = await res.text()
        return { res, raw }
      } finally {
        clearTimeout(timer)
      }
    })

    if (result.res.status === 429) {
      const retryAfter = Number(result.res.headers.get("retry-after") || 0)
      const m = result.raw.match(/Retry after (\d+)s/i)
      const waitSec = Math.max(retryAfter, m ? Number(m[1]) : 60, 55)
      lastErr = `429 retry in ${waitSec}s`
      console.log(`  rate-limit ${title}: sleeping ${waitSec}s`)
      await sleep(waitSec * 1000)
      continue
    }
    if (!result.res.ok) {
      return {
        verses: [],
        chorus: null,
        confidence: 0,
        error: `gemini ${result.res.status}: ${result.raw.slice(0, 300)}`,
      }
    }
    const data = JSON.parse(result.raw) as {
      choices?: { message?: { content?: string } }[]
    }
    const text = data.choices?.[0]?.message?.content || "{}"
    let parsed: {
      verses?: { index?: number; text?: string }[]
      chorus?: { text?: string } | null
      confidence?: number
    }
    try {
      parsed = JSON.parse(text)
    } catch {
      return {
        verses: [],
        chorus: null,
        confidence: 0,
        error: "bad json",
        raw: text.slice(0, 500),
      }
    }
    const verses = (parsed.verses || [])
      .map((v, i) => ({
        index: Number(v.index) || i + 1,
        text: String(v.text || "").trim(),
      }))
      .filter((v) => v.text)
    const chorus = parsed.chorus?.text?.trim()
      ? fixSoftWraps(parsed.chorus.text.replace(/\\n/g, "\n"))
      : null
    const confidence = Math.min(
      1,
      Math.max(0, Number(parsed.confidence) || (verses.length ? 0.85 : 0)),
    )
    return { verses, chorus, confidence }
  }
  return {
    verses: [],
    chorus: null,
    confidence: 0,
    error: lastErr || "rate limit exhausted",
  }
}

async function alreadyGemini(ocrUrl: string | null): Promise<boolean> {
  // Suspect pass always re-reads (counts look wrong).
  if (FORCE || SUSPECT_VERSES || !ocrUrl) return false
  // Fast path: our persist key embeds the method marker.
  if (ocrUrl.includes(".v4-gemini.json")) return true
  try {
    const res = await fetch(ocrUrl, { cache: "no-store" })
    if (!res.ok) return false
    const j = (await res.json()) as { method?: string }
    return j.method === METHOD
  } catch {
    return false
  }
}

function isSuspectVerses(item: Item): boolean {
  const vc = item.verse_count
  const pc = item.page_count ?? 0
  const missingGemini = !item.ocr_url || !item.ocr_url.includes(".v4-gemini.json")
  // High counts were often page-heuristic lies on the title slide.
  if (vc != null && vc >= SUSPECT_HIGH_VC) return true
  // One “verse” on a multi-slide deck is often under-split / empty OCR.
  if (vc != null && vc <= SUSPECT_LOW_VC && pc >= SUSPECT_FAT_PAGES) return true
  // Never successfully Gemini'd (empty-verse fails, old OCR only).
  if (missingGemini && pc >= 3) return true
  return false
}

async function persistOne(
  env: Record<string, string>,
  item: Item,
  payload: Record<string, unknown>,
): Promise<boolean> {
  const worker = (env.R2_UPLOAD_WORKER_URL || "").replace(/\/$/, "")
  const secret = env.R2_UPLOAD_SECRET || ""
  const publicBase = (
    env.R2_PUBLIC_BASE_URL || "https://cdn.rendezvousil.com"
  ).replace(/\/$/, "")
  if (!worker || !secret) throw new Error("R2 upload env missing")

  const key = `song-packs/${PACK_ID}/ocr/${item.id}.v4-gemini.json`
  const body = Buffer.from(JSON.stringify(payload), "utf8")
  const put = await fetch(`${worker}/object?key=${encodeURIComponent(key)}`, {
    method: "PUT",
    headers: {
      "x-upload-secret": secret,
      "content-type": "application/json",
    },
    body,
  })
  if (!put.ok) {
    console.error("  upload fail", put.status, await put.text().catch(() => ""))
    return false
  }
  const ocrUrl = `${publicBase}/${key}`
  const verses = payload.verses as { index: number }[]
  const verseCount =
    Number(payload.verse_count) > 0
      ? Math.max(1, Math.min(12, Math.floor(Number(payload.verse_count))))
      : verses?.length || null

  const db = createClient({
    url: env.TURSO_DATABASE_URL!,
    authToken: env.TURSO_AUTH_TOKEN!,
  })
  await db.execute({
    sql: `UPDATE song_pack_items
          SET ocr_url = ?,
              ocr_status = ?,
              ocr_confidence = ?,
              verse_count = COALESCE(?, verse_count),
              updated_at = datetime('now')
          WHERE id = ?`,
    args: [
      ocrUrl,
      payload.status,
      payload.confidence,
      verseCount,
      item.id,
    ],
  })
  return true
}

async function processItem(
  env: Record<string, string>,
  item: Item,
  localPdfs: Map<number, string>,
  tmpDir: string,
): Promise<void> {
  if (await alreadyGemini(item.ocr_url)) {
    console.log(`SKIP ${item.title} (already ${METHOD})`)
    return
  }

  let images: string[] = []
  let source = "cdn"
  try {
    if (item.page != null && localPdfs.has(item.page)) {
      const path = localPdfs.get(item.page)!
      // SFP local full-song PDFs are 1–3 pages (whole song on one sheet).
      // SSOC / pack PDFs are title + many music slides — need skipTitle + more pages.
      const pages = item.page_count && item.page_count > 0
        ? item.page_count
        : pdfPageCount(path)
      if (pages <= 3) {
        images = renderPdfPages(path, { maxPages: 3, skipTitle: false })
      } else {
        const musicPages = Math.max(1, pages - 1)
        images = renderPdfPages(path, {
          maxPages: Math.min(musicPages, MAX_MULTI_PAGES),
          skipTitle: true,
        })
      }
      source = `local:${basename(path)}`
    } else if (item.file_url) {
      const dest = join(tmpDir, `${item.id}.pdf`)
      await downloadToTemp(item.file_url, dest)
      const pages = item.page_count && item.page_count > 0
        ? item.page_count
        : pdfPageCount(dest)
      const musicPages = Math.max(1, pages > 1 ? pages - 1 : pages)
      images = renderPdfPages(dest, {
        maxPages: Math.min(musicPages, Math.max(MAX_CDN_PAGES, MAX_MULTI_PAGES)),
        skipTitle: pages > 1,
      })
      source = "cdn"
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.log(`FAIL ${item.title} render: ${msg.slice(0, 200)}`)
    appendFileSync(
      OUT,
      JSON.stringify({
        item_id: item.id,
        title: item.title,
        printed_page: item.page,
        error: msg,
        method: METHOD,
        status: "needs_review",
      }) + "\n",
    )
    return
  }

  if (!images.length) {
    console.log(`FAIL ${item.title} no images`)
    return
  }

  const apiKey = env.AI_GATEWAY_API_KEY!
  const result = await callGemini(apiKey, item.title, images)
  if (result.error || !result.verses.length) {
    console.log(
      `FAIL ${item.title} gemini: ${result.error || "empty verses"}`,
    )
    appendFileSync(
      OUT,
      JSON.stringify({
        item_id: item.id,
        title: item.title,
        printed_page: item.page,
        error: result.error || "empty",
        method: METHOD,
        status: "needs_review",
        confidence: 0,
        verses: [],
        source,
      }) + "\n",
    )
    return
  }

  const withChorus = versesWithChorus(result.verses, result.chorus)
  const status =
    result.confidence >= 0.75 && withChorus.length > 0 ? "auto" : "needs_review"
  const payload = {
    item_id: item.id,
    title: item.title,
    printed_page: item.page,
    method: METHOD,
    confidence: result.confidence,
    status,
    verse_count: result.verses.length,
    chorus: result.chorus ? { text: result.chorus } : null,
    verses: withChorus,
    pages: withChorus.map((v) => ({
      index: Math.max(0, v.index - 1),
      text: v.text,
      confidence: result.confidence,
    })),
    source,
    model: MODEL,
  }

  const chorusNote = result.chorus ? " +chorus" : ""
  console.log(
    `${APPLY ? "OK" : "DRY"} ${item.title} v=${result.verses.length}${chorusNote} conf=${result.confidence.toFixed(2)} via ${source}`,
  )
  appendFileSync(OUT, JSON.stringify(payload) + "\n")

  if (APPLY) {
    const ok = await persistOne(env, item, payload)
    if (!ok) console.log(`  persist fail ${item.title}`)
  }
}

async function mapPool<T>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<void>,
) {
  let i = 0
  const workers = Array.from({ length: concurrency }, async () => {
    while (true) {
      const idx = i++
      if (idx >= items.length) break
      await fn(items[idx]!)
    }
  })
  await Promise.all(workers)
}

async function main() {
  const env = loadEnv()
  if (!env.AI_GATEWAY_API_KEY) {
    console.error("AI_GATEWAY_API_KEY missing")
    process.exit(1)
  }
  if (!env.TURSO_DATABASE_URL || !env.TURSO_AUTH_TOKEN) {
    console.error("Turso env missing")
    process.exit(1)
  }
  if (!existsSync(PY)) {
    console.error("python venv missing:", PY)
    process.exit(1)
  }

  const db = createClient({
    url: env.TURSO_DATABASE_URL,
    authToken: env.TURSO_AUTH_TOKEN,
  })
  const r = await db.execute({
    sql: `SELECT id, title, file_url, verse_count, page_count, ocr_url, ocr_status
          FROM song_pack_items
          WHERE pack_id = ?
          ORDER BY sort_order, title`,
    args: [PACK_ID],
  })

  let items: Item[] = r.rows.map((row) => {
    const title = String(row.title)
    return {
      id: String(row.id),
      title,
      file_url: String(row.file_url || ""),
      page: pageFromTitle(title),
      verse_count: row.verse_count != null ? Number(row.verse_count) : null,
      page_count: row.page_count != null ? Number(row.page_count) : null,
      ocr_url: row.ocr_url ? String(row.ocr_url) : null,
      ocr_status: row.ocr_status ? String(row.ocr_status) : null,
    }
  })

  if (SUSPECT_VERSES) {
    items = items.filter(isSuspectVerses)
    console.log(
      `suspect-verses filter: high>=${SUSPECT_HIGH_VC} or (vc<=${SUSPECT_LOW_VC} & pages>=${SUSPECT_FAT_PAGES}) or missing gemini`,
    )
  }
  if (ONLY.size) {
    items = items.filter((it) => it.page != null && ONLY.has(it.page))
  }
  if (FROM_PAGE > 0) {
    items = items.filter((it) => (it.page ?? 0) >= FROM_PAGE)
  }
  if (MIN_PAGES > 0) {
    const before = items.length
    items = items.filter((it) => (it.page_count ?? 0) >= MIN_PAGES)
    console.log(
      `min-pages=${MIN_PAGES}: kept ${items.length}/${before} (skipped truncated/short PDFs)`,
    )
  }
  if (LIMIT > 0) items = items.slice(0, LIMIT)

  const localPdfs = indexLocalPdfs(LOCAL_PDF_DIR)
  const tmpDir = "/tmp/sfp-gemini-pdfs"
  mkdirSync(tmpDir, { recursive: true })

  console.log(
    `gemini OCR items=${items.length} localPdfs=${localPdfs.size} concurrency=${CONCURRENCY} model=${MODEL} apply=${APPLY} suspect=${SUSPECT_VERSES} minPages=${MIN_PAGES || "off"}`,
  )

  await mapPool(items, CONCURRENCY, (item) =>
    processItem(env, item, localPdfs, tmpDir),
  )
  console.log("done →", OUT)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
