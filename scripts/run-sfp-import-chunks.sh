#!/usr/bin/env bash
# Durable chunked SFP songbook import. Survives Cursor shell teardown.
#
#   ./scripts/run-sfp-import-chunks.sh
#   CHUNK=40 MAX_CHUNKS=2 ./scripts/run-sfp-import-chunks.sh
#
set -euo pipefail
cd "$(dirname "$0")/.."

CHUNK="${CHUNK:-25}"
MAX_CHUNKS="${MAX_CHUNKS:-0}"
LOG="${LOG:-/tmp/sfp-import-chunks.log}"
PACK_ID="3eac16b6-fc68-43db-9d82-5cd7ccd2d5ce"
EXPECTED="${EXPECTED:-896}"

pack_count() {
  npx tsx --env-file=.env.local <<'TS' 2>/dev/null | tail -1
import { createClient } from "@libsql/client"
import { readFileSync } from "fs"
const env: Record<string, string> = { ...process.env } as Record<string, string>
for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  if (!line || line.startsWith("#") || !line.includes("=")) continue
  const i = line.indexOf("=")
  const k = line.slice(0, i).trim()
  let v = line.slice(i + 1).trim()
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))
    v = v.slice(1, -1)
  env[k] = v
}
const db = createClient({ url: env.TURSO_DATABASE_URL!, authToken: env.TURSO_AUTH_TOKEN! })
const r = await db.execute({
  sql: `SELECT COUNT(*) AS n,
               SUM(CASE WHEN verse_count IS NOT NULL AND verse_count > 0 THEN 1 ELSE 0 END) AS v
        FROM song_pack_items WHERE pack_id = ?`,
  args: ["3eac16b6-fc68-43db-9d82-5cd7ccd2d5ce"],
})
console.log(`${r.rows[0].n} ${r.rows[0].v}`)
TS
}

echo "=== sfp-import-chunks start $(date) chunk=$CHUNK max=${MAX_CHUNKS:-all} ===" | tee -a "$LOG"

chunk_n=0
while true; do
  chunk_n=$((chunk_n + 1))
  if [[ "$MAX_CHUNKS" -gt 0 && "$chunk_n" -gt "$MAX_CHUNKS" ]]; then
    echo "hit MAX_CHUNKS=$MAX_CHUNKS — stop" | tee -a "$LOG"
    break
  fi

  echo "" | tee -a "$LOG"
  echo "--- chunk $chunk_n ($(date)) ---" | tee -a "$LOG"

  read -r before with_v <<<"$(pack_count)"
  echo "pack before=$before with_verses=$with_v" | tee -a "$LOG"
  if [[ "${before:-0}" -ge "$EXPECTED" ]]; then
    echo "pack complete ($before >= $EXPECTED)" | tee -a "$LOG"
    break
  fi

  set +e
  npx tsx --env-file=.env.local scripts/import-sfp-songbook.ts --apply --resume --limit="$CHUNK" >>"$LOG" 2>&1
  rc=$?
  set -e
  echo "chunk $chunk_n exit=$rc" | tee -a "$LOG"

  read -r after with_v2 <<<"$(pack_count)"
  echo "pack after=$after with_verses=$with_v2" | tee -a "$LOG"

  if [[ "${after:-0}" -le "${before:-0}" ]]; then
    echo "no progress this chunk — stopping" | tee -a "$LOG"
    exit 1
  fi
done

echo "=== sfp-import-chunks done $(date) ===" | tee -a "$LOG"
