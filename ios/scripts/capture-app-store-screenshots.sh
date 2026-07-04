#!/usr/bin/env bash
# Capture App Store marketing screenshots (iPhone 6.9″ / Pro Max).
# Usage (from anywhere):
#   bash /Users/braddford/rendezvous-il/ios/scripts/capture-app-store-screenshots.sh
# Or from ios/:
#   bash scripts/capture-app-store-screenshots.sh
#
# Output: ios/AppStoreScreenshots/*.png  (then opens Finder)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

export DEVELOPER_DIR="${DEVELOPER_DIR:-/Applications/Xcode.app/Contents/Developer}"
if [[ -d "/Users/braddford/Downloads/Xcode-beta.app/Contents/Developer" ]]; then
  export DEVELOPER_DIR="/Users/braddford/Downloads/Xcode-beta.app/Contents/Developer"
fi

DEVICE_NAME="${SCREENSHOT_DEVICE:-iPhone 17 Pro Max}"
BUNDLE_ID="com.rendezvousil.braddcorp.app"
OUT_DIR="$ROOT/AppStoreScreenshots"
MIN_BYTES="${SCREENSHOT_MIN_BYTES:-100000}"

command -v xcodegen >/dev/null && xcodegen generate

mkdir -p "$OUT_DIR"

echo "==> Boot $DEVICE_NAME"
xcrun simctl boot "$DEVICE_NAME" 2>/dev/null || true
xcrun simctl bootstatus "$DEVICE_NAME" -b
open -a Simulator
sleep 2

echo "==> Build (Debug, simulator)"
xcodebuild \
  -project RendezvousIL.xcodeproj \
  -scheme RendezvousIL \
  -configuration Debug \
  -destination "platform=iOS Simulator,name=$DEVICE_NAME" \
  build \
  CODE_SIGNING_ALLOWED=NO \
  >/tmp/rendezvous-screenshot-build.log

APP="$(find "$HOME/Library/Developer/Xcode/DerivedData" -path '*/Build/Products/Debug-iphonesimulator/Rendezvous IL.app' -type d 2>/dev/null | head -1)"
if [[ -z "$APP" || ! -d "$APP" ]]; then
  echo "App not found after build. See /tmp/rendezvous-screenshot-build.log"
  exit 1
fi

# simctl can hang on paths with spaces
STAGE="/tmp/RendezvousIL-screenshot.app"
rm -rf "$STAGE"
cp -R "$APP" "$STAGE"
APP="$STAGE"

UDID="$(xcrun simctl list devices | awk -v name="$DEVICE_NAME" '
  $0 ~ name && $0 ~ /\([A-F0-9-]{36}\)/ {
    if (match($0, /\([A-F0-9-]{36}\)/)) {
      id=substr($0, RSTART+1, RLENGTH-2)
      print id
      exit
    }
  }')"

if [[ -z "$UDID" ]]; then
  echo "Could not resolve simulator UDID for $DEVICE_NAME"
  exit 1
fi

echo "==> Install on $UDID"
xcrun simctl install "$UDID" "$APP"

prefs_path() {
  local data
  data="$(xcrun simctl get_app_container "$UDID" "$BUNDLE_ID" data)"
  echo "$data/Library/Preferences/$BUNDLE_ID"
}

set_tab() {
  local tab="$1"
  local prefs
  prefs="$(prefs_path)"
  defaults write "$prefs" AppStoreScreenshots -bool true
  defaults write "$prefs" ScreenshotTab -string "$tab"
}

clear_demo_prefs() {
  local prefs
  prefs="$(prefs_path)"
  defaults delete "$prefs" AppStoreScreenshots 2>/dev/null || true
  defaults delete "$prefs" ScreenshotTab 2>/dev/null || true
}

terminate_app() {
  ( xcrun simctl terminate "$UDID" "$BUNDLE_ID" & sleep 2; kill $! 2>/dev/null ) 2>/dev/null || true
  sleep 1
}

capture() {
  local tab="$1"
  local file="$2"
  local attempt path size
  path="$OUT_DIR/$file"

  for attempt in 1 2 3; do
    echo "==> Screenshot: $tab → $file (try $attempt)"
    terminate_app
    set_tab "$tab"
    osascript -e 'tell application "Simulator" to activate' >/dev/null 2>&1 || true
    xcrun simctl launch "$UDID" "$BUNDLE_ID"
    # Welcome is instant; schedule/home need network
    if [[ "$tab" == "welcome" ]]; then
      sleep 3
    else
      sleep 6
    fi
    xcrun simctl io "$UDID" screenshot "$path"
    size="$(stat -f%z "$path" 2>/dev/null || echo 0)"
    if [[ "$size" -ge "$MIN_BYTES" ]]; then
      echo "    ok ($size bytes)"
      return 0
    fi
    echo "    small frame ($size bytes) — retrying"
    sleep 2
  done

  echo "    warning: $file may be blank/SpringBoard; recapture in Xcode if needed"
}

capture welcome "01-welcome.png"
capture home "02-home.png"
capture schedule "03-schedule.png"
capture chat "04-chat.png"
capture directory "05-directory.png"
capture more "06-more.png"

clear_demo_prefs
terminate_app

echo ""
echo "Screenshots saved to: $OUT_DIR"
ls -la "$OUT_DIR"
echo ""
echo "Sizes (expect ~1320×2868):"
sips -g pixelWidth -g pixelHeight "$OUT_DIR"/*.png 2>/dev/null || true
echo ""
echo "App Store metadata (description, keywords, URLs): ios/app-store/metadata.md"
echo "Upload PNGs in App Store Connect → version → Previews and Screenshots → iPhone 6.9\" Display."

open "$OUT_DIR"
