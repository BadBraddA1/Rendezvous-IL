/**
 * Clean full-song OCR JSONL with OpenAI (gpt-4o-mini).
 *
 *   npx tsx --env-file=.env.local scripts/clean-sfp-ocr-agent.ts \
 *     --from=/tmp/sfp-book-ocr-all.jsonl \
 *     --out=/tmp/sfp-book-ocr-clean.jsonl \
 *     [--limit=N] [--concurrency=6]
 *
 * Resumes: skips titles already present in --out.
 */
import { createReadStream, existsSync, readFileSync, appendFileSync, writeFileSync } from "fs"
import { createInterface } from "readline"

const fromArg = process.argv.find((a) => a.startsWith("--from="))
const FROM = fromArg?.slice("--from=".length)
const outArg = process.argv.find((a) => a.startsWith("--out="))
const OUT = outArg?.slice("--out=".length) || "/tmp/sfp-book-ocr-clean.jsonl"
const limitArg = process.argv.find((a) => a.startsWith("--limit="))
const LIMIT = limitArg ? Number(limitArg.split("=")[1]) : 0
const concArg = process.argv.find((a) => a.startsWith("--concurrency="))
const CONCURRENCY = Math.max(1, Number(concArg?.split("=")[1] || 6))
const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini"

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
  try {
    for (const line of readFileSync(
      `${process.env.HOME}/.config/openai/agent.env`,
      "utf8",
    ).split("\n")) {
      if (!line || line.startsWith("#") || !line.includes("=")) continue
      const i = line.indexOf("=")
      const k = line.slice(0, i).trim()
      if (env[k]) continue
      env[k] = line.slice(i + 1).trim()
    }
  } catch {
    /* ignore */
  }
  return env
}

type InRow = {
  item_id?: string | null
  title?: string
  printed_page?: number | null
  matched?: boolean
  confidence?: number
  status?: string
  method?: string
  verses?: { index: number; text: string; lines?: string[] }[]
  pages?: { index: number; text: string; confidence?: number }[]
  ppt?: string
  pdf?: string
}

const SYSTEM = `You clean OCR text from Songs of Faith and Praise shape-note hymn slides into singable lyrics for a church app Text mode.

Rules:
- Output ONLY valid JSON (no markdown fences).
- Shape: {"verses":[{"index":1,"text":"line1\\nline2"},...],"chorus":{"text":"..."}|null,"title":"...","confidence":0.0-1.0}
- Join hyphenated syllables: "glo - ry" → "glory", "Hal-le - lu - jah" → "Hallelujah".
- Fix obvious OCR typos using hymn context; do NOT invent whole verses that are absent from the OCR.
- If OCR is fragmentary, reconstruct the best complete lines you can from the fragments; omit lines you cannot support.
- Drop author, scripture refs, copyright, and publisher footers from verses (optional tiny "meta" is fine but prefer verses only).
- Prefer verse numbers 1..N matching the song; put refrain/chorus in "chorus" when clearly a chorus (e.g. Hallelujah! Thine the glory…).
- Keep traditional hymn capitalization and punctuation.
- confidence: how sure you are the cleaned text matches the source OCR intent (0.5–1.0).`

function rawBlob(row: InRow): string {
  const verses = row.verses || []
  if (verses.length) {
    return verses.map((v) => `[V${v.index}]\n${v.text || ""}`).join("\n\n")
  }
  return (row.pages || []).map((p) => p.text || "").join("\n\n")
}

