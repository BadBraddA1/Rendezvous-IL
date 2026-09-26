#!/usr/bin/env bash
# Parallel fast The Paperless Hymnal import — LibreOffice → R2 + Turso.
#
#   ./scripts/run-tph-import-fast.sh
#
set -euo pipefail
cd "$(dirname "$0")/.."

WORKERS="${WORKERS:-2}"
LOG_DIR="${LOG_DIR:-$HOME/Library/Logs/tph-ocr}"
DRIVE_WORK="${TPH_DRIVE_WORK:-/Volumes/PRO-G40-Bradd/_cloud-work}"
WORK_ROOT="${TPH_WORK_ROOT:-$DRIVE_WORK/.tmp-tph-import}"
KEEP_PDF="${TPH_KEEP_PDF_DIR:-$DRIVE_WORK/tph-full-pdf}"
PACK_ID="${TPH_PACK_ID:-$(cat "$WORK_ROOT/pack-id.txt" 2>/dev/null || true)}"
PACK_ID="${PACK_ID:-d7b0b452-5467-4099-917d-f10a9d052c0b}"
EXPECTED="${EXPECTED:-965}"
export TPH_PACK_ID="$PACK_ID"
export TPH_KEEP_PDF_DIR="$KEEP_PDF"
export TPH_WORK_ROOT="$WORK_ROOT"
export TPH_DRIVE_WORK="$DRIVE_WORK"

if [[ ! -d "/Volumes/PRO-G40-Bradd/Song Books" ]]; then
  echo "PRO-G40 not mounted — refuse to write TPH PDFs to Mac disk" >&2
  exit 1
fi

mkdir -p "$LOG_DIR" "$WORK_ROOT" "$KEEP_PDF" "$DRIVE_WORK/lo-profiles"
echo "$PACK_ID" > "$WORK_ROOT/pack-id.txt"

echo "=== tph fast import start $(date) workers=$WORKERS pack=$PACK_ID ===" | tee "$LOG_DIR/import-master.log"

pids=()
for ((i = 0; i < WORKERS; i++)); do
  log="$LOG_DIR/import-shard-$i.log"
  : >"$log"
  nohup env TPH_PACK_ID="$PACK_ID" npx tsx --env-file=.env.local scripts/import-tph-songbook.ts \
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
  count=$(env -u TURSO_DATABASE_URL -u TURSO_AUTH_TOKEN TPH_PACK_ID="$PACK_ID" npx tsx --env-file=.env.local <<'TS' 2>/dev/null | tail -1
import { createClient } from "@libsql/client"
const db = createClient({ url: process.env.TURSO_DATABASE_URL!, authToken: process.env.TURSO_AUTH_TOKEN! })
const id = process.env.TPH_PACK_ID!
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

echo "=== tph fast import end $(date) ===" | tee -a "$LOG_DIR/import-master.log"
