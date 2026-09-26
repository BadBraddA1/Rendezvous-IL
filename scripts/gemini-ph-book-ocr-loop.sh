#!/usr/bin/env bash
# Durable Gemini OCR loop for Praise and Harmony (book D).
set -euo pipefail
cd /Users/braddford/Code/Rendezvous-IL
export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"
LOG_DIR="$HOME/Library/Logs/ph-ocr"
mkdir -p "$LOG_DIR"
LOG="$LOG_DIR/gemini-book.log"
PACK_ID="${PH_PACK_ID:-$(cat /Volumes/PRO-G40-Bradd/_cloud-work/.tmp-ph-import/pack-id.txt 2>/dev/null || true)}"
PACK_ID="${PACK_ID:-6cc2a022-d1fd-4e00-8fe5-4649018b5818}"
LOCAL_PDF="${PH_KEEP_PDF_DIR:-/Volumes/PRO-G40-Bradd/_cloud-work/ph-full-pdf}"
# Fall back to Mac copy if drive path empty
if [[ ! -d "$LOCAL_PDF" ]] || [[ "$(find "$LOCAL_PDF" -maxdepth 1 -name '*.pdf' 2>/dev/null | wc -l | tr -d ' ')" -lt 1 ]]; then
  LOCAL_PDF="${HOME}/Code/ph-full-pdf"
fi

log() { echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) $*" | tee -a "$LOG"; }

export GEMINI_OCR_MODEL="${GEMINI_OCR_MODEL:-google/gemini-2.5-flash}"
export GEMINI_OCR_CONCURRENCY="${GEMINI_OCR_CONCURRENCY:-8}"

# Wait until import has something to OCR
n=$(find "$LOCAL_PDF" -maxdepth 1 -name '*.pdf' 2>/dev/null | wc -l | tr -d ' ')
if [[ "${n:-0}" -lt 1 ]]; then
  log "ph gemini idle — no local PDFs yet"
  sleep 120
  exit 0
fi

log "ph gemini start pack=$PACK_ID model=$GEMINI_OCR_MODEL concurrency=$GEMINI_OCR_CONCURRENCY localPdfs=$n"

npx tsx --env-file=.env.local scripts/gemini-sfp-book-ocr.ts \
  --apply \
  --concurrency="$GEMINI_OCR_CONCURRENCY" \
  --model="$GEMINI_OCR_MODEL" \
  --pack-id="$PACK_ID" \
  --local-pdf-dir="$LOCAL_PDF" \
  --out=/tmp/ph-gemini-ocr.jsonl \
  >>"$LOG" 2>&1

log "ph gemini pass finished exit=$?"
sleep 120
