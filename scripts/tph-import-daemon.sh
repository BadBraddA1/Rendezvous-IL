#!/bin/bash
# Durable TPH import loop for launchd KeepAlive.
# All PDF / LibreOffice scratch lives on PRO-G40 (Mac disk is tight).
set -euo pipefail
cd /Users/braddford/Code/Rendezvous-IL
export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"
LOG_DIR="$HOME/Library/Logs/tph-ocr"
DRIVE_WORK="${TPH_DRIVE_WORK:-/Volumes/PRO-G40-Bradd/_cloud-work}"
WORK_ROOT="${TPH_WORK_ROOT:-$DRIVE_WORK/.tmp-tph-import}"
KEEP_PDF="${TPH_KEEP_PDF_DIR:-$DRIVE_WORK/tph-full-pdf}"
LOG="$LOG_DIR/import-daemon.log"
PACK_ID="${TPH_PACK_ID:-$(cat "$WORK_ROOT/pack-id.txt" 2>/dev/null || true)}"
PACK_ID="${PACK_ID:-d7b0b452-5467-4099-917d-f10a9d052c0b}"
export TPH_PACK_ID="$PACK_ID"
export TPH_KEEP_PDF_DIR="$KEEP_PDF"
export TPH_WORK_ROOT="$WORK_ROOT"
export TPH_DRIVE_WORK="$DRIVE_WORK"
EXPECTED="${EXPECTED:-965}"
LIMIT="${TPH_IMPORT_CHUNK:-30}"

log() { echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) $*" | tee -a "$LOG"; }

if [[ ! -d "/Volumes/PRO-G40-Bradd/Song Books" ]]; then
  log "PRO-G40 not mounted — sleeping (will not write to Mac)"
  sleep 300
  exit 0
fi

mkdir -p "$LOG_DIR" "$WORK_ROOT" "$KEEP_PDF" "$DRIVE_WORK/lo-profiles"
echo "$PACK_ID" > "$WORK_ROOT/pack-id.txt"

count_items() {
  # Shell may have a stale TURSO_* — force .env.local via empty override
  env -u TURSO_DATABASE_URL -u TURSO_AUTH_TOKEN \
    TPH_PACK_ID="$PACK_ID" npx tsx --env-file=.env.local <<'TS' 2>/dev/null | tail -1
import { createClient } from "@libsql/client"
const db = createClient({ url: process.env.TURSO_DATABASE_URL!, authToken: process.env.TURSO_AUTH_TOKEN! })
const r = await db.execute({
  sql: "SELECT COUNT(*) AS n FROM song_pack_items WHERE pack_id = ?",
  args: [process.env.TPH_PACK_ID!],
})
console.log(r.rows[0].n)
TS
}

n=$(count_items || echo 0)
log "import-daemon start pack=$PACK_ID count=$n/$EXPECTED chunk=$LIMIT drive=$DRIVE_WORK"

if [[ "${n:-0}" -ge "$EXPECTED" ]]; then
  log "import complete ($n) — idle"
  sleep 3600
  exit 0
fi

# LibreOffice profile on the drive (not /tmp on Mac)
export LO_USER_INSTALLATION="file://$DRIVE_WORK/lo-profiles/lo-tph-daemon-$$"

npx tsx --env-file=.env.local scripts/import-tph-songbook.ts \
  --apply --resume --fast --limit="$LIMIT" \
  >>"$LOG" 2>&1 || log "chunk exit=$?"

n=$(count_items || echo 0)
log "after chunk count=$n/$EXPECTED"
sleep 5
