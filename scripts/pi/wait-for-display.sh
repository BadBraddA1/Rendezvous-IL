#!/usr/bin/env bash
# Wait for a graphical session before Chromium starts (Pi OS Bookworm Wayland + XWayland).
set -euo pipefail

export DISPLAY="${DISPLAY:-:0}"
export XAUTHORITY="${XAUTHORITY:-$HOME/.Xauthority}"

MAX_WAIT="${KIOSK_DISPLAY_WAIT_SEC:-120}"

runtime_dir() {
  echo "${XDG_RUNTIME_DIR:-/run/user/$(id -u)}"
}

have_wayland() {
  local rt
  rt="$(runtime_dir)"
  if [[ -n "${WAYLAND_DISPLAY:-}" ]] && [[ -S "$rt/$WAYLAND_DISPLAY" ]]; then
    return 0
  fi
  # labwc on Bookworm: socket may exist before WAYLAND_DISPLAY is imported into systemd.
  local sock
  for sock in "$rt"/wayland-*; do
    [[ -e "$sock" ]] || continue
    [[ -S "$sock" ]] && return 0
  done
  return 1
}

have_x11() {
  local display_num="${DISPLAY:-:0}"
  display_num="${display_num#:}"
  if [[ -S "/tmp/.X11-unix/X${display_num}" ]]; then
    return 0
  fi
  command -v xset >/dev/null 2>&1 && xset q >/dev/null 2>&1
}

for _ in $(seq 1 "$MAX_WAIT"); do
  if have_wayland || have_x11; then
    exit 0
  fi
  sleep 1
done

echo "Timed out after ${MAX_WAIT}s waiting for DISPLAY/WAYLAND_DISPLAY." >&2
exit 1
