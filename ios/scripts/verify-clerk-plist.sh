#!/usr/bin/env bash
# Verify a built .app or .xcarchive contains CLERK_PUBLISHABLE_KEY in Info.plist.
set -euo pipefail

APP_PATH="${1:-}"
if [[ -z "$APP_PATH" ]]; then
  echo "Usage: $0 /path/to/App.app | /path/to/App.xcarchive" >&2
  exit 1
fi

if [[ -d "$APP_PATH" && "$APP_PATH" == *.xcarchive ]]; then
  APP_PATH=$(find "$APP_PATH/Products/Applications" -maxdepth 1 -name '*.app' | head -1)
fi

PLIST="$APP_PATH/Info.plist"
if [[ ! -f "$PLIST" ]]; then
  echo "No Info.plist at $PLIST" >&2
  exit 1
fi

KEY=$(/usr/libexec/PlistBuddy -c 'Print :CLERK_PUBLISHABLE_KEY' "$PLIST" 2>/dev/null || true)
if [[ -z "$KEY" ]]; then
  echo "FAIL: CLERK_PUBLISHABLE_KEY missing from $PLIST" >&2
  exit 1
fi
if [[ "$KEY" == *'$('* ]]; then
  echo "FAIL: CLERK_PUBLISHABLE_KEY unresolved: $KEY" >&2
  exit 1
fi
if [[ "$KEY" != pk_live_* && "$KEY" != pk_test_* ]]; then
  echo "FAIL: invalid Clerk key prefix" >&2
  exit 1
fi

echo "OK: CLERK_PUBLISHABLE_KEY present (len=${#KEY})"
