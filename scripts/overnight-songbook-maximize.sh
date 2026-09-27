#!/usr/bin/env bash
# Overnight songbook maximizer — keep PRO-G40 + CDN busy until morning.
# Chains: P&H truncated reimport → Gemini → P&H title rebake
#          TPH title rebake → sync early CDN rebakes onto drive
# Phone-pings at milestones. Prevents Mac sleep via caffeinate.
set -uo pipefail
cd /Users/braddford/Code/Rendezvous-IL || exit 1
export PATH="/Users/braddford/.local/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$PATH"
unset TURSO_DATABASE_URL TURSO_AUTH_TOKEN 2>/dev/null || true

LOG="$HOME/Library/Logs/ph-ocr/overnight-maximize.log"
NUMS="/Users/braddford/Code/Rendezvous-IL/docs/ops/ph-rerun-truncated-nums.txt"
PH_ID=6cc2a022-d1fd-4e00-8fe5-4649018b5818
TPH_DONE="$HOME/Code/Rendezvous-IL/.tmp-tph-import/rebake-titles-done.json"
DRIVE="/Volumes/PRO-G40-Bradd/_cloud-work"
mkdir -p "$(dirname "$LOG")" "$HOME/.config/agent-alert"

log() { echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) $*" | tee -a "$LOG"; }
ping() { agent-phone-push "$*" >>"$LOG" 2>&1 || log "ping failed: $*"; }

# Reset completion flags so we can ping again tonight
cat >"$HOME/.config/agent-alert/songbook-watch.state" <<'EOF'
PH_UPLOAD_PINGED=1
GEMINI_BOTH_PINGED=0
EOF

log "overnight maximize start — drive=$([[ -d $DRIVE ]] && echo yes || echo NO)"

# --- Phase A (parallel now): sync TPH keep PDFs that predate tonight's rebake ---
if [[ -d "$DRIVE/tph-full-pdf" ]]; then
  log "phase A: sync stale TPH keep PDFs from CDN → drive (mtime before 2026-09-26T21:00Z)"
  npx tsx --env-file=.env.local scripts/sync-pack-pdfs-to-drive.ts \
    --pack=tph --stale-before=2026-09-26T21:00:00Z --concurrency=8 --apply \
    >>"$LOG" 2>&1 &
  SYNC_PID=$!
  log "tph drive sync pid=$SYNC_PID"
else
  log "WARN drive missing — skip TPH sync"
  SYNC_PID=""
fi

# Ensure P&H Gemini KeepAlive is up (min-pages=3)
launchctl kickstart -k "gui/$(id -u)/com.braddcorp.ph-gemini-ocr" 2>/dev/null || true

# Re-arm completion watcher
launchctl bootout "gui/$(id -u)/com.braddcorp.songbook-completion-watch" 2>/dev/null || true
sleep 1
if [[ -f "$HOME/Library/LaunchAgents/com.braddcorp.songbook-completion-watch.plist" ]]; then
  launchctl bootstrap "gui/$(id -u)" "$HOME/Library/LaunchAgents/com.braddcorp.songbook-completion-watch.plist" 2>/dev/null || true
fi
nohup songbook-completion-watch >>"$HOME/Library/Logs/songbook-completion-watch.log" 2>&1 &

ph_rerun_count() {
  env -u TURSO_DATABASE_URL -u TURSO_AUTH_TOKEN NUMS_FILE="$NUMS" PH_PACK_ID="$PH_ID" \
    npx tsx --env-file=.env.local <<'TS' 2>/dev/null | tail -1
import { createClient } from "@libsql/client"
import { readFileSync } from "fs"
const nums = readFileSync(process.env.NUMS_FILE!, "utf8").split(/\s+/).map(Number).filter((n) => n > 0)
const db = createClient({ url: process.env.TURSO_DATABASE_URL!, authToken: process.env.TURSO_AUTH_TOKEN! })
let good = 0
for (let i = 0; i < nums.length; i += 80) {
  const chunk = nums.slice(i, i + 80)
  const r = await db.execute({
    sql: `SELECT count(*) AS n FROM song_pack_items WHERE pack_id=? AND sort_order IN (${chunk.map(() => "?").join(",")}) AND page_count > 2`,
    args: [process.env.PH_PACK_ID!, ...chunk],
  })
  good += Number(r.rows[0].n)
}
console.log(good)
TS
}

ph_gemini_good() {
  env -u TURSO_DATABASE_URL -u TURSO_AUTH_TOKEN \
    npx tsx --env-file=.env.local scripts/songbook-watch-counts.ts 2>/dev/null \
    | sed -n 's/^ph_good_g=//p' | head -1 | tr -cd '0-9'
}

ph_gemini_need() {
  env -u TURSO_DATABASE_URL -u TURSO_AUTH_TOKEN \
    npx tsx --env-file=.env.local scripts/songbook-watch-counts.ts 2>/dev/null \
    | sed -n 's/^ph_good_n=//p' | head -1 | tr -cd '0-9'
}

tph_rebake_done() {
  python3 -c "import json,os; p=os.path.expanduser('$TPH_DONE'); print(len(json.load(open(p))) if os.path.exists(p) else 0)" 2>/dev/null || echo 0
}

