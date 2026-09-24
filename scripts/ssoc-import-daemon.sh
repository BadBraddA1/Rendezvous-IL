#!/bin/bash
# Durable SSOC import loop for launchd KeepAlive.
set -euo pipefail
cd /Users/braddford/Code/Rendezvous-IL
export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"
LOG_DIR="$HOME/Library/Logs/ssoc-ocr"
mkdir -p "$LOG_DIR" .tmp-ssoc-import "$HOME/Code/ssoc-full-pdf"
LOG="$LOG_DIR/import-daemon.log"
PACK_ID="${SSOC_PACK_ID:-$(cat .tmp-ssoc-import/pack-id.txt 2>/dev/null || true)}"
PACK_ID="${PACK_ID:-de98d363-5295-4788-b766-5febaa4e202d}"
export SSOC_PACK_ID="$PACK_ID"
echo "$PACK_ID" > .tmp-ssoc-import/pack-id.txt
EXPECTED="${EXPECTED:-835}"
LIMIT="${SSOC_IMPORT_CHUNK:-40}"

log() { echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) $*" | tee -a "$LOG"; }

count_items() {
  SSOC_PACK_ID="$PACK_ID" npx tsx --env-file=.env.local <<'TS' 2>/dev/null | tail -1
import { createClient } from "@libsql/client"
const db = createClient({ url: process.env.TURSO_DATABASE_URL!, authToken: process.env.TURSO_AUTH_TOKEN! })
const r = await db.execute({
  sql: "SELECT COUNT(*) AS n FROM song_pack_items WHERE pack_id = ?",
  args: [process.env.SSOC_PACK_ID!],
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

# Unique LibreOffice profile per daemon invocation
export LO_USER_INSTALLATION="file:///tmp/lo-ssoc-daemon-$$"

npx tsx --env-file=.env.local scripts/import-ssoc-songbook.ts \
  --apply --resume --fast --limit="$LIMIT" \
  >>"$LOG" 2>&1 || log "chunk exit=$?"

n=$(count_items || echo 0)
log "after chunk count=$n/$EXPECTED"
sleep 5
