#!/usr/bin/env bash
# Parallel fast Praise & Harmony import — LibreOffice → R2 + Turso.
#
#   ./scripts/run-ph-import-fast.sh
#
set -euo pipefail
cd "$(dirname "$0")/.."

WORKERS="${WORKERS:-2}"
LOG_DIR="${LOG_DIR:-$HOME/Library/Logs/ph-ocr}"
PACK_ID="${PH_PACK_ID:-$(cat .tmp-ph-import/pack-id.txt 2>/dev/null || true)}"
PACK_ID="${PACK_ID:-6cc2a022-d1fd-4e00-8fe5-4649018b5818}"
EXPECTED="${EXPECTED:-500}"
export PH_PACK_ID="$PACK_ID"

mkdir -p "$LOG_DIR" .tmp-ph-import "$HOME/Code/ph-full-pdf"
echo "$PACK_ID" > .tmp-ph-import/pack-id.txt

if [[ ! -d "/Volumes/PRO-G40-Bradd/Song Books/Praise and Harmony" ]]; then
  echo "PRO-G40 Praise and Harmony folder not mounted" >&2
  exit 1
fi

echo "=== ph fast import start $(date) workers=$WORKERS pack=$PACK_ID ===" | tee "$LOG_DIR/import-master.log"

pids=()
for ((i = 0; i < WORKERS; i++)); do
  log="$LOG_DIR/import-shard-$i.log"
  : >"$log"
  nohup env PH_PACK_ID="$PACK_ID" \
    LO_USER_INSTALLATION="file:///tmp/lo-ph-shard-$i-$$" \
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
  count=$(env -u TURSO_DATABASE_URL -u TURSO_AUTH_TOKEN PH_PACK_ID="$PACK_ID" npx tsx --env-file=.env.local <<'TS' 2>/dev/null | tail -1
import { createClient } from "@libsql/client"
const db = createClient({ url: process.env.TURSO_DATABASE_URL!, authToken: process.env.TURSO_AUTH_TOKEN! })
const r = await db.execute({
  sql: "SELECT COUNT(*) AS n FROM song_pack_items WHERE pack_id = ?",
  args: [process.env.PH_PACK_ID!],
})
console.log(r.rows[0].n)
TS
)
  echo "$(date +%H:%M:%S) pack=$count/$EXPECTED shards_alive=$alive" | tee -a "$LOG_DIR/import-master.log"
  if [[ "${count:-0}" -ge "$EXPECTED" || "$alive" -eq 0 ]]; then
    echo "stop count=$count alive=$alive" | tee -a "$LOG_DIR/import-master.log"
    break
  fi
  sleep 45
done

echo "=== ph fast import end $(date) ===" | tee -a "$LOG_DIR/import-master.log"
