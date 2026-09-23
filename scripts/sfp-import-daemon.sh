#!/usr/bin/env bash
# Durable SFP import daemon — meant to run under launchd, NOT under Cursor.
# Restarts dead/hung shards until the library pack hits EXPECTED songs.
set -u
cd /Users/braddford/Code/Rendezvous-IL || exit 1

WORKERS="${WORKERS:-3}"
LOG_DIR="${LOG_DIR:-/tmp/sfp-import-fast}"
EXPECTED="${EXPECTED:-895}"  # 896 ppt files minus junk "0958 .ppt"
PACK_ID="3eac16b6-fc68-43db-9d82-5cd7ccd2d5ce"
HANG_SECS="${HANG_SECS:-180}"
PLIST="$HOME/Library/LaunchAgents/com.braddcorp.sfp-import.plist"
mkdir -p "$LOG_DIR"

export PATH="/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:$PATH"

pack_count() {
  npx tsx --env-file=.env.local <<'TS' 2>/dev/null | tail -1
import { createClient } from "@libsql/client"
import { readFileSync } from "fs"
const env: Record<string, string> = { ...process.env } as Record<string, string>
for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  if (!line || line.startsWith("#") || !line.includes("=")) continue
  const i = line.indexOf("=")
  const k = line.slice(0, i).trim()
  let v = line.slice(i + 1).trim()
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))
    v = v.slice(1, -1)
  env[k] = v
}
const db = createClient({ url: env.TURSO_DATABASE_URL!, authToken: env.TURSO_AUTH_TOKEN! })
const r = await db.execute({
  sql: "SELECT COUNT(*) AS n FROM song_pack_items WHERE pack_id = ?",
  args: ["3eac16b6-fc68-43db-9d82-5cd7ccd2d5ce"],
})
console.log(String(r.rows[0].n))
TS
}

log() { echo "$(date '+%Y-%m-%d %H:%M:%S') $*" | tee -a "$LOG_DIR/daemon.log"; }

shard_running() {
  local i="$1"
  pgrep -f "import-sfp-songbook.ts --apply --resume --fast --shard=${i}/${WORKERS}" >/dev/null 2>&1
}

kill_shard() {
  local i="$1"
  pkill -9 -f "import-sfp-songbook.ts --apply --resume --fast --shard=${i}/${WORKERS}" 2>/dev/null || true
  # LibreOffice profiles for that shard often hang holding the lock
  pkill -9 -f "lo-sfp-.*-s${i}" 2>/dev/null || true
}

start_shard() {
  local i="$1"
  local slog="$LOG_DIR/shard-$i.log"
  touch "$slog"
  # marker for hang detection
  echo "=== daemon start shard $i $(date) ===" >>"$slog"
  nohup npx tsx --env-file=.env.local scripts/import-sfp-songbook.ts \
    --apply --resume --fast --shard="${i}/${WORKERS}" \
    >>"$slog" 2>&1 &
  log "started shard $i pid=$!"
}

shard_hung() {
  local i="$1"
  local slog="$LOG_DIR/shard-$i.log"
  # Only treat as hung if the worker is still alive but stuck mid-IMPORT
  shard_running "$i" || return 1
  [[ -f "$slog" ]] || return 1
  local last
  last=$(tail -1 "$slog" 2>/dev/null || true)
  if [[ "$last" != IMPORT* ]]; then
    return 1
  fi
  local now mtime age
  now=$(date +%s)
  mtime=$(stat -f %m "$slog" 2>/dev/null || echo 0)
  age=$((now - mtime))
  [[ "$age" -ge "$HANG_SECS" ]]
}

# Kill any Cursor-spawned leftovers once; then we own the workers
pkill -9 -f 'run-sfp-import-fast|run-sfp-import-chunks' 2>/dev/null || true

log "daemon up workers=$WORKERS expected=$EXPECTED"

while true; do
  count="$(pack_count)"
  count="${count:-0}"
  if [[ "$count" =~ ^[0-9]+$ ]] && [[ "$count" -ge "$EXPECTED" ]]; then
    log "COMPLETE pack=$count — unloading launch agent"
    for ((i = 0; i < WORKERS; i++)); do kill_shard "$i"; done
    pkill -9 -f 'soffice.bin' 2>/dev/null || true
    if [[ -f "$PLIST" ]]; then
      launchctl bootout "gui/$(id -u)/com.braddcorp.sfp-import" 2>/dev/null || \
        launchctl unload "$PLIST" 2>/dev/null || true
    fi
    exit 0
  fi

  # If every shard exited with nothing to do AND we're at/above EXPECTED, complete.
  # Do not treat idle-as-done when alternates may still be pending (below EXPECTED).
  idle_shards=0
  for ((i = 0; i < WORKERS; i++)); do
    if ! shard_running "$i"; then
      if tail -5 "$LOG_DIR/shard-$i.log" 2>/dev/null | grep -q 'done ok=0'; then
        idle_shards=$((idle_shards + 1))
      fi
    fi
  done
  if [[ "$idle_shards" -eq "$WORKERS" && "$count" -ge "$EXPECTED" ]]; then
    log "all shards idle and pack complete ($count) — unloading"
    if [[ -f "$PLIST" ]]; then
      launchctl bootout "gui/$(id -u)/com.braddcorp.sfp-import" 2>/dev/null || \
        launchctl unload "$PLIST" 2>/dev/null || true
    fi
    exit 0
  fi

  for ((i = 0; i < WORKERS; i++)); do
    if shard_hung "$i"; then
      log "shard $i hung on LibreOffice — kill + restart"
      kill_shard "$i"
      # also clear global stuck soffice if any
      pkill -9 -f 'soffice.bin' 2>/dev/null || true
      sleep 2
      start_shard "$i"
    elif ! shard_running "$i"; then
      log "shard $i dead — restart (pack=$count)"
      start_shard "$i"
    fi
  done

  log "heartbeat pack=$count/$EXPECTED"
  sleep 45
done
