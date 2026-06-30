#!/usr/bin/env bash
# Launch Chromium in kiosk mode for Rendezvous IL Live Updates.
# Configure URL via ~/.config/rendezvous-kiosk/env (LOCAL_URL or KIOSK_URL).
set -euo pipefail

ENV_FILE="${XDG_CONFIG_HOME:-$HOME/.config}/rendezvous-kiosk/env"
if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$ENV_FILE"
fi

PRODUCTION_URL="https://rendezvousil.com/live-updates?sync=1&kiosk=1"

append_view_param() {
  local url="$1"
  local view="${VIEW:-${KIOSK_VIEW:-}}"
  if [[ -z "$view" ]]; then
    echo "$url"
    return
  fi
  if [[ "$url" == *"view="* ]]; then
    echo "$url"
    return
  fi
  local sep="&"
  [[ "$url" != *"?"* ]] && sep="?"
  echo "${url}${sep}view=${view}"
}

append_device_param() {
  local url="$1"
  local device="${DEVICE_ID:-}"
  if [[ -z "$device" ]]; then
    echo "$url"
    return
  fi
  if [[ "$url" == *"device="* ]]; then
    echo "$url"
    return
  fi
  local sep="&"
  [[ "$url" != *"?"* ]] && sep="?"
  echo "${url}${sep}device=${device}"
}

KIOSK_URL="$(append_device_param "$(append_view_param "${KIOSK_URL:-${LOCAL_URL:-$PRODUCTION_URL}}")")"

export DISPLAY="${DISPLAY:-:0}"
export XAUTHORITY="${XAUTHORITY:-$HOME/.Xauthority}"

# Disable screen blanking / DPMS on X11 (idempotent each launch; Wayland uses raspi-config).
if command -v xset >/dev/null 2>&1; then
  xset s off || true
  xset -dpms || true
  xset s noblank || true
fi

# Prefer Pi OS package names; fall back for other distros.
CHROMIUM=""
for candidate in chromium chromium-browser google-chrome stable; do
  if command -v "$candidate" >/dev/null 2>&1; then
    CHROMIUM="$candidate"
    break
  fi
done

if [[ -z "$CHROMIUM" ]]; then
  echo "Chromium not found. Run install-kiosk.sh first." >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ExecStartPre runs wait-for-display.sh under systemd; manual runs need a longer wait here.
if [[ -z "${INVOCATION_ID:-}" ]]; then
  KIOSK_DISPLAY_WAIT_SEC="${KIOSK_DISPLAY_WAIT_SEC:-60}" "$SCRIPT_DIR/wait-for-display.sh"
fi

USER_DATA_DIR="${CHROMIUM_USER_DATA_DIR:-$HOME/.config/rendezvous-kiosk-chromium}"

exec "$CHROMIUM" \
  --kiosk \
  --noerrdialogs \
  --no-first-run \
  --disable-infobars \
  --disable-session-crashed-bubble \
  --disable-restore-session-state \
  --start-fullscreen \
  --check-for-update-interval=31536000 \
  --autoplay-policy=no-user-gesture-required \
  --user-data-dir="$USER_DATA_DIR" \
  "$KIOSK_URL"
