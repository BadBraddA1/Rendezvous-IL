#!/usr/bin/env bash
# Set system timezone to America/Chicago (Central Time for Live Updates).
# Idempotent: no-op if already configured.
set -euo pipefail

TZ_NAME="${TZ_NAME:-America/Chicago}"

if [[ "${EUID:-$(id -u)}" -ne 0 ]]; then
  SUDO=(sudo)
else
  SUDO=()
fi

current="$("${SUDO[@]}" timedatectl show -p Timezone --value 2>/dev/null || true)"
if [[ "$current" == "$TZ_NAME" ]]; then
  echo "Timezone already $TZ_NAME"
  exit 0
fi

echo "Setting timezone to $TZ_NAME (was: ${current:-unknown})"
"${SUDO[@]}" timedatectl set-timezone "$TZ_NAME"
