#!/usr/bin/env bash
# Re-import truncated Praise & Harmony PPTX songs (title-strip bug fix).
# Requires PRO-G40 mounted.
#
#   ./scripts/run-ph-rerun-truncated.sh
#
set -euo pipefail
cd "$(dirname "$0")/.."

WORKERS="${WORKERS:-4}"
LOG_DIR="${LOG_DIR:-$HOME/Library/Logs/ph-ocr}"
DRIVE_WORK="${PH_DRIVE_WORK:-/Volumes/PRO-G40-Bradd/_cloud-work}"
WORK_ROOT="${PH_WORK_ROOT:-$DRIVE_WORK/.tmp-ph-import}"
KEEP_PDF="${PH_KEEP_PDF_DIR:-$DRIVE_WORK/ph-full-pdf}"
PACK_ID="${PH_PACK_ID:-6cc2a022-d1fd-4e00-8fe5-4649018b5818}"
NUMS_FILE="${PH_RERUN_NUMS_FILE:-$PWD/docs/ops/ph-rerun-truncated-nums.txt}"
EXPECTED_RERUN="$(grep -c '^[0-9]' "$NUMS_FILE" || echo 328)"

export PH_PACK_ID="$PACK_ID"
export PH_KEEP_PDF_DIR="$KEEP_PDF"
export PH_WORK_ROOT="$WORK_ROOT"
export PH_DRIVE_WORK="$DRIVE_WORK"
export TMPDIR="$WORK_ROOT/tmp"
mkdir -p "$TMPDIR"

# Stop idle keepalive / old shards so LO isn't contended
pkill -f 'ph-import-keepalive|import-ph-songbook' 2>/dev/null || true
sleep 2

echo "=== ph truncated rerun start $(date) workers=$WORKERS nums=$EXPECTED_RERUN ===" \
  | tee "$LOG_DIR/rerun-truncated-master.log"

pids=()
for ((i = 0; i < WORKERS; i++)); do
  log="$LOG_DIR/rerun-truncated-shard-$i.log"
  : >"$log"
  nohup env \
    PH_PACK_ID="$PACK_ID" PH_KEEP_PDF_DIR="$KEEP_PDF" \
    PH_WORK_ROOT="$WORK_ROOT" PH_DRIVE_WORK="$DRIVE_WORK" TMPDIR="$TMPDIR" \
    npx tsx --env-file=.env.local scripts/import-ph-songbook.ts \
      --apply --fast --shard="$i/$WORKERS" \
      --rerun-nums-file="$NUMS_FILE" \
    >>"$log" 2>&1 &
  pids+=($!)
  echo "started shard $i pid=${pids[$((${#pids[@]} - 1))]} log=$log" | tee -a "$LOG_DIR/rerun-truncated-master.log"
done

echo "${pids[*]}" >"$LOG_DIR/rerun-truncated-pids"

while true; do
  alive=0
  for pid in "${pids[@]}"; do
    if kill -0 "$pid" 2>/dev/null; then alive=$((alive + 1)); fi
  done
  # How many of the rerun list are back with page_count > 2?
  count=$(
    env -u TURSO_DATABASE_URL -u TURSO_AUTH_TOKEN \
      NUMS_FILE="$NUMS_FILE" PH_PACK_ID="$PACK_ID" \
      npx tsx --env-file=.env.local <<'TS' 2>/dev/null | tail -1
import { createClient } from "@libsql/client"
import { readFileSync } from "fs"
const nums = readFileSync(process.env.NUMS_FILE!, "utf8")
  .split(/\s+/).map(Number).filter((n) => n > 0)
const db = createClient({ url: process.env.TURSO_DATABASE_URL!, authToken: process.env.TURSO_AUTH_TOKEN! })
const ph = process.env.PH_PACK_ID!
let good = 0
for (let i = 0; i < nums.length; i += 80) {
  const chunk = nums.slice(i, i + 80)
  const phold = chunk.map(() => "?").join(",")
  const r = await db.execute({
    sql: `SELECT count(*) AS n FROM song_pack_items
          WHERE pack_id=? AND sort_order IN (${phold}) AND page_count > 2`,
    args: [ph, ...chunk],
  })
  good += Number(r.rows[0].n)
}
console.log(good)
TS
  ) || true
  count="$(printf '%s' "${count:-0}" | tr -cd '0-9')"
  count="${count:-0}"
  echo "$(date +%H:%M:%S) rerun_good=$count/$EXPECTED_RERUN shards_alive=$alive" \
    | tee -a "$LOG_DIR/rerun-truncated-master.log"
  if (( count >= EXPECTED_RERUN || alive == 0 )); then
    echo "stop count=$count alive=$alive" | tee -a "$LOG_DIR/rerun-truncated-master.log"
    break
  fi
  sleep 60
done

# Kick Gemini on newly restored songs (min-pages=3 picks them up)
launchctl kickstart -k "gui/$(id -u)/com.braddcorp.ph-gemini-ocr" 2>/dev/null || true
agent-phone-push "P&H truncated reimport finished: ${count}/${EXPECTED_RERUN} full PDFs. Gemini starting." \
  >>"$LOG_DIR/rerun-truncated-master.log" 2>&1 || true
echo "=== ph truncated rerun done $(date) ===" | tee -a "$LOG_DIR/rerun-truncated-master.log"
