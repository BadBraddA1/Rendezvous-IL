#!/usr/bin/env bash
# Durable Gemini OCR loop for The Paperless Hymnal (book C).
set -uo pipefail
cd /Users/braddford/Code/Rendezvous-IL
export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"
LOG_DIR="$HOME/Library/Logs/tph-ocr"
mkdir -p "$LOG_DIR"
LOG="$LOG_DIR/gemini-book.log"
DRIVE_WORK="${TPH_DRIVE_WORK:-/Volumes/PRO-G40-Bradd/_cloud-work}"
PACK_ID="${TPH_PACK_ID:-d7b0b452-5467-4099-917d-f10a9d052c0b}"
# Prefer Mac SSD copy for OCR reads; fall back to PRO-G40.
LOCAL_PDF="$HOME/Code/tph-full-pdf"
if [[ ! -d "$LOCAL_PDF" ]] || [[ "$(find "$LOCAL_PDF" -maxdepth 1 -name '*.pdf' 2>/dev/null | wc -l | tr -d ' ')" -lt 100 ]]; then
  if [[ -d "$DRIVE_WORK/tph-full-pdf" ]]; then
    LOCAL_PDF="$DRIVE_WORK/tph-full-pdf"
  fi
fi

log() { echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) $*" | tee -a "$LOG"; }

export GEMINI_OCR_MODEL="${GEMINI_OCR_MODEL:-google/gemini-2.5-flash}"
export GEMINI_OCR_CONCURRENCY="${GEMINI_OCR_CONCURRENCY:-8}"

n=$(find "$LOCAL_PDF" -maxdepth 1 -name '*.pdf' 2>/dev/null | wc -l | tr -d ' ' || echo 0)
if [[ "${n:-0}" -lt 1 ]]; then
  log "tph gemini idle — no local PDFs at $LOCAL_PDF"
  sleep 120
  exit 0
fi

log "tph gemini start pack=$PACK_ID model=$GEMINI_OCR_MODEL concurrency=$GEMINI_OCR_CONCURRENCY localPdfs=$n dir=$LOCAL_PDF"

set +e
npx tsx --env-file=.env.local scripts/gemini-sfp-book-ocr.ts \
  --apply \
  --concurrency="$GEMINI_OCR_CONCURRENCY" \
  --model="$GEMINI_OCR_MODEL" \
  --pack-id="$PACK_ID" \
  --local-pdf-dir="$LOCAL_PDF" \
  --out=/tmp/tph-gemini-ocr.jsonl \
  >>"$LOG" 2>&1
rc=$?
set -e

log "tph gemini pass finished exit=$rc"
sleep 120
exit 0
