#!/usr/bin/env bash
# One-shot (or resume) TPH title rebake from Gemini verse counts — CDN only.
set -euo pipefail
cd /Users/braddford/Code/Rendezvous-IL
export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"
LOG="$HOME/Library/Logs/tph-ocr/rebake-titles.log"
mkdir -p "$(dirname "$LOG")"
echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) tph title rebake start" | tee -a "$LOG"
npx tsx --env-file=.env.local scripts/rebake-tph-title-slides.ts --apply --resume >>"$LOG" 2>&1
echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) tph title rebake finished exit=$?" | tee -a "$LOG"
# Ping when done
agent-phone-push "TPH title slides rebaked from Gemini verse counts. Pull-to-refresh song packs on phone." >>"$LOG" 2>&1 || true
