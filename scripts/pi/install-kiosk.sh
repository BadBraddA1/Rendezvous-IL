#!/usr/bin/env bash
# Provision a Raspberry Pi for Rendezvous IL Live Updates kiosk mode.
# Idempotent: safe to re-run after OS updates or script changes.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INSTALL_DIR="${INSTALL_DIR:-$HOME/.local/share/rendezvous-kiosk}"
KIOSK_CONFIG_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/rendezvous-kiosk"
AUTOSTART_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/autostart"
SYSTEMD_USER_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/systemd/user"
SERVICE_NAME="rendezvous-kiosk.service"
WATCHDOG_SERVICE="rendezvous-kiosk-watchdog.service"
WATCHDOG_TIMER="rendezvous-kiosk-watchdog.timer"
ENV_FILE="$KIOSK_CONFIG_DIR/env"

generate_device_id() {
  local hn
  hn="$(hostname -s)"
  if [[ "$hn" =~ ^rendezvous- ]]; then
    echo "$hn"
  else
    echo "rendezvous-${hn}"
  fi
}

ensure_device_id() {
  if [[ ! -f "$ENV_FILE" ]]; then
    return
  fi
  if grep -qE '^[[:space:]]*DEVICE_ID=' "$ENV_FILE" 2>/dev/null; then
    return
  fi
  local device_id
  device_id="$(generate_device_id)"
  {
    echo ""
    echo "# Fleet heartbeat id (Pi-2); used by chromium-kiosk.sh"
    echo "DEVICE_ID=$device_id"
  } >> "$ENV_FILE"
  echo "    Added DEVICE_ID=$device_id to $ENV_FILE"
}

if [[ "${EUID:-$(id -u)}" -eq 0 ]]; then
  echo "Run install-kiosk.sh as the kiosk desktop user, not root (sudo is used only for apt/timedatectl)." >&2
  exit 1
fi

SUDO=(sudo)

echo "==> Rendezvous IL kiosk install"
echo "    Source:  $SCRIPT_DIR"
echo "    Install: $INSTALL_DIR"

echo "==> Installing packages (Chromium, curl, xset, NTP tools)..."
"${SUDO[@]}" apt-get update -qq
"${SUDO[@]}" apt-get install -y --no-install-recommends \
  chromium \
  curl \
  x11-xserver-utils \
  systemd-timesyncd

echo "==> Setting timezone..."
bash "$SCRIPT_DIR/set-timezone.sh"

echo "==> Enabling NTP..."
"${SUDO[@]}" timedatectl set-ntp true
if systemctl is-enabled systemd-timesyncd.service >/dev/null 2>&1; then
  "${SUDO[@]}" systemctl enable --now systemd-timesyncd.service
fi

echo "==> Installing kiosk config..."
mkdir -p "$KIOSK_CONFIG_DIR"
if [[ ! -f "$ENV_FILE" ]]; then
  install -m 600 "$SCRIPT_DIR/env.example" "$ENV_FILE"
  device_id="$(generate_device_id)"
  {
    echo ""
    echo "# Fleet heartbeat id (Pi-2); used by chromium-kiosk.sh"
    echo "DEVICE_ID=$device_id"
  } >> "$ENV_FILE"
  echo "    Created $ENV_FILE from env.example (DEVICE_ID=$device_id)"
else
  echo "    Keeping existing $ENV_FILE"
  ensure_device_id
fi

echo "==> Installing kiosk scripts to $INSTALL_DIR..."
mkdir -p "$INSTALL_DIR"
for script in chromium-kiosk.sh wait-for-display.sh set-timezone.sh verify-kiosk.sh kiosk-watchdog.sh; do
  install -m 755 "$SCRIPT_DIR/$script" "$INSTALL_DIR/$script"
done

echo "==> Installing systemd user units..."
mkdir -p "$SYSTEMD_USER_DIR"
sed "s|INSTALL_DIR|$INSTALL_DIR|g" "$SCRIPT_DIR/rendezvous-kiosk.service" \
  > "$SYSTEMD_USER_DIR/$SERVICE_NAME"
sed "s|INSTALL_DIR|$INSTALL_DIR|g" "$SCRIPT_DIR/rendezvous-kiosk-watchdog.service" \
  > "$SYSTEMD_USER_DIR/$WATCHDOG_SERVICE"
install -m 644 "$SCRIPT_DIR/rendezvous-kiosk-watchdog.timer" \
  "$SYSTEMD_USER_DIR/$WATCHDOG_TIMER"

echo "==> Installing desktop autostart (Bookworm graphical session fallback)..."
mkdir -p "$AUTOSTART_DIR"
cat > "$AUTOSTART_DIR/rendezvous-kiosk.desktop" <<EOF
[Desktop Entry]
Type=Application
Name=Rendezvous IL Kiosk
Comment=Start live updates Chromium kiosk after desktop login
Exec=/bin/bash -lc 'systemctl --user import-environment DISPLAY WAYLAND_DISPLAY XAUTHORITY DBUS_SESSION_BUS_ADDRESS; systemctl --user start $SERVICE_NAME'
Terminal=false
X-GNOME-Autostart-enabled=true
Hidden=false
EOF

echo "==> Enabling user service at boot (linger)..."
loginctl enable-linger "$USER" 2>/dev/null || "${SUDO[@]}" loginctl enable-linger "$USER"

uid="$(id -u)"
if [[ -z "${XDG_RUNTIME_DIR:-}" ]] && [[ -d "/run/user/$uid" ]]; then
  export XDG_RUNTIME_DIR="/run/user/$uid"
fi
if [[ -z "${DBUS_SESSION_BUS_ADDRESS:-}" ]] && [[ -n "${XDG_RUNTIME_DIR:-}" ]] && [[ -S "${XDG_RUNTIME_DIR}/bus" ]]; then
  export DBUS_SESSION_BUS_ADDRESS="unix:path=${XDG_RUNTIME_DIR}/bus"
fi

if systemctl --user daemon-reload; then
  systemctl --user enable "$SERVICE_NAME"
  systemctl --user enable --now "$WATCHDOG_TIMER"
else
  echo "    Note: user systemd bus unavailable in this shell; unit files installed."
  echo "    After reboot (linger), run: systemctl --user enable $SERVICE_NAME"
  echo "    And: systemctl --user enable --now $WATCHDOG_TIMER"
fi

echo ""
echo "Kiosk provisioning complete."
echo ""
echo "  Production URL: https://rendezvousil.com/live-updates?sync=1&kiosk=1"
echo "  Dev override:   edit $ENV_FILE (LOCAL_URL or KIOSK_URL)"
echo ""
echo "Verify:     $INSTALL_DIR/verify-kiosk.sh"
echo "Start now:  systemctl --user start $SERVICE_NAME"
echo "Logs:       journalctl --user -u $SERVICE_NAME -f"
echo "Watchdog:   systemctl --user status $WATCHDOG_TIMER"
echo "Status:     timedatectl status"
echo ""
echo "Reboot to verify autostart, or start the service manually."
