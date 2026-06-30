#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ANDROID_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_ROOT="$(cd "$ANDROID_ROOT/.." && pwd)"
DEST="$ANDROID_ROOT/app/src/main/assets/schedule-fallback.json"
IOS_FALLBACK="$REPO_ROOT/ios/RendezvousIL/Resources/schedule-fallback.json"

mkdir -p "$(dirname "$DEST")"

cd "$REPO_ROOT"

TSX_CMD='import { scheduleData, LU_SCHEDULE_ITEMS } from "./lib/schedule-data.ts"; const dayDates = { Monday: "2027-05-03", Tuesday: "2027-05-04", Wednesday: "2027-05-05", Thursday: "2027-05-06", Friday: "2027-05-07" }; console.log(JSON.stringify({ year: 2027, dateRange: "May 3–7, 2027", location: "Lake Williamson Christian Center, Carlinville, IL", draftNotice: "Based on the 2026 schedule — may change slightly for 2027", days: scheduleData, dayDates, luItems: LU_SCHEDULE_ITEMS }))'

if npx tsx -e "$TSX_CMD" > "$DEST" 2>/dev/null; then
  echo "Generated $DEST from lib/schedule-data.ts"
else
  echo "tsx generation failed; copying from iOS fallback"
  cp "$IOS_FALLBACK" "$DEST"
  echo "Copied $IOS_FALLBACK -> $DEST"
fi
