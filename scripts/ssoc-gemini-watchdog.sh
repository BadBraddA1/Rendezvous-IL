#!/bin/bash
# Watch SSOC Gemini OCR — phone-ping if things get funny.
set -uo pipefail
cd /Users/braddford/Code/Rendezvous-IL || exit 0
export PATH="/Users/braddford/.local/bin:/opt/homebrew/bin:/usr/local/bin:/bin:/usr/bin:$PATH"

PACK_ID="${SSOC_PACK_ID:-de98d363-5295-4788-b766-5febaa4e202d}"
STATE="$HOME/Library/Logs/ssoc-ocr/watch-state.env"
LOG="$HOME/Library/Logs/ssoc-ocr/watchdog.log"
EXPECTED=835
STALL_MINUTES=25
MIN_FOR_QUALITY=25

mkdir -p "$(dirname "$STATE")"
touch "$STATE" "$LOG"
# shellcheck disable=SC1090
source "$STATE" 2>/dev/null || true
LAST_COUNT="${LAST_COUNT:-0}"
LAST_CHANGE_EPOCH="${LAST_CHANGE_EPOCH:-$(date +%s)}"
ALERTED_DEAD="${ALERTED_DEAD:-0}"
ALERTED_STALL="${ALERTED_STALL:-0}"
ALERTED_QUALITY="${ALERTED_QUALITY:-0}"
ALERTED_DONE="${ALERTED_DONE:-0}"

ping_phone() {
  local msg="$1"
  echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) PING $msg" | tee -a "$LOG"
  agent-phone-push "SSOC Gemini: $msg" >/dev/null 2>&1 || true
}

stats_file=$(mktemp)
SSOC_PACK_ID="$PACK_ID" npx tsx --env-file=.env.local >"$stats_file" 2>>"$LOG" <<'TS' || true
import { createClient } from "@libsql/client"
const db = createClient({
  url: process.env.TURSO_DATABASE_URL as string,
  authToken: process.env.TURSO_AUTH_TOKEN as string,
})
const id = process.env.SSOC_PACK_ID as string
const gem = await db.execute({
  sql: "SELECT COUNT(*) AS n FROM song_pack_items WHERE pack_id = ? AND ocr_url IS NOT NULL AND ocr_url != ''",
  args: [id],
})
const low = await db.execute({
  sql: `SELECT COUNT(*) AS n FROM song_pack_items
        WHERE pack_id = ? AND ocr_url IS NOT NULL
          AND verse_count <= 1 AND page_count >= 9`,
  args: [id],
})
const fails = await db.execute({
  sql: `SELECT COUNT(*) AS n FROM song_pack_items
        WHERE pack_id = ? AND ocr_status = 'needs_review'`,
  args: [id],
})
console.log(`${gem.rows[0].n} ${low.rows[0].n} ${fails.rows[0].n}`)
TS

stats=$(grep -E '^[0-9]+ [0-9]+ [0-9]+$' "$stats_file" | tail -1 || true)
rm -f "$stats_file"

if [[ -z "${stats}" ]]; then
  echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) WARN stats query failed" >>"$LOG"
  exit 0
fi

count=$(echo "$stats" | awk '{print $1}')
low=$(echo "$stats" | awk '{print $2}')
fails=$(echo "$stats" | awk '{print $3}')
count=${count:-0}
low=${low:-0}
fails=${fails:-0}
now=$(date +%s)

alive=0
if pgrep -f "gemini-ssoc-book-ocr-loop" >/dev/null 2>&1; then
  alive=1
elif pgrep -af "gemini-sfp-book-ocr.ts" 2>/dev/null | grep -q "$PACK_ID"; then
  alive=1
fi

if [[ "$count" -gt "$LAST_COUNT" ]]; then
  LAST_COUNT=$count
  LAST_CHANGE_EPOCH=$now
  ALERTED_STALL=0
  ALERTED_DEAD=0
fi

echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) count=$count/$EXPECTED low=$low fails=$fails alive=$alive" >>"$LOG"

if [[ "$count" -ge "$EXPECTED" && "$ALERTED_DONE" != "1" ]]; then
  ping_phone "done $count/$EXPECTED — ready to rebake when you are"
  ALERTED_DONE=1
fi

if [[ "$count" -lt "$EXPECTED" && "$alive" -eq 0 && "$ALERTED_DEAD" != "1" ]]; then
  sleep 15
  if ! pgrep -f "gemini-ssoc-book-ocr-loop" >/dev/null 2>&1 \
    && ! pgrep -af "gemini-sfp-book-ocr.ts" 2>/dev/null | grep -q "$PACK_ID"; then
    ping_phone "STOPPED at $count/$EXPECTED — process not running"
    ALERTED_DEAD=1
  fi
fi

stall_sec=$((now - LAST_CHANGE_EPOCH))
if [[ "$count" -lt "$EXPECTED" && "$stall_sec" -ge $((STALL_MINUTES * 60)) && "$ALERTED_STALL" != "1" ]]; then
  ping_phone "STALLED ${STALL_MINUTES}m+ at $count/$EXPECTED (no new OCR)"
  ALERTED_STALL=1
fi

if [[ "$count" -ge "$MIN_FOR_QUALITY" && "$ALERTED_QUALITY" != "1" ]]; then
  pct=$(( low * 100 / count ))
  if [[ "$pct" -ge 25 ]]; then
    ping_phone "QUALITY BAD — ${low}/${count} (${pct}%) fat PDFs stuck at 1 verse"
    ALERTED_QUALITY=1
  fi
fi

cat >"$STATE" <<EOF
LAST_COUNT=$LAST_COUNT
LAST_CHANGE_EPOCH=$LAST_CHANGE_EPOCH
ALERTED_DEAD=$ALERTED_DEAD
ALERTED_STALL=$ALERTED_STALL
ALERTED_QUALITY=$ALERTED_QUALITY
ALERTED_DONE=$ALERTED_DONE
EOF
