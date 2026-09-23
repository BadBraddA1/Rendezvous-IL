#!/usr/bin/env bash
# Create/update a RunPod serverless endpoint for SFP verse OCR.
# Requires: RUNPOD_API_KEY, docker logged in to a registry OR use RunPod hub build.
#
# Minimal path for now: register the handler files; you build/push the image once:
#   docker build -t <registry>/sfp-verse-ocr:latest scripts/runpod-sfp-verse-ocr
#   docker push <registry>/sfp-verse-ocr:latest
#   ENDPOINT_IMAGE=<registry>/sfp-verse-ocr:latest ./scripts/runpod-sfp-verse-ocr/deploy.sh
#
set -euo pipefail
source "$HOME/.config/runpod/agent.env"
IMAGE="${ENDPOINT_IMAGE:-}"
NAME="${ENDPOINT_NAME:-sfp-verse-ocr}"

if [[ -z "$IMAGE" ]]; then
  echo "Set ENDPOINT_IMAGE=registry/repo:tag after building the Docker image."
  echo "Handler + Dockerfile are ready in scripts/runpod-sfp-verse-ocr/"
  echo "Meanwhile phase-1 fast import is filling the song book via launchd."
  exit 0
fi

# GraphQL: create serverless template + endpoint (simplified — print curl for ops)
cat <<EOF
# Create endpoint in RunPod console or via API with image: $IMAGE
# Then fan out jobs:
#   npx tsx --env-file=.env.local scripts/export-sfp-ocr-jobs.ts --out=/tmp/sfp-ocr-jobs.json
#   # submit each job to the endpoint, collect results → /tmp/sfp-verse-ocr.json
#   npx tsx --env-file=.env.local scripts/apply-sfp-verse-ocr.ts --from=/tmp/sfp-verse-ocr.json --apply
EOF
