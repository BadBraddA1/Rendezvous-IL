#!/usr/bin/env bash
# Health check for Rendezvous IL kiosk: display-state API (+ optional page URL).
# Restarts rendezvous-kiosk.service after consecutive failures (or one with --strict).
set -euo pipefail

ENV_FILE="${XDG_CONFIG_HOME:-$HOME/.config}/rendezvous-kiosk/env"
SERVICE_NAME="rendezvous-kiosk.service"
PRODUCTION_API="https://rendezvousil.com/api/live-updates/display-state"
PRODUCTION_URL="https://rendezvousil.com/live-updates?sync=1&kiosk=1"
STATE_DIR="${XDG_STATE_HOME:-$HOME/.local/state}/rendezvous-kiosk"
STATE_FILE="$STATE_DIR/watchdog-failures"
CURL_TIMEOUT="${WATCHDOG_CURL_TIMEOUT:-15}"

STRICT=0
SKIP_PAGE=0

usage() {
  echo "Usage: $(basename "$0") [--strict] [--no-page]" >&2
  echo "  --strict   restart after a single failed check (default: two consecutive)" >&2
  echo "  --no-page  skip optional kiosk page URL check" >&2
  exit 2
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --strict) STRICT=1; shift ;;
    --no-page) SKIP_PAGE=1; shift ;;
    -h|--help) usage ;;
    *) echo "Unknown option: $1" >&2; usage ;;
  esac
done

if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$ENV_FILE"
fi

[[ "${WATCHDOG_SKIP_PAGE:-0}" == "1" ]] && SKIP_PAGE=1

log() {
  echo "$(date '+%Y-%m-%d %H:%M:%S') watchdog: $*" >&2
}

display_state_url() {
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

kiosk_page_url() {
  if [[ -n "${KIOSK_URL:-}" ]]; then
    echo "$KIOSK_URL"
    return
  fi
  if [[ -n "${LOCAL_URL:-}" ]]; then
    echo "$LOCAL_URL"
    return
  fi
  echo "$PRODUCTION_URL"
}

check_display_state() {
  local url="$1"
  local body
  if ! body="$(curl -fsS --max-time "$CURL_TIMEOUT" "$url" 2>/dev/null)"; then
    log "display-state check failed: could not reach $url"
    return 1
  fi
  if ! echo "$body" | grep -q '"currentView"' \
    || ! echo "$body" | grep -q '"availableViews"' \
    || ! echo "$body" | grep -q '"rotateIntervalMs"'; then
    log "display-state check failed: unexpected response from $url"
    return 1
  fi
  return 0
}

check_kiosk_page() {
  local url="$1"
  # HEAD first; some dev servers omit HEAD — fall back to GET.
  if curl -fsS --max-time "$CURL_TIMEOUT" -o /dev/null -I "$url" 2>/dev/null; then
    return 0
  fi
  if curl -fsS --max-time "$CURL_TIMEOUT" -o /dev/null "$url" 2>/dev/null; then
    return 0
  fi
  log "kiosk page check failed: could not reach $url"
  return 1
}

read_failures() {
  if [[ -f "$STATE_FILE" ]]; then
    cat "$STATE_FILE" 2>/dev/null || echo 0
  else
    echo 0
  fi
}

write_failures() {
  mkdir -p "$STATE_DIR"
  echo "$1" > "$STATE_FILE"
}

run_checks() {
  local api_url page_url
  api_url="$(display_state_url)"
  if ! check_display_state "$api_url"; then
    return 1
  fi

  if [[ "$SKIP_PAGE" -eq 0 ]]; then
    page_url="$(kiosk_page_url)"
    if ! check_kiosk_page "$page_url"; then
      return 1
    fi
  fi

  return 0
}

if run_checks; then
  write_failures 0
  log "checks passed (display-state${SKIP_PAGE:+; page skipped})"
  exit 0
fi

failures="$(read_failures)"
failures=$((failures + 1))
write_failures "$failures"

threshold=2
[[ "$STRICT" -eq 1 ]] && threshold=1

if [[ "$failures" -ge "$threshold" ]]; then
  log "check failed ($failures consecutive); restarting $SERVICE_NAME"
  write_failures 0
  if systemctl --user restart "$SERVICE_NAME"; then
    log "restarted $SERVICE_NAME"
  else
    log "failed to restart $SERVICE_NAME"
  fi
  exit 1
fi

log "check failed ($failures/$threshold consecutive); waiting before restart"
exit 0
