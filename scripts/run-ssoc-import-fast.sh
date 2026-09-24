#!/usr/bin/env bash
# Parallel fast Sacred Songs of the Church import — LibreOffice → R2 + Turso.
#
#   ./scripts/run-ssoc-import-fast.sh
#
set -euo pipefail
cd "$(dirname "$0")/.."

WORKERS="${WORKERS:-3}"
LOG_DIR="${LOG_DIR:-$HOME/Library/Logs/ssoc-ocr}"
PACK_ID="${SSOC_PACK_ID:-$(cat .tmp-ssoc-import/pack-id.txt 2>/dev/null || true)}"
PACK_ID="${PACK_ID:-de98d363-5295-4788-b766-5febaa4e202d}"
EXPECTED="${EXPECTED:-836}"
export SSOC_PACK_ID="$PACK_ID"

mkdir -p "$LOG_DIR" .tmp-ssoc-import
echo "$PACK_ID" > .tmp-ssoc-import/pack-id.txt

echo "=== ssoc fast import start $(date) workers=$WORKERS pack=$PACK_ID ===" | tee "$LOG_DIR/import-master.log"

pids=()
for ((i = 0; i < WORKERS; i++)); do
  log="$LOG_DIR/import-shard-$i.log"
  : >"$log"
  nohup env SSOC_PACK_ID="$PACK_ID" npx tsx --env-file=.env.local scripts/import-ssoc-songbook.ts \
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
  count=$(SSOC_PACK_ID="$PACK_ID" npx tsx --env-file=.env.local <<'TS' 2>/dev/null | tail -1
import { createClient } from "@libsql/client"
const db = createClient({ url: process.env.TURSO_DATABASE_URL!, authToken: process.env.TURSO_AUTH_TOKEN! })
const id = process.env.SSOC_PACK_ID!
const r = await db.execute({ sql: "SELECT COUNT(*) AS n FROM song_pack_items WHERE pack_id = ?", args: [id] })
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

echo "=== ssoc fast import end $(date) ===" | tee -a "$LOG_DIR/import-master.log"
