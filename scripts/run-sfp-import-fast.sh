#!/usr/bin/env bash
# Parallel fast SFP import — 3 LibreOffice workers, no Vision OCR.
# No RunPod: this is CPU PDF convert + R2 upload on this Mac.
#
#   ./scripts/run-sfp-import-fast.sh
#
set -euo pipefail
cd "$(dirname "$0")/.."

WORKERS="${WORKERS:-3}"
LOG_DIR="${LOG_DIR:-/tmp/sfp-import-fast}"
mkdir -p "$LOG_DIR"
EXPECTED="${EXPECTED:-896}"

echo "=== fast parallel import start $(date) workers=$WORKERS ===" | tee "$LOG_DIR/master.log"

pids=()
for ((i = 0; i < WORKERS; i++)); do
  log="$LOG_DIR/shard-$i.log"
  : >"$log"
  nohup npx tsx --env-file=.env.local scripts/import-sfp-songbook.ts \
    --apply --resume --fast --shard="$i/$WORKERS" \
    >>"$log" 2>&1 &
  pids+=($!)
  echo "started shard $i pid=${${pids[$((${#pids[@]}-1))]}} log=$log" | tee -a "$LOG_DIR/master.log"
done

echo "${pids[*]}" >"$LOG_DIR/pids"

while true; do
  alive=0
  for pid in "${pids[@]}"; do
    if kill -0 "$pid" 2>/dev/null; then alive=$((alive + 1)); fi
  done
  count=$(npx tsx --env-file=.env.local <<'TS' 2>/dev/null | tail -1
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
  sql: "SELECT COUNT(*) AS n FROM song_pack_items WHERE pack_id = ?",
  args: ["3eac16b6-fc68-43db-9d82-5cd7ccd2d5ce"],
})
console.log(r.rows[0].n)
TS
)
  echo "$(date +%H:%M:%S) pack=$count/$EXPECTED shards_alive=$alive" | tee -a "$LOG_DIR/master.log"
  if [[ "${count:-0}" -ge "$EXPECTED" || "$alive" -eq 0 ]]; then
    echo "stop count=$count alive=$alive" | tee -a "$LOG_DIR/master.log"
    break
  fi
  sleep 45
done

echo "=== fast parallel import end $(date) ===" | tee -a "$LOG_DIR/master.log"
