#!/usr/bin/env bash
# Capture App Store marketing screenshots (iPhone 17 Pro Max sim → 1284×2778 PNGs).
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

# Prefer full Xcode over Command Line Tools (simctl / xcodebuild need it).
if [[ ! -x "$DEVELOPER_DIR/usr/bin/simctl" ]]; then
  for candidate in \
    /Applications/Xcode.app/Contents/Developer \
    /Users/braddford/Downloads/Xcode-beta.app/Contents/Developer; do
    if [[ -x "$candidate/usr/bin/simctl" ]]; then
      export DEVELOPER_DIR="$candidate"
      break
    fi
  done
fi

if [[ ! -x "$DEVELOPER_DIR/usr/bin/simctl" ]]; then
  echo "No Xcode with simctl found. Install Xcode or set DEVELOPER_DIR."
  exit 1
fi

DEVICE_NAME="${SCREENSHOT_DEVICE:-iPhone 17 Pro Max}"
BUNDLE_ID="com.rendezvousil.braddcorp.app"
FORM_FACTOR="${SCREENSHOT_FORM_FACTOR:-auto}"
if [[ "$FORM_FACTOR" == "auto" ]]; then
  if [[ "$DEVICE_NAME" == *iPad* ]]; then
    FORM_FACTOR="ipad"
  else
    FORM_FACTOR="iphone"
  fi
fi

if [[ "$FORM_FACTOR" == "ipad" ]]; then
  OUT_DIR="${SCREENSHOT_OUT_DIR:-$ROOT/AppStoreScreenshots-iPad}"
  MIN_BYTES="${SCREENSHOT_MIN_BYTES:-400000}"
  MIN_LAUNCH_WAIT="${SCREENSHOT_MIN_LAUNCH_WAIT:-18}"
  APPSTORE_WIDTH="${APPSTORE_WIDTH:-2064}"
  APPSTORE_HEIGHT="${APPSTORE_HEIGHT:-2752}"
  UPLOAD_SLOT='Previews and Screenshots → iPad 13" Display'
else
  OUT_DIR="${SCREENSHOT_OUT_DIR:-$ROOT/AppStoreScreenshots}"
  MIN_BYTES="${SCREENSHOT_MIN_BYTES:-200000}"
  MIN_LAUNCH_WAIT="${SCREENSHOT_MIN_LAUNCH_WAIT:-12}"
  APPSTORE_WIDTH="${APPSTORE_WIDTH:-1284}"
  APPSTORE_HEIGHT="${APPSTORE_HEIGHT:-2778}"
  UPLOAD_SLOT='Previews and Screenshots → iPhone 6.7" Display'
fi

FRAME_POLL_SECS="${SCREENSHOT_POLL_SECS:-30}"

resize_for_app_store() {
  local path="$1"
  local w h
  w="$(sips -g pixelWidth "$path" 2>/dev/null | awk '/pixelWidth/ {print $2}')"
  h="$(sips -g pixelHeight "$path" 2>/dev/null | awk '/pixelHeight/ {print $2}')"
  if [[ "$w" == "$APPSTORE_WIDTH" && "$h" == "$APPSTORE_HEIGHT" ]]; then
    return 0
  fi
  sips -z "$APPSTORE_HEIGHT" "$APPSTORE_WIDTH" "$path" >/dev/null
  # App Store rejects PNGs with alpha.
  sips -s format png -s formatOptions default "$path" >/dev/null 2>&1 || true
}

# Simulator.app (older Xcode) or DeviceHub.app (Xcode 27+) under Contents/Applications.
# Never use bare `open -a Simulator` — it fails hard when the app is missing (exit 255).
SIMULATOR_APP=""
DEVICE_HUB_APP=""
XCODE_APPS="$(dirname "$DEVELOPER_DIR")/Applications"
for candidate in \
  "$DEVELOPER_DIR/Applications/Simulator.app" \
  "$XCODE_APPS/Simulator.app"; do
  if [[ -d "$candidate" ]]; then
    SIMULATOR_APP="$candidate"
    break
  fi
done
if [[ -d "$XCODE_APPS/DeviceHub.app" ]]; then
  DEVICE_HUB_APP="$XCODE_APPS/DeviceHub.app"
fi

open_simulator_gui() {
  if [[ -n "$SIMULATOR_APP" ]]; then
    open -a "$SIMULATOR_APP" || true
    osascript -e 'tell application "Simulator" to activate' >/dev/null 2>&1 || true
  elif [[ -n "$DEVICE_HUB_APP" ]]; then
    open -a "$DEVICE_HUB_APP" || true
  fi
}

command -v xcodegen >/dev/null && xcodegen generate

mkdir -p "$OUT_DIR"

echo "==> Boot $DEVICE_NAME (DEVELOPER_DIR=$DEVELOPER_DIR)"
# Prefer an already-booted device with this name (multiple runtimes may share the name).
UDID="$(xcrun simctl list devices | awk -v name="$DEVICE_NAME" '
  $0 ~ name && $0 ~ /\(Booted\)/ && match($0, /\([A-F0-9-]{36}\)/) {
    print substr($0, RSTART+1, RLENGTH-2)
    exit
  }
')"
if [[ -z "$UDID" ]]; then
  UDID="$(xcrun simctl list devices available | awk -v name="$DEVICE_NAME" '
    $0 ~ name && match($0, /\([A-F0-9-]{36}\)/) {
      print substr($0, RSTART+1, RLENGTH-2)
      exit
    }
  ')"
fi
if [[ -z "$UDID" ]]; then
  echo "Could not resolve simulator UDID for $DEVICE_NAME"
  exit 1
fi

