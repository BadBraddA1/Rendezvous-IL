#!/usr/bin/env bash
# Build + push SFP book OCR worker to RunPod registry, create serverless endpoint.
#
#   ./scripts/runpod-sfp-book-ocr/deploy-serverless.sh
#
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
source "$HOME/.config/runpod/agent.env"

IMAGE_NAME="${IMAGE_NAME:-sfp-book-ocr}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
# RunPod container registry (API key as password, user id as username)
USER_ID="$(curl -sS -X POST https://api.runpod.io/graphql \
  -H "Authorization: Bearer $RUNPOD_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query":"{ myself { id } }"}' | python3 -c 'import sys,json; print(json.load(sys.stdin)["data"]["myself"]["id"])')"

REGISTRY="${RUNPOD_REGISTRY:-registry.runpod.io}"
FULL_IMAGE="$REGISTRY/$USER_ID/$IMAGE_NAME:$IMAGE_TAG"

echo "User: $USER_ID"
echo "Image: $FULL_IMAGE"

echo "$RUNPOD_API_KEY" | docker login -u "$USER_ID" --password-stdin "$REGISTRY"

echo "Building linux/amd64 (RunPod)…"
docker buildx build \
  --platform linux/amd64 \
  -f scripts/runpod-sfp-book-ocr/Dockerfile.serverless \
  -t "$FULL_IMAGE" \
  --push \
  scripts/runpod-sfp-book-ocr

echo "Creating/updating serverless template + endpoint…"
python3 scripts/runpod-sfp-book-ocr/create_endpoint.py --image "$FULL_IMAGE"

echo "Done. Endpoint id written to /tmp/sfp-book-ocr-endpoint.json"
