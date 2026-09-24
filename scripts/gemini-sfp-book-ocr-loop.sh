#!/bin/bash
# Durable Gemini SFP book OCR loop (launchd KeepAlive).
set -euo pipefail
cd /Users/braddford/Code/Rendezvous-IL
export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"
LOG_DIR="$HOME/Library/Logs/sfp-ocr"
mkdir -p "$LOG_DIR" /tmp/sfp-gemini-pdfs
LOG="$LOG_DIR/gemini-book.log"

log() { echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) $*" | tee -a "$LOG"; }

export GEMINI_OCR_MODEL="${GEMINI_OCR_MODEL:-google/gemini-2.5-flash}"
export GEMINI_OCR_CONCURRENCY="${GEMINI_OCR_CONCURRENCY:-8}"
export GEMINI_OCR_MIN_GAP_MS="${GEMINI_OCR_MIN_GAP_MS:-0}"

log "gemini-book start model=$GEMINI_OCR_MODEL concurrency=$GEMINI_OCR_CONCURRENCY gapMs=$GEMINI_OCR_MIN_GAP_MS"

npx tsx --env-file=.env.local scripts/gemini-sfp-book-ocr.ts \
  --apply \
  --concurrency="$GEMINI_OCR_CONCURRENCY" \
  --model="$GEMINI_OCR_MODEL" \
  >>"$LOG" 2>&1

log "gemini-book pass finished exit=$?"
# Re-scan soon for empty-verse / 429 leftovers.
sleep 120
