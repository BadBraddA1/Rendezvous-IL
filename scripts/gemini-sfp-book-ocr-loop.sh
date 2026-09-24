#!/bin/bash
# Durable Gemini SFP book OCR loop (launchd KeepAlive).
set -euo pipefail
cd /Users/braddford/Code/Rendezvous-IL
export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"
LOG_DIR="$HOME/Library/Logs/sfp-ocr"
mkdir -p "$LOG_DIR" /tmp/sfp-gemini-pdfs
LOG="$LOG_DIR/gemini-book.log"

log() { echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) $*" | tee -a "$LOG"; }

log "gemini-book start model=${GEMINI_OCR_MODEL:-google/gemini-2.5-flash}"

# One full pass; if exit non-zero, launchd restarts after ThrottleInterval.
npx tsx --env-file=.env.local scripts/gemini-sfp-book-ocr.ts \
  --apply \
  --concurrency="${GEMINI_OCR_CONCURRENCY:-1}" \
  --model="${GEMINI_OCR_MODEL:-google/gemini-2.5-flash}" \
  >>"$LOG" 2>&1

log "gemini-book pass finished exit=$?"
# Re-scan soon for 429 leftovers; when all done, most are SKIP and this is cheap.
sleep 120
