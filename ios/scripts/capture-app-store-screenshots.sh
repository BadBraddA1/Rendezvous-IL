#!/usr/bin/env bash
# Capture App Store marketing screenshots on an iPhone Pro Max simulator.
# Output: ios/AppStoreScreenshots/*.png
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
DERIVED="$ROOT/build/screenshot-derived"

command -v xcodegen >/dev/null && xcodegen generate

mkdir -p "$OUT_DIR" "$DERIVED"

echo "==> Boot $DEVICE_NAME"
xcrun simctl boot "$DEVICE_NAME" 2>/dev/null || true
xcrun simctl bootstatus "$DEVICE_NAME" -b

echo "==> Build"
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

# simctl can hang on paths with spaces — copy to /tmp
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
  # Write into the app container (simctl launch args / defaults write bundle-id are unreliable)
  defaults write "$prefs" AppStoreScreenshots -bool true
  defaults write "$prefs" ScreenshotTab -string "$tab"
}

clear_demo_prefs() {
  local prefs
  prefs="$(prefs_path)"
  defaults delete "$prefs" AppStoreScreenshots 2>/dev/null || true
  defaults delete "$prefs" ScreenshotTab 2>/dev/null || true
}

capture() {
  local tab="$1"
  local file="$2"
  echo "==> Screenshot: $tab → $file"
  ( xcrun simctl terminate "$UDID" "$BUNDLE_ID" & sleep 2; kill $! 2>/dev/null ) 2>/dev/null || true
  sleep 1
  set_tab "$tab"
  open -a Simulator
  xcrun simctl launch "$UDID" "$BUNDLE_ID"
  # Let schedule/network settle; bring Simulator to front
  sleep 5
  xcrun simctl io "$UDID" screenshot "$OUT_DIR/$file"
}

capture welcome "02-welcome.png"
capture home "03-home.png"
capture schedule "04-schedule.png"
capture chat "05-chat.png"
capture directory "06-directory.png"
capture more "07-more.png"

clear_demo_prefs

echo ""
echo "Screenshots saved to:"
ls -la "$OUT_DIR"
echo ""
echo "Upload the 6.9\" frames in App Store Connect → App Store → version → Previews and Screenshots."
echo "Device: $DEVICE_NAME (portrait PNGs)."
echo "If frames are blank/SpringBoard, capture manually in Xcode (see ios/README.md)."
