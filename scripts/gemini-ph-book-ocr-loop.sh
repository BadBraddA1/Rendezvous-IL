#!/usr/bin/env bash
# Durable Gemini OCR loop for Praise and Harmony (book D).
# CDN-only. Skips truncated PPTX stubs (page_count < 3) until drive rebake.
set -euo pipefail
cd /Users/braddford/Code/Rendezvous-IL
export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"
LOG_DIR="$HOME/Library/Logs/ph-ocr"
mkdir -p "$LOG_DIR"
LOG="$LOG_DIR/gemini-book.log"
PACK_ID="${PH_PACK_ID:-6cc2a022-d1fd-4e00-8fe5-4649018b5818}"

log() { echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) $*" | tee -a "$LOG"; }

export GEMINI_OCR_MODEL="${GEMINI_OCR_MODEL:-google/gemini-2.5-flash}"
export GEMINI_OCR_CONCURRENCY="${GEMINI_OCR_CONCURRENCY:-8}"

EMPTY_LOCAL="${TMPDIR:-/tmp}/ph-gemini-cdn-only"
mkdir -p "$EMPTY_LOCAL"

log "ph gemini start pack=$PACK_ID model=$GEMINI_OCR_MODEL concurrency=$GEMINI_OCR_CONCURRENCY source=cdn min-pages=3"

npx tsx --env-file=.env.local scripts/gemini-sfp-book-ocr.ts \
  --apply \
  --concurrency="$GEMINI_OCR_CONCURRENCY" \
  --model="$GEMINI_OCR_MODEL" \
  --pack-id="$PACK_ID" \
  --local-pdf-dir="$EMPTY_LOCAL" \
  --min-pages=3 \
  --out=/tmp/ph-gemini-ocr.jsonl \
  >>"$LOG" 2>&1

log "ph gemini pass finished exit=$?"
sleep 120