async function cleanOne(
  apiKey: string,
  row: InRow,
): Promise<{
  verses: { index: number; text: string; lines: string[] }[]
  confidence: number
  status: string
  method: string
  error?: string
}> {
  const blob = rawBlob(row)
  if (!blob.trim() || blob.trim().length < 20) {
    return {
      verses: [],
      confidence: 0,
      status: "needs_review",
      method: "agent_cleanup_v1",
      error: "empty OCR",
    }
  }

  const user = `Song title: ${row.title || row.printed_page || "unknown"}
Printed page: ${row.printed_page ?? "?"}

OCR text:
---
${blob.slice(0, 6000)}
---`

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: user },
      ],
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    return {
      verses: row.verses?.map((v) => ({
        index: v.index,
        text: v.text || "",
        lines: (v.text || "").split("\n"),
      })) || [],
      confidence: Number(row.confidence) || 0,
      status: "needs_review",
      method: "agent_cleanup_v1",
      error: `openai ${res.status}: ${err.slice(0, 200)}`,
    }
  }
  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[]
  }
  const content = data.choices?.[0]?.message?.content || "{}"
  let parsed: {
    verses?: { index?: number; text?: string }[]
    chorus?: { text?: string } | null
    confidence?: number
  }
  try {
    parsed = JSON.parse(content)
  } catch {
    return {
      verses: [],
      confidence: 0,
      status: "needs_review",
      method: "agent_cleanup_v1",
      error: "bad json from model",
    }
  }

  const verses: { index: number; text: string; lines: string[] }[] = []
  for (const v of parsed.verses || []) {
    const text = String(v.text || "")
      .replace(/\\n/g, "\n")
      .trim()
    if (!text) continue
    verses.push({
      index: Number(v.index) || verses.length + 1,
      text,
      lines: text.split("\n"),
    })
  }
  const chorus = parsed.chorus?.text?.trim()
  if (chorus) {
    const text = chorus.replace(/\\n/g, "\n")
    verses.push({
      index: (verses[verses.length - 1]?.index || 0) + 1,
      text: `Chorus\n${text}`,
      lines: ["Chorus", ...text.split("\n")],
    })
  }

  const confidence = Math.min(
    1,
    Math.max(0, Number(parsed.confidence) || 0.8),
  )
  const status =
    verses.length === 0 || confidence < 0.55 || verses.every((v) => v.text.length < 20)
      ? "needs_review"
      : "auto"

  return { verses, confidence, status, method: "agent_cleanup_v1" }
}

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, i: number) => Promise<R>,
): Promise<R[]> {
  const out: R[] = new Array(items.length)
  let next = 0
  async function worker() {
    while (true) {
      const i = next++
      if (i >= items.length) return
      out[i] = await fn(items[i], i)
    }
  }
  await Promise.all(Array.from({ length: concurrency }, () => worker()))
  return out
}

async function main() {
  if (!FROM || !existsSync(FROM)) {
    console.error("pass --from=/path/to/ocr.jsonl")
    process.exit(1)
  }
  const env = loadEnv()
  const apiKey = env.OPENAI_API_KEY
  if (!apiKey) {
    console.error("OPENAI_API_KEY missing")
    process.exit(1)
  }

  const done = new Set<string>()
  if (existsSync(OUT)) {
    for (const line of readFileSync(OUT, "utf8").split("\n")) {
      if (!line.trim()) continue
      try {
        const row = JSON.parse(line)
        const k = row.item_id || row.title || String(row.printed_page)
        if (k) done.add(String(k))
      } catch {
        /* ignore */
      }
    }
  }

  const pending: InRow[] = []
  const rl = createInterface({ input: createReadStream(FROM), crlfDelay: Infinity })
  for await (const line of rl) {
    if (!line.trim()) continue
    let row: InRow
    try {
      row = JSON.parse(line)
    } catch {
      continue
    }
    const k = row.item_id || row.title || String(row.printed_page)
    if (k && done.has(String(k))) continue
    pending.push(row)
    if (LIMIT > 0 && pending.length >= LIMIT) break
  }

  console.log(
    `clean pending=${pending.length} already=${done.size} concurrency=${CONCURRENCY} model=${MODEL}`,
  )

  let ok = 0
  let fail = 0
  await mapPool(pending, CONCURRENCY, async (row, i) => {
    const cleaned = await cleanOne(apiKey, row)
    const outRow = {
      item_id: row.item_id,
      title: row.title,
      printed_page: row.printed_page,
      matched: row.matched,
      method: cleaned.method,
      confidence: cleaned.confidence,
      status: cleaned.status,
      verse_count: cleaned.verses.filter((v) => !v.text.startsWith("Chorus")).length,
      verses: cleaned.verses,
      pages: [
        {
          index: 0,
          printed_page: row.printed_page,
          text: cleaned.verses.map((v) => v.text).join("\n\n"),
          confidence: cleaned.confidence,
        },
      ],
      ppt: row.ppt,
      pdf: row.pdf,
      error: cleaned.error,
      source_method: row.method,
    }
    appendFileSync(OUT, JSON.stringify(outRow) + "\n")
    if (cleaned.error || cleaned.status === "needs_review") fail++
    else ok++
    const sample = (cleaned.verses[0]?.text || "").replace(/\n/g, " / ").slice(0, 70)
    console.log(
      `[${i + 1}/${pending.length}] ${row.title || row.printed_page} conf=${cleaned.confidence.toFixed(2)} status=${cleaned.status} verses=${cleaned.verses.length} ${cleaned.error || sample}`,
    )
    return outRow
  })

  console.log(`done ok=${ok} review_or_fail=${fail} → ${OUT}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