EXPECTED=328
PH_RERUN_DONE=0
TPH_REBAKE_DONE=0
PH_GEMINI_DONE=0
PH_TITLE_STARTED=0
PH_TITLE_DONE=0

# --- Monitor loop ---
while true; do
  if [[ ! -d "$DRIVE" ]]; then
    log "ERROR drive unmounted — waiting"
    sleep 120
    continue
  fi

  rerun="$(ph_rerun_count | tr -cd '0-9')"
  rerun=${rerun:-0}
  tphd="$(tph_rebake_done | tr -cd '0-9')"
  tphd=${tphd:-0}
  good_g="$(ph_gemini_good)"
  good_n="$(ph_gemini_need)"
  good_g=${good_g:-0}
  good_n=${good_n:-0}

  log "status ph_rerun=${rerun}/${EXPECTED} tph_rebake=${tphd}/963 ph_gemini=${good_g}/${good_n} title_started=${PH_TITLE_STARTED}"

  # Ensure import still alive if incomplete — never relaunch a full wipe if
  # the master script is still up or shards were active recently.
  if (( rerun < EXPECTED )); then
    if pgrep -f 'run-ph-rerun-truncated|import-ph-songbook' >/dev/null 2>&1; then
      :
    else
      # Only relaunch if master log is stale (>15 min) — avoid false gaps mid-LO
      stale=1
      if [[ -f "$HOME/Library/Logs/ph-ocr/rerun-truncated-master.log" ]]; then
        age=$(( $(date +%s) - $(stat -f %m "$HOME/Library/Logs/ph-ocr/rerun-truncated-master.log") ))
        if (( age < 900 )); then stale=0; fi
      fi
      if (( stale == 1 )); then
        log "WARN P&H import dead (>15m) — relaunching (safe: skips already-full PDFs)"
        launchctl kickstart -k "gui/$(id -u)/com.braddcorp.ph-rerun-truncated" 2>/dev/null \
          || nohup ./scripts/run-ph-rerun-truncated.sh >>"$LOG" 2>&1 &
      else
        log "P&H import procs quiet but master log fresh (${age}s) — waiting"
      fi
    fi
  fi

  # Ensure TPH rebake alive if incomplete
  if (( tphd < 963 )) && ! pgrep -f 'rebake-tph-title-slides' >/dev/null 2>&1; then
    log "WARN TPH rebake dead — relaunching"
    launchctl kickstart -k "gui/$(id -u)/com.braddcorp.tph-rebake-titles" 2>/dev/null \
      || nohup bash scripts/rebake-tph-titles-loop.sh >>"$LOG" 2>&1 &
  fi

  # Ensure Gemini alive while P&H still has gaps
  if (( good_n > 0 && good_g < good_n )) && ! pgrep -f 'gemini-sfp-book-ocr.ts.*6cc2a022' >/dev/null 2>&1; then
    log "WARN P&H Gemini dead — kickstarting"
    launchctl kickstart -k "gui/$(id -u)/com.braddcorp.ph-gemini-ocr" 2>/dev/null || true
  fi

  if (( PH_RERUN_DONE == 0 && rerun >= EXPECTED )); then
    PH_RERUN_DONE=1
    ping "P&H truncated reimport DONE — ${rerun}/${EXPECTED} full PDFs on CDN/drive. Gemini catching up (${good_g}/${good_n})."
    launchctl kickstart -k "gui/$(id -u)/com.braddcorp.ph-gemini-ocr" 2>/dev/null || true
  fi

  if (( TPH_REBAKE_DONE == 0 && tphd >= 963 )); then
    TPH_REBAKE_DONE=1
    ping "TPH title rebake DONE — 963/963 Gemini verse counts on CDN + drive keep PDFs."
    npx tsx --env-file=.env.local scripts/sync-pack-pdfs-to-drive.ts \
      --pack=tph --stale-before=2026-09-26T21:00:00Z --concurrency=8 --apply \
      >>"$LOG" 2>&1 || true
  fi

  # Start P&H title rebake once rerun done and Gemini ≥90% of good PDFs
  if (( PH_TITLE_STARTED == 0 && PH_RERUN_DONE == 1 && good_n >= 450 && good_g * 100 >= good_n * 90 )); then
    PH_TITLE_STARTED=1
    ping "P&H Gemini ${good_g}/${good_n} — starting title rebake from Gemini verse counts → CDN + drive."
    nohup npx tsx --env-file=.env.local scripts/rebake-ph-title-slides.ts --apply --resume --min-pages=3 \
      >>"$HOME/Library/Logs/ph-ocr/rebake-titles.log" 2>&1 &
    log "started P&H title rebake pid=$!"
  fi

  if (( PH_TITLE_STARTED == 1 && PH_TITLE_DONE == 0 )) && ! pgrep -f 'rebake-ph-title-slides' >/dev/null 2>&1; then
    PH_TITLE_DONE=1
    ping "P&H title rebake finished. Overnight songbook pipeline wrapping up."
  fi

  if (( PH_RERUN_DONE == 1 && TPH_REBAKE_DONE == 1 && PH_TITLE_DONE == 1 )); then
    log "all overnight phases done — exiting"
    ping "Overnight maximize complete. TPH titles + P&H full PDFs + Gemini + title rebakes on CDN/drive."
    exit 0
  fi

  sleep 90
done