xcrun simctl boot "$UDID" 2>/dev/null || true
xcrun simctl bootstatus "$UDID" -b
if [[ -n "$SIMULATOR_APP" ]]; then
  open_simulator_gui
elif [[ -n "$DEVICE_HUB_APP" ]]; then
  echo "    (opening DeviceHub — Xcode 27 has no Simulator.app)"
  open_simulator_gui
else
  echo "    (no Simulator/DeviceHub GUI — headless simctl; frames may be blank)"
fi
sleep 2

echo "==> Build (Debug, simulator)"
xcodebuild \
  -project RendezvousIL.xcodeproj \
  -scheme RendezvousIL \
  -configuration Debug \
  -destination "platform=iOS Simulator,id=$UDID" \
  build \
  CODE_SIGNING_ALLOWED=NO \
  >/tmp/rendezvous-screenshot-build.log

# Prefer real Build/Products (not Index.noindex stubs that lack Info.plist).
APP="$(find "$HOME/Library/Developer/Xcode/DerivedData" \
  -path '*/Build/Products/Debug-iphonesimulator/Rendezvous IL.app/Info.plist' \
  ! -path '*/Index.noindex/*' \
  2>/dev/null | head -1)"
APP="${APP%/Info.plist}"
if [[ -z "$APP" || ! -d "$APP" ]]; then
  echo "App not found after build. See /tmp/rendezvous-screenshot-build.log"
  exit 1
fi

# simctl can hang on paths with spaces
STAGE="/tmp/RendezvousIL-screenshot.app"
rm -rf "$STAGE"
cp -R "$APP" "$STAGE"
APP="$STAGE"

echo "==> Install on $UDID"
xcrun simctl install "$UDID" "$APP"

set_tab() {
  local tab="$1"
  # Write into the simulator's defaults domain (host `defaults write` on the
  # container path often no-ops / never reaches UserDefaults.standard).
  xcrun simctl spawn "$UDID" defaults write "$BUNDLE_ID" AppStoreScreenshots -bool true
  xcrun simctl spawn "$UDID" defaults write "$BUNDLE_ID" ScreenshotTab -string "$tab"
}

clear_demo_prefs() {
  xcrun simctl spawn "$UDID" defaults delete "$BUNDLE_ID" AppStoreScreenshots 2>/dev/null || true
  xcrun simctl spawn "$UDID" defaults delete "$BUNDLE_ID" ScreenshotTab 2>/dev/null || true
}

terminate_app() {
  ( xcrun simctl terminate "$UDID" "$BUNDLE_ID" & sleep 2; kill $! 2>/dev/null ) 2>/dev/null || true
  sleep 1
}

# simctl io often returns a blank ~80KB PNG for several seconds after launch
# (GPU/framebuffer not ready). Poll until the PNG is large enough or we time out.
frame_is_blank() {
  python3 - "$1" <<'PY'
import sys
from PIL import Image
path = sys.argv[1]
img = Image.open(path).convert("RGB")
# Downsample so validation stays fast (full 1320×2868 scans hang the script).
thumb = img.crop((
    int(img.width * 0.1), int(img.height * 0.12),
    int(img.width * 0.9), int(img.height * 0.88),
)).resize((160, 320))
px = list(thumb.getdata())
uniq = len(set(px))
white = sum(1 for r, g, b in px if r > 245 and g > 245 and b > 245) / len(px)
mean = sum(r for r, _, _ in px) / len(px)
var = sum((r - mean) ** 2 for r, _, _ in px) / len(px)
if uniq <= 2 or white >= 0.985:
    sys.exit(0)
if white <= 0.05 and uniq >= 5000:
    sys.exit(0)
if white >= 0.65 and var >= 3000:
    sys.exit(0)
sys.exit(1)
PY
}

wait_for_frame() {
  local path="$1"
  local elapsed=0
  local size=0
  sleep "$MIN_LAUNCH_WAIT"
  elapsed=$MIN_LAUNCH_WAIT
  while [[ "$elapsed" -lt "$FRAME_POLL_SECS" ]]; do
    xcrun simctl io "$UDID" screenshot --display=LCD "$path"
    size="$(stat -f%z "$path" 2>/dev/null || echo 0)"
    if [[ "$size" -ge "$MIN_BYTES" ]] && ! frame_is_blank "$path"; then
      echo "    ok ($size bytes, ${elapsed}s wait)"
      return 0
    fi
    sleep 2
    elapsed=$((elapsed + 2))
  done
  echo "    warning: no usable frame (last ${size} bytes, ${elapsed}s)"
  return 1
}

capture() {
  local tab="$1"
  local file="$2"
  local attempt path
  path="$OUT_DIR/$file"

  for attempt in 1 2 3; do
    echo "==> Screenshot: $tab → $file (try $attempt)"
    terminate_app
    set_tab "$tab"
    open_simulator_gui
    xcrun simctl launch "$UDID" "$BUNDLE_ID" \
      -AppStoreScreenshots \
      -ScreenshotTab "$tab"
    if wait_for_frame "$path"; then
      resize_for_app_store "$path"
      return 0
    fi
    echo "    retrying launch"
    sleep 2
  done

  echo "    warning: $file may be blank; recapture in DeviceHub if needed"
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
echo "Sizes (expect ${APPSTORE_WIDTH}×${APPSTORE_HEIGHT}):"
sips -g pixelWidth -g pixelHeight "$OUT_DIR"/*.png 2>/dev/null || true
echo ""
echo "App Store metadata (description, keywords, URLs): ios/app-store/metadata.md"
echo "Upload PNGs in App Store Connect → version → ${UPLOAD_SLOT}."

open "$OUT_DIR"
