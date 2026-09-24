#!/bin/bash
set -uo pipefail
cd /Users/braddford/Code/Rendezvous-IL
export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"
LOG="$HOME/Library/Logs/ssoc-ocr/bake-pptx.log"
DONE="$HOME/Code/Rendezvous-IL/.tmp-ssoc-import/bake-pptx-done.json"
OUT="/Volumes/PRO-G40-Bradd/Song Books/Sacred Songs of the Church/16x9 - titled"
EXPECTED=835
mkdir -p "$(dirname "$LOG")" "$(dirname "$DONE")"
n=$(python3 -c "import json; print(len(json.load(open('$DONE'))))" 2>/dev/null || echo 0)
# also count output folder
outn=$(ls "$OUT"/*.pptx 2>/dev/null | wc -l | tr -d ' ')
echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) bake-pptx-daemon done=$n out=$outn/$EXPECTED" | tee -a "$LOG"
if [[ "${outn:-0}" -ge "$EXPECTED" || "${n:-0}" -ge "$EXPECTED" ]]; then
  echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) bake complete — idle" | tee -a "$LOG"
  sleep 3600
  exit 0
fi
if [[ ! -d "/Volumes/PRO-G40-Bradd/Song Books/Sacred Songs of the Church/16x9" ]]; then
  echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) drive not mounted — wait" | tee -a "$LOG"
  sleep 120
  exit 0
fi
npx tsx --env-file=.env.local scripts/bake-ssoc-title-slides.ts --all --apply --resume --limit=50 >>"$LOG" 2>&1
n=$(python3 -c "import json; print(len(json.load(open('$DONE'))))" 2>/dev/null || echo 0)
outn=$(ls "$OUT"/*.pptx 2>/dev/null | wc -l | tr -d ' ')
echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) after chunk done=$n out=$outn" | tee -a "$LOG"
if [[ "${outn:-0}" -ge "$EXPECTED" ]]; then
  agent-phone-push "SSOC PPTX bake done ($outn) — titled folder on PRO-G40" || true
fi
sleep 2
