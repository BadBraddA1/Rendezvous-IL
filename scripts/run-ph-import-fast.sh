#!/usr/bin/env bash
# Parallel fast Praise & Harmony import — LibreOffice → R2 + Turso.
# Scratch + PDFs + LO profiles live on PRO-G40 (same pattern as TPH).
#
#   ./scripts/run-ph-import-fast.sh
#
set -euo pipefail
cd "$(dirname "$0")/.."

WORKERS="${WORKERS:-2}"
LOG_DIR="${LOG_DIR:-$HOME/Library/Logs/ph-ocr}"
DRIVE_WORK="${PH_DRIVE_WORK:-/Volumes/PRO-G40-Bradd/_cloud-work}"
WORK_ROOT="${PH_WORK_ROOT:-$DRIVE_WORK/.tmp-ph-import}"
KEEP_PDF="${PH_KEEP_PDF_DIR:-$DRIVE_WORK/ph-full-pdf}"
PACK_ID="${PH_PACK_ID:-$(cat "$WORK_ROOT/pack-id.txt" 2>/dev/null || true)}"
PACK_ID="${PACK_ID:-6cc2a022-d1fd-4e00-8fe5-4649018b5818}"
EXPECTED="${EXPECTED:-500}"
export PH_PACK_ID="$PACK_ID"
export PH_KEEP_PDF_DIR="$KEEP_PDF"
export PH_WORK_ROOT="$WORK_ROOT"
export PH_DRIVE_WORK="$DRIVE_WORK"

if [[ ! -d "/Volumes/PRO-G40-Bradd/Song Books/Praise and Harmony" ]]; then
  echo "PRO-G40 not mounted — refuse to write P&H PDFs to Mac disk" >&2
  exit 1
fi

mkdir -p "$LOG_DIR" "$WORK_ROOT" "$KEEP_PDF" "$DRIVE_WORK/lo-profiles"
echo "$PACK_ID" > "$WORK_ROOT/pack-id.txt"

# Resume continuity from earlier Mac-disk run
if [[ -f "$HOME/Code/Rendezvous-IL/.tmp-ph-import/done-titles.json" && ! -f "$WORK_ROOT/done-titles.json" ]]; then
  cp "$HOME/Code/Rendezvous-IL/.tmp-ph-import/done-titles.json" "$WORK_ROOT/done-titles.json"
fi

echo "=== ph fast import start $(date) workers=$WORKERS pack=$PACK_ID drive=$DRIVE_WORK ===" | tee "$LOG_DIR/import-master.log"

pids=()
for ((i = 0; i < WORKERS; i++)); do
  log="$LOG_DIR/import-shard-$i.log"
  : >"$log"
  nohup env PH_PACK_ID="$PACK_ID" PH_KEEP_PDF_DIR="$KEEP_PDF" PH_WORK_ROOT="$WORK_ROOT" PH_DRIVE_WORK="$DRIVE_WORK" \
    npx tsx --env-file=.env.local scripts/import-ph-songbook.ts \
    --apply --resume --fast --shard="$i/$WORKERS" \
    >>"$log" 2>&1 &
  pids+=($!)
  echo "started shard $i pid=${pids[$((${#pids[@]}-1))]} log=$log" | tee -a "$LOG_DIR/import-master.log"
done

echo "${pids[*]}" >"$LOG_DIR/import-pids"

while true; do
  alive=0
  for pid in "${pids[@]}"; do
    if kill -0 "$pid" 2>/dev/null; then alive=$((alive + 1)); fi
  done
  count=$(
    env -u TURSO_DATABASE_URL -u TURSO_AUTH_TOKEN PH_PACK_ID="$PACK_ID" npx tsx --env-file=.env.local <<'TS' 2>/dev/null | tail -1
import { createClient } from "@libsql/client"
const db = createClient({ url: process.env.TURSO_DATABASE_URL!, authToken: process.env.TURSO_AUTH_TOKEN! })
const r = await db.execute({
  sql: "SELECT COUNT(*) AS n FROM song_pack_items WHERE pack_id = ?",
  args: [process.env.PH_PACK_ID!],
})
console.log(r.rows[0].n)
TS
  ) || true
  count="${count:-0}"
  echo "$(date +%H:%M:%S) pack=$count/$EXPECTED shards_alive=$alive" | tee -a "$LOG_DIR/import-master.log"
  if [[ "$count" -ge "$EXPECTED" || "$alive" -eq 0 ]]; then
    echo "stop count=$count alive=$alive" | tee -a "$LOG_DIR/import-master.log"
    break
  fi
  sleep 45
done

echo "=== ph fast import end $(date) ===" | tee -a "$LOG_DIR/import-master.log"
