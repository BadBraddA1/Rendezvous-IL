#!/usr/bin/env bash
# iPad 13-inch App Store screenshots (2064×2752).
# Usage: bash ios/scripts/capture-app-store-screenshots-ipad.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export SCREENSHOT_DEVICE="${SCREENSHOT_DEVICE:-iPad Pro 13-inch}"
export SCREENSHOT_FORM_FACTOR=ipad
exec bash "$ROOT/scripts/capture-app-store-screenshots.sh"
