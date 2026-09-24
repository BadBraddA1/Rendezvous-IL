/**
 * Fix nine SFP items that were imported under the wrong printed page #:
 * rename PRO-G40 Shape-note 16x9 files, re-key R2 PDFs, update Turso titles.
 *
 *   npx tsx --env-file=.env.local scripts/fix-sfp-wrong-page-numbers.ts [--apply]
 */
import { createClient } from "@libsql/client"
import { createHash } from "crypto"
import { existsSync, readdirSync, renameSync } from "fs"
import { basename, join } from "path"

const APPLY = process.argv.includes("--apply")
const SFP = "3eac16b6-fc68-43db-9d82-5cd7ccd2d5ce"
const PUBLIC_BASE = (
  process.env.R2_PUBLIC_BASE_URL || "https://cdn.rendezvousil.com"
).replace(/\/$/, "")

type Move = {
  id: string
  fromPage: number
  toPage: number
  titleContains: string
  newTitle: string
  /** Filename substrings to match on Drive (case-insensitive). */
  driveMatchers: string[]
}

const MOVES: Move[] = [
  {
    id: "90b585d4-e176-4796-a5a3-35fbf9ebd8d3",
    fromPage: 21,
    toPage: 211,
    titleContains: "There is a Savior",
    newTitle: "211 · There is a Savior",
    driveMatchers: ["There is a Savior"],
  },
  {
    id: "4542b760-ad01-46bb-8a31-5fb404a17e32",
    fromPage: 91,
    toPage: 911,
    titleContains: "Bring Christ Your Broken",
    newTitle: "911 · Bring Christ Your Broken Life",
    driveMatchers: ["Bring Christ Your Broken"],
  },
  {
    id: "4097982b-beef-4217-9ff3-43872898c4a4",
    fromPage: 101,
    toPage: 1011,
    titleContains: "Church in the Wildwood",
    newTitle: "1011 · The Church in the Wildwood",
    driveMatchers: ["Church in the Wildwood"],
  },
  {
    id: "eff13805-00a7-4bf2-9b21-b4df32c1a33b",
    fromPage: 195,
    toPage: 919,
    titleContains: "Behold a Stranger",
    newTitle: "919 · Behold a Stranger",
    driveMatchers: ["Behold a Stranger"],
  },
  {
    id: "064fab15-ba34-46a8-9709-e449d205942c",
    fromPage: 290,
    toPage: 250,
    titleContains: "The Great Redeemer",
    newTitle: "250 · The Great Redeemer",
    driveMatchers: ["The Great Redeemer"],
  },
  {
    id: "76e0421a-093a-4700-8202-5cab2d0b2889",
    fromPage: 623,
    toPage: 923,
    titleContains: "I Am Coming Lord",
    newTitle: "923 · I Am Coming Lord",
    // Prefer the main file under 0623 (Opt 3 verse already lives at 0923)
    driveMatchers: ["I Am Coming Lord"],
  },
  {
    id: "4b00093b-66f4-439d-9b7b-b17a76512f68",
    fromPage: 624,
    toPage: 924,
    titleContains: "Just As I Am-Worthy",
    newTitle: "924 · Just As I Am-Worthy is the Lamb",
    driveMatchers: ["Just As I Am-Worthy"],
  },
  {
    id: "9e0ed85b-af37-4381-8d7a-df927f926443",
    fromPage: 742,
    toPage: 542,
    titleContains: "Tell It To Jesus",
    newTitle: "542 · Tell It To Jesus alone",
    driveMatchers: ["Tell It To Jesus"],
  },
  {
    id: "d7fa0c00-938f-4203-b2da-cd18f46d7a55",
    fromPage: 918,
    toPage: 818,
    titleContains: "Revive Us O Lord",
    newTitle: "818 · Revive Us O Lord",
    driveMatchers: ["Revive Us O Lord"],
  },
]

const DRIVE_DIRS = [
  "/Volumes/PRO-G40-Bradd/Song Books/SFP Songbook/SFP Shape note PP 16X9 by Page number",
  "/Volumes/PRO-G40-Bradd/Song Books/SFP Songbook/SFP Shape note PP 16X9 by Page number - titled",
]

function loadEnv() {
  const env: Record<string, string> = { ...process.env } as Record<string, string>
  try {
    const { readFileSync } = require("fs") as typeof import("fs")
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
      if (!env[k]) env[k] = v
    }
  } catch {
    /* ignore */
  }
  return env
}

function pad4(n: number) {
  return String(n).padStart(4, "0")
}

