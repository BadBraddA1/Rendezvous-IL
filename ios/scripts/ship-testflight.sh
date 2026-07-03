#!/usr/bin/env bash
# Archive Rendezvous IL and upload to App Store Connect (TestFlight).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

export DEVELOPER_DIR="${DEVELOPER_DIR:-/Applications/Xcode.app/Contents/Developer}"
if [[ -d "/Users/braddford/Downloads/Xcode-beta.app/Contents/Developer" ]]; then
  export DEVELOPER_DIR="/Users/braddford/Downloads/Xcode-beta.app/Contents/Developer"
fi

TEAM_ID="${DEVELOPMENT_TEAM:-F5HPRRCC5H}"
ARCHIVE_PATH="${ARCHIVE_PATH:-$ROOT/build/RendezvousIL.xcarchive}"
EXPORT_DIR="${EXPORT_DIR:-$ROOT/build/appstore-upload}"
EXPORT_PLIST="$ROOT/build/ExportOptions-upload.plist"

echo "==> XcodeGen"
command -v xcodegen >/dev/null && xcodegen generate

mkdir -p "$ROOT/build"

cat > "$EXPORT_PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>method</key>
	<string>app-store-connect</string>
	<key>destination</key>
	<string>upload</string>
	<key>signingStyle</key>
	<string>automatic</string>
	<key>teamID</key>
	<string>$TEAM_ID</string>
	<key>uploadSymbols</key>
	<true/>
</dict>
</plist>
EOF

echo "==> Archive (Release)"
xcodebuild archive \
  -project RendezvousIL.xcodeproj \
  -scheme RendezvousIL \
  -configuration Release \
  -archivePath "$ARCHIVE_PATH" \
  -destination 'generic/platform=iOS' \
  -clonedSourcePackagesDirPath /tmp/spm-rendezvous-il \
  -allowProvisioningUpdates \
  DEVELOPMENT_TEAM="$TEAM_ID"

echo "==> Verify Clerk key in archive"
bash "$ROOT/scripts/verify-clerk-plist.sh" "$ARCHIVE_PATH"

echo "==> Export + upload to App Store Connect"
rm -rf "$EXPORT_DIR"
xcodebuild -exportArchive \
  -archivePath "$ARCHIVE_PATH" \
  -exportPath "$EXPORT_DIR" \
  -exportOptionsPlist "$EXPORT_PLIST" \
  -allowProvisioningUpdates

BUILD=$(/usr/libexec/PlistBuddy -c 'Print :ApplicationProperties:CFBundleVersion' "$ARCHIVE_PATH/Info.plist")
VERSION=$(/usr/libexec/PlistBuddy -c 'Print :ApplicationProperties:CFBundleShortVersionString' "$ARCHIVE_PATH/Info.plist")
echo ""
echo "Uploaded Rendezvous IL v$VERSION ($BUILD) — check App Store Connect → TestFlight for processing."
