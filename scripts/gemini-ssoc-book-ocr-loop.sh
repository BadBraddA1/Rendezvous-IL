#!/bin/bash
# Durable Gemini OCR loop for Sacred Songs of the Church.
set -euo pipefail
cd /Users/braddford/Code/Rendezvous-IL
export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"
LOG_DIR="$HOME/Library/Logs/ssoc-ocr"
mkdir -p "$LOG_DIR"
LOG="$LOG_DIR/gemini-book.log"
PACK_ID="${SSOC_PACK_ID:-$(cat .tmp-ssoc-import/pack-id.txt 2>/dev/null || true)}"
PACK_ID="${PACK_ID:-de98d363-5295-4788-b766-5febaa4e202d}"
LOCAL_PDF="${SSOC_KEEP_PDF_DIR:-$HOME/Code/ssoc-full-pdf}"

log() { echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) $*" | tee -a "$LOG"; }

export GEMINI_OCR_MODEL="${GEMINI_OCR_MODEL:-google/gemini-2.5-flash}"
export GEMINI_OCR_CONCURRENCY="${GEMINI_OCR_CONCURRENCY:-4}"

log "ssoc gemini start pack=$PACK_ID model=$GEMINI_OCR_MODEL concurrency=$GEMINI_OCR_CONCURRENCY"

npx tsx --env-file=.env.local scripts/gemini-sfp-book-ocr.ts \
  --apply \
  --concurrency="$GEMINI_OCR_CONCURRENCY" \
  --model="$GEMINI_OCR_MODEL" \
  --pack-id="$PACK_ID" \
  --local-pdf-dir="$LOCAL_PDF" \
  --out=/tmp/ssoc-gemini-ocr.jsonl \
  >>"$LOG" 2>&1

log "ssoc gemini pass finished exit=$?"
sleep 120