function renameDriveFile(
  dir: string,
  fromPage: number,
  toPage: number,
  matchers: string[],
): string | null {
  if (!existsSync(dir)) return `MISSING dir ${dir}`
  const files = readdirSync(dir)
  const fromPrefix = pad4(fromPage)
  const toPrefix = pad4(toPage)
  const candidates = files.filter((f) => {
    if (!f.startsWith(fromPrefix)) return false
    const lower = f.toLowerCase()
    return matchers.some((m) => lower.includes(m.toLowerCase()))
  })
  if (candidates.length === 0) return `no match in ${basename(dir)}`
  if (candidates.length > 1) {
    return `AMBIGUOUS ${candidates.join(" | ")}`
  }
  const srcName = candidates[0]!
  const destName = toPrefix + srcName.slice(fromPrefix.length)
  const src = join(dir, srcName)
  const dest = join(dir, destName)
  if (src === dest) return `already ${destName}`
  if (existsSync(dest)) return `DEST EXISTS ${destName}`
  if (APPLY) {
    renameSync(src, dest)
  }
  return `${APPLY ? "RENAMED" : "WOULD"} ${srcName} → ${destName}`
}

async function rekeyR2(
  env: Record<string, string>,
  fileUrl: string,
  toPage: number,
): Promise<{ fileUrl: string; contentHash: string; byteSize: number }> {
  const worker = (env.R2_UPLOAD_WORKER_URL || "").replace(/\/$/, "")
  const secret = env.R2_UPLOAD_SECRET || ""
  if (!worker || !secret) throw new Error("R2 upload env missing")

  const res = await fetch(fileUrl)
  if (!res.ok) throw new Error(`download ${res.status} ${fileUrl}`)
  const buf = Buffer.from(await res.arrayBuffer())
  const contentHash = createHash("sha256").update(buf).digest("hex")
  const key = `song-packs/${SFP}/${pad4(toPage)}-${contentHash.slice(0, 12)}.pdf`
  const put = await fetch(`${worker}/object?key=${encodeURIComponent(key)}`, {
    method: "PUT",
    headers: { "x-upload-secret": secret, "content-type": "application/pdf" },
    body: buf,
  })
  if (!put.ok) throw new Error(`upload fail ${await put.text()}`)
  return {
    fileUrl: `${PUBLIC_BASE}/${key}`,
    contentHash,
    byteSize: buf.byteLength,
  }
}

async function main() {
  const env = loadEnv()
  const db = createClient({
    url: env.TURSO_DATABASE_URL!,
    authToken: env.TURSO_AUTH_TOKEN,
  })

  console.log(APPLY ? "APPLY mode" : "DRY RUN (pass --apply)")

  for (const move of MOVES) {
    console.log(`\n=== ${move.fromPage} → ${move.toPage} · ${move.titleContains} ===`)

    const row = await db.execute({
      sql: `SELECT id, title, file_url, sort_order FROM song_pack_items WHERE id = ?`,
      args: [move.id],
    })
    if (!row.rows.length) {
      console.log("  DB row missing", move.id)
      continue
    }
    const item = row.rows[0]!
    console.log("  DB", item.title, "→", move.newTitle)

    for (const dir of DRIVE_DIRS) {
      const msg = renameDriveFile(dir, move.fromPage, move.toPage, move.driveMatchers)
      console.log("  Drive", dirname(dir).split("/").pop(), ":", msg)
    }

    if (!APPLY) continue

    let newFileUrl = String(item.file_url)
    let contentHash: string | null = null
    let byteSize: number | null = null
    try {
      const up = await rekeyR2(env, String(item.file_url), move.toPage)
      newFileUrl = up.fileUrl
      contentHash = up.contentHash
      byteSize = up.byteSize
      console.log("  R2", newFileUrl)
    } catch (e) {
      console.error("  R2 fail", e instanceof Error ? e.message : e)
    }

    const sortOrder = move.toPage * 10
    if (contentHash && byteSize != null) {
      await db.execute({
        sql: `UPDATE song_pack_items
              SET title = ?, file_url = ?, content_hash = ?, byte_size = ?, sort_order = ?
              WHERE id = ?`,
        args: [move.newTitle, newFileUrl, contentHash, byteSize, sortOrder, move.id],
      })
    } else {
      await db.execute({
        sql: `UPDATE song_pack_items SET title = ?, sort_order = ? WHERE id = ?`,
        args: [move.newTitle, sortOrder, move.id],
      })
    }
    console.log("  Turso updated")
  }

  if (APPLY) {
    await db.execute({
      sql: `UPDATE song_packs SET updated_at = datetime('now') WHERE id = ?`,
      args: [SFP],
    })
  }

  console.log("\ndone")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
