#!/bin/bash
set -uo pipefail
cd /Users/braddford/Code/Rendezvous-IL
export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"
LOG="$HOME/Library/Logs/ssoc-ocr/rebake.log"
DONE="$HOME/Code/Rendezvous-IL/.tmp-ssoc-import/rebake-done.json"
EXPECTED=835
n=$(python3 -c "import json; print(len(json.load(open('$DONE'))))" 2>/dev/null || echo 0)
echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) rebake-daemon count=$n/$EXPECTED" | tee -a "$LOG"
if [[ "${n:-0}" -ge "$EXPECTED" ]]; then
  echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) rebake complete — idle" | tee -a "$LOG"
  sleep 3600
  exit 0
fi
npx tsx --env-file=.env.local scripts/rebake-ssoc-title-slides.ts --apply --resume --limit=40 >>"$LOG" 2>&1
n=$(python3 -c "import json; print(len(json.load(open('$DONE'))))" 2>/dev/null || echo 0)
echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) after chunk count=$n" | tee -a "$LOG"
if [[ "${n:-0}" -ge "$EXPECTED" ]]; then
  agent-phone-push "SSOC rebake done ($n/$EXPECTED) — pull Wonderful Words in the app" || true
fi
sleep 3
