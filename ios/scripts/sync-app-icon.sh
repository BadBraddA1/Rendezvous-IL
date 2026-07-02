#!/usr/bin/env bash
# Regenerate iOS AppIcon from the site header logo (1024×1024, white canvas).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SRC="$ROOT/public/rendezvous-logo.png"
DEST="$ROOT/ios/RendezvousIL/Resources/Assets.xcassets/AppIcon.appiconset/AppIcon-1024.png"
TMP="$(mktemp -t ren-logo-scaled.XXXXXX).png"

cleanup() { rm -f "$TMP"; }
trap cleanup EXIT

if [[ ! -f "$SRC" ]]; then
  echo "Missing source: $SRC" >&2
  exit 1
fi

# Logo is wide (~5:3); scale to fit with padding, then center on a square canvas.
sips -Z 880 "$SRC" --out "$TMP" >/dev/null
sips --padToHeightWidth 1024 1024 --padColor FFFFFF "$TMP" --out "$DEST" >/dev/null
echo "Updated $DEST from rendezvous-logo.png"
