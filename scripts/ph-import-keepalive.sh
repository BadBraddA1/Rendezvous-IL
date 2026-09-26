#!/usr/bin/env bash
# Keep Praise & Harmony 2-shard import alive until 500, then arm Gemini.
# Does NOT pkill LibreOffice — that killed healthy converts.
# Skips starting a new blast if shards are already healthy (avoids fighting
# a Terminal/screen session that Cursor can't reap).
set -uo pipefail
cd /Users/braddford/Code/Rendezvous-IL
export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"
LOG_DIR="$HOME/Library/Logs/ph-ocr"
mkdir -p "$LOG_DIR"
LOG="$LOG_DIR/import-keepalive.log"
DRIVE_WORK="${PH_DRIVE_WORK:-/Volumes/PRO-G40-Bradd/_cloud-work}"
PACK_ID="${PH_PACK_ID:-6cc2a022-d1fd-4e00-8fe5-4649018b5818}"
EXPECTED="${EXPECTED:-500}"
export PH_PACK_ID="$PACK_ID"
export PH_DRIVE_WORK="$DRIVE_WORK"
export PH_KEEP_PDF_DIR="${PH_KEEP_PDF_DIR:-$DRIVE_WORK/ph-full-pdf}"
export PH_WORK_ROOT="${PH_WORK_ROOT:-$DRIVE_WORK/.tmp-ph-import}"
export TMPDIR="${TMPDIR:-$DRIVE_WORK/.tmp-ph-import/tmp}"
mkdir -p "$TMPDIR" "$PH_KEEP_PDF_DIR" "$PH_WORK_ROOT" "$DRIVE_WORK/lo-profiles"

log() { echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) $*" | tee -a "$LOG"; }

count_items() {
  env -u TURSO_DATABASE_URL -u TURSO_AUTH_TOKEN PH_PACK_ID="$PACK_ID" \
    npx tsx --env-file=.env.local <<'TS' 2>/dev/null | tr -cd '0-9' | tail -c 20
import { createClient } from "@libsql/client"
const db = createClient({ url: process.env.TURSO_DATABASE_URL!, authToken: process.env.TURSO_AUTH_TOKEN! })
const r = await db.execute({
  sql: "SELECT COUNT(*) AS n FROM song_pack_items WHERE pack_id = ?",
  args: [process.env.PH_PACK_ID!],
})
console.log(r.rows[0].n)
TS
}

shards_alive() {
  pgrep -f 'scripts/import-ph-songbook.ts' >/dev/null 2>&1
}

# Sync done-titles from Turso so resume never re-wipes / races bad local JSON
sync_done_from_turso() {
  env -u TURSO_DATABASE_URL -u TURSO_AUTH_TOKEN PH_PACK_ID="$PACK_ID" \
    PH_WORK_ROOT="$PH_WORK_ROOT" npx tsx --env-file=.env.local <<'TS' >/dev/null 2>&1 || true
import { createClient } from "@libsql/client"
import { writeFileSync, mkdirSync } from "fs"
const db = createClient({ url: process.env.TURSO_DATABASE_URL!, authToken: process.env.TURSO_AUTH_TOKEN! })
const id = process.env.PH_PACK_ID!
const root = process.env.PH_WORK_ROOT!
const r = await db.execute({ sql: "SELECT title FROM song_pack_items WHERE pack_id=?", args: [id] })
const titles = r.rows.map((x) => String(x.title))
mkdirSync(root, { recursive: true })
writeFileSync(`${root}/done-titles.json`, JSON.stringify(titles))
writeFileSync(`${root}/pack-id.txt`, id)
TS
}

while true; do
  if [[ ! -d "/Volumes/PRO-G40-Bradd/Song Books" ]]; then
    log "PRO-G40 not mounted — sleeping"
    sleep 300
    continue
  fi

  sync_done_from_turso
  n=$(count_items || echo 0)
  n="${n:-0}"
  log "count=$n/$EXPECTED"

  if [[ "$n" -ge "$EXPECTED" ]]; then
    log "import complete — arming ph-gemini"
    launchctl bootstrap "gui/$(id -u)" "$HOME/Library/LaunchAgents/com.braddcorp.ph-gemini-ocr.plist" 2>/dev/null \
      || launchctl kickstart -k "gui/$(id -u)/com.braddcorp.ph-gemini-ocr" 2>/dev/null \
      || true
    exit 0
  fi

  if shards_alive; then
    log "healthy import-ph shards already running — not starting a competing blast"
    sleep 60
    continue
  fi

  log "no live shards — starting 2-shard blast (drive scratch)"
  # Prefer Terminal-owned durability when possible; fall back to direct run.
  if ! pgrep -x Terminal >/dev/null 2>&1; then
    open -a Terminal 2>/dev/null || true
    sleep 2
  fi
  ./scripts/run-ph-import-fast.sh >>"$LOG_DIR/import-nohup.log" 2>&1 || true
  log "blast exited — retry in 45s"
  sleep 45
done
