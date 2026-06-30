#!/usr/bin/env bash
# Regenerate iOS AppIcon from the site favicon (1024×1024 source in public/).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SRC="$ROOT/public/rendezvous-favicon.jpg"
DEST="$ROOT/ios/RendezvousIL/Resources/Assets.xcassets/AppIcon.appiconset/AppIcon-1024.png"

if [[ ! -f "$SRC" ]]; then
  echo "Missing source: $SRC" >&2
  exit 1
fi

sips -s format png "$SRC" --out "$DEST" >/dev/null
echo "Updated $DEST from rendezvous-favicon.jpg"
