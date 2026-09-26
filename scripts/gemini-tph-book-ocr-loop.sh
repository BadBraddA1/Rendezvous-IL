#!/usr/bin/env bash
# Durable Gemini OCR loop for The Paperless Hymnal (book C).
# PDFs are already on R2/CDN — no PRO-G40 / local PDF dir required.
set -uo pipefail
cd /Users/braddford/Code/Rendezvous-IL
export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"
LOG_DIR="$HOME/Library/Logs/tph-ocr"
mkdir -p "$LOG_DIR"
LOG="$LOG_DIR/gemini-book.log"
PACK_ID="${TPH_PACK_ID:-d7b0b452-5467-4099-917d-f10a9d052c0b}"

log() { echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) $*" | tee -a "$LOG"; }

export GEMINI_OCR_MODEL="${GEMINI_OCR_MODEL:-google/gemini-2.5-flash}"
export GEMINI_OCR_CONCURRENCY="${GEMINI_OCR_CONCURRENCY:-8}"

EMPTY_LOCAL="${TMPDIR:-/tmp}/tph-gemini-cdn-only"
mkdir -p "$EMPTY_LOCAL"

log "tph gemini start pack=$PACK_ID model=$GEMINI_OCR_MODEL concurrency=$GEMINI_OCR_CONCURRENCY source=cdn"

set +e
npx tsx --env-file=.env.local scripts/gemini-sfp-book-ocr.ts \
  --apply \
  --concurrency="$GEMINI_OCR_CONCURRENCY" \
  --model="$GEMINI_OCR_MODEL" \
  --pack-id="$PACK_ID" \
  --local-pdf-dir="$EMPTY_LOCAL" \
  --out=/tmp/tph-gemini-ocr.jsonl \
  >>"$LOG" 2>&1
rc=$?
set -e

log "tph gemini pass finished exit=$rc"
sleep 120
exit 0
