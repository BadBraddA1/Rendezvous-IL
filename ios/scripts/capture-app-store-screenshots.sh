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

capture() {
  local tab="$1"
  local file="$2"
  echo "==> Screenshot: $tab → $file"
  # terminate can hang if the app is not running — bound it
  ( xcrun simctl terminate "$UDID" "$BUNDLE_ID" & sleep 2; kill $! 2>/dev/null ) 2>/dev/null || true
  xcrun simctl launch "$UDID" "$BUNDLE_ID" -AppStoreScreenshots -ScreenshotTab "$tab"
  # Let schedule/network settle
  sleep 3.5
  xcrun simctl io "$UDID" screenshot "$OUT_DIR/$file"
}

# Optional splash (logo) — launch and grab quickly
echo "==> Screenshot: splash"
xcrun simctl terminate "$UDID" "$BUNDLE_ID" 2>/dev/null || true
xcrun simctl launch "$UDID" "$BUNDLE_ID" -AppStoreScreenshots -ScreenshotTab schedule
sleep 0.35
xcrun simctl io "$UDID" screenshot "$OUT_DIR/01-splash.png" || true

capture welcome "02-welcome.png"
capture home "03-home.png"
capture schedule "04-schedule.png"
capture chat "05-chat.png"
capture directory "06-directory.png"
capture more "07-more.png"

echo ""
echo "Screenshots saved to:"
ls -la "$OUT_DIR"
echo ""
echo "Upload the 6.9\" frames in App Store Connect → App Store → version → Previews and Screenshots."
echo "Device: $DEVICE_NAME (portrait PNGs)."
