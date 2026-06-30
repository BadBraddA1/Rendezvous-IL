#!/usr/bin/env bash
# Post-install checks for Rendezvous IL Pi kiosk provisioning.
set -euo pipefail

ENV_FILE="${XDG_CONFIG_HOME:-$HOME/.config}/rendezvous-kiosk/env"
SERVICE_NAME="rendezvous-kiosk.service"
WATCHDOG_TIMER="rendezvous-kiosk-watchdog.timer"
PRODUCTION_API="https://rendezvousil.com/api/live-updates/display-state"
TZ_EXPECTED="${TZ_EXPECTED:-America/Chicago}"

PASS=0
FAIL=0
WARN=0

ok() {
  echo "  OK   $*"
  PASS=$((PASS + 1))
}

bad() {
  echo "  FAIL $*"
  FAIL=$((FAIL + 1))
}

warn() {
  echo "  WARN $*"
  WARN=$((WARN + 1))
}

section() {
  echo ""
  echo "==> $*"
}

display_state_url() {
  if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
    source "$ENV_FILE"
  fi

  if [[ -n "${KIOSK_URL:-}" ]]; then
    local base="${KIOSK_URL%%/live-updates*}"
    echo "${base}/api/live-updates/display-state"
    return
  fi

  if [[ -n "${LOCAL_URL:-}" ]]; then
    local base="${LOCAL_URL%%/live-updates*}"
    echo "${base}/api/live-updates/display-state"
    return
  fi

  echo "$PRODUCTION_API"
}

section "Timezone and NTP (timedatectl)"
if command -v timedatectl >/dev/null 2>&1; then
  tz="$(timedatectl show -p Timezone --value 2>/dev/null || true)"
  synced="$(timedatectl show -p NTPSynchronized --value 2>/dev/null || true)"
  if [[ "$tz" == "$TZ_EXPECTED" ]]; then
    ok "Timezone is $tz"
  else
    bad "Timezone is ${tz:-unknown} (expected $TZ_EXPECTED)"
  fi
  if [[ "$synced" == "yes" ]]; then
    ok "NTP synchronized"
  else
    warn "NTP not synchronized yet (NTPSynchronized=$synced)"
  fi
  timedatectl status | sed 's/^/       /'
else
  bad "timedatectl not found"
fi

section "Display-state API (curl)"
api_url="$(display_state_url)"
if command -v curl >/dev/null 2>&1; then
  if body="$(curl -fsS --max-time 15 "$api_url" 2>/dev/null)"; then
    if echo "$body" | grep -q '"currentView"' \
      && echo "$body" | grep -q '"availableViews"' \
      && echo "$body" | grep -q '"rotateIntervalMs"'; then
      ok "GET $api_url returns display state JSON"
    else
      warn "GET $api_url succeeded but response may be unexpected (need currentView, availableViews, rotateIntervalMs)"
    fi
  else
    bad "Could not reach $api_url"
  fi
else
  bad "curl not installed"
fi

section "Chromium"
chromium_found=""
for candidate in chromium chromium-browser google-chrome stable; do
  if command -v "$candidate" >/dev/null 2>&1; then
    chromium_found="$candidate"
    break
  fi
done
if [[ -n "$chromium_found" ]]; then
  ok "Chromium binary: $chromium_found ($(command -v "$chromium_found"))"
else
  bad "Chromium not found (run install-kiosk.sh)"
fi

section "systemd user unit"
if systemctl --user is-enabled "$SERVICE_NAME" >/dev/null 2>&1; then
  ok "$SERVICE_NAME is enabled"
else
  bad "$SERVICE_NAME is not enabled (systemctl --user enable $SERVICE_NAME)"
fi
if systemctl --user is-active "$SERVICE_NAME" >/dev/null 2>&1; then
  ok "$SERVICE_NAME is active"
else
  warn "$SERVICE_NAME is not active (start with: systemctl --user start $SERVICE_NAME)"
fi

section "Watchdog timer (Pi-2)"
if systemctl --user is-enabled "$WATCHDOG_TIMER" >/dev/null 2>&1; then
  ok "$WATCHDOG_TIMER is enabled"
else
  bad "$WATCHDOG_TIMER is not enabled (systemctl --user enable --now $WATCHDOG_TIMER)"
fi
if systemctl --user is-active "$WATCHDOG_TIMER" >/dev/null 2>&1; then
  ok "$WATCHDOG_TIMER is active"
else
  warn "$WATCHDOG_TIMER is not active (re-run install-kiosk.sh or: systemctl --user enable --now $WATCHDOG_TIMER)"
fi

section "User linger (boot without login)"
linger="$(loginctl show-user "$USER" -p Linger --value 2>/dev/null || true)"
if [[ "$linger" == "yes" ]]; then
  ok "Linger enabled for $USER"
else
  bad "Linger not enabled (loginctl enable-linger $USER)"
fi

section "Environment file"
if [[ -f "$ENV_FILE" ]]; then
  ok "Env file present: $ENV_FILE"
else
  warn "Env file missing: $ENV_FILE (re-run install-kiosk.sh or copy env.example)"
fi

echo ""
echo "Summary: $PASS passed, $FAIL failed, $WARN warnings"
if [[ "$FAIL" -gt 0 ]]; then
  exit 1
fi
exit 0
