#!/usr/bin/env bash
# Rendezvous iOS rebuild loop — 30s ticks. Stop: kill $(cat ios/.rebuild-loop.pid)
set -euo pipefail
INTERVAL="${REBUILD_LOOP_INTERVAL:-30}"
PROMPT='Continue Rendezvous iOS ground-up rebuild. Read ios/REBUILD_PROGRESS.md and ios/REBUILD_PHASES.md. Complete the next unchecked phase only: implement, simulator build, update REBUILD_PROGRESS.md, commit with ios rebuild phase N message, push. If all phases done, archive upload TestFlight and echo AGENT_LOOP_STOP.'

while true; do
  sleep "$INTERVAL"
  printf 'AGENT_LOOP_TICK_ren_ios_rebuild {"prompt":"%s"}\n' "$PROMPT"
done
