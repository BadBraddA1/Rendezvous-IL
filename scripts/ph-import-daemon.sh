#!/usr/bin/env bash
# Durable Praise & Harmony import loop for launchd KeepAlive.
set -euo pipefail
cd /Users/braddford/Code/Rendezvous-IL
export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"
LOG_DIR="$HOME/Library/Logs/ph-ocr"
mkdir -p "$LOG_DIR" .tmp-ph-import "$HOME/Code/ph-full-pdf"
LOG="$LOG_DIR/import-daemon.log"
PACK_ID="${PH_PACK_ID:-$(cat .tmp-ph-import/pack-id.txt 2>/dev/null || true)}"
PACK_ID="${PACK_ID:-6cc2a022-d1fd-4e00-8fe5-4649018b5818}"
export PH_PACK_ID="$PACK_ID"
echo "$PACK_ID" > .tmp-ph-import/pack-id.txt
EXPECTED="${EXPECTED:-500}"
LIMIT="${PH_IMPORT_CHUNK:-25}"

log() { echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) $*" | tee -a "$LOG"; }

count_items() {
  PH_PACK_ID="$PACK_ID" npx tsx --env-file=.env.local <<'TS' 2>/dev/null | tail -1
import { createClient } from "@libsql/client"
const db = createClient({ url: process.env.TURSO_DATABASE_URL!, authToken: process.env.TURSO_AUTH_TOKEN! })
const r = await db.execute({
  sql: "SELECT COUNT(*) AS n FROM song_pack_items WHERE pack_id = ?",
  args: [process.env.PH_PACK_ID!],
})
console.log(r.rows[0].n)
TS
}

n=$(count_items || echo 0)
log "import-daemon start pack=$PACK_ID count=$n/$EXPECTED chunk=$LIMIT"

if [[ "${n:-0}" -ge "$EXPECTED" ]]; then
  log "import complete ($n) — idle"
  sleep 3600
  exit 0
fi

export LO_USER_INSTALLATION="file:///tmp/lo-ph-daemon-$$"

npx tsx --env-file=.env.local scripts/import-ph-songbook.ts \
  --apply --resume --fast --limit="$LIMIT" \
  >>"$LOG" 2>&1 || log "chunk exit=$?"

n=$(count_items || echo 0)
log "after chunk count=$n/$EXPECTED"
sleep 5
