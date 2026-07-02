#!/usr/bin/env bash
# Run after git clone / pull when Xcode shows "No such module 'Clerk'" or missing Swift files.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! command -v xcodegen >/dev/null 2>&1; then
  echo "Installing XcodeGen…"
  brew install xcodegen
fi

if [[ ! -f Config.xcconfig ]]; then
  cp Config.xcconfig.example Config.xcconfig
  echo "Created Config.xcconfig from example (add Clerk key to Config.local.xcconfig for staff sign-in)"
fi

echo "→ xcodegen generate"
xcodegen generate

if [[ "${RESET_SPM:-}" == "1" ]]; then
  echo "→ Clearing Swift package caches"
  rm -rf ~/Library/Developer/Xcode/DerivedData/RendezvousIL-*
  rm -rf RendezvousIL.xcodeproj/project.xcworkspace/xcshareddata/swiftpm
fi

echo "→ Resolving Swift packages"
xcodebuild -resolvePackageDependencies -project RendezvousIL.xcodeproj -scheme RendezvousIL

echo "Done. Open RendezvousIL.xcodeproj and build (⌘R)."
