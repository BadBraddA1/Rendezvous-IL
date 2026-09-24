#!/usr/bin/env bash
# Fast cold-start — log everything so RunPod worker logs show failures.
set -euxo pipefail
mkdir -p /app
cd /app

WORKER_URL="${WORKER_URL:-https://cdn.rendezvousil.com/song-packs/sfp-book-scan/ocr-worker-v2.tgz}"

echo "[bootstrap] cwd=$(pwd) python=$(command -v python || true) $(python --version 2>&1 || true)"
if [[ ! -f /app/handler.py ]]; then
  echo "[bootstrap] fetching $WORKER_URL"
  curl -fsSL "$WORKER_URL" | tar xz
  ls -la /app
fi

export OCR_ENGINE="${OCR_ENGINE:-rapid}"
python -m pip install -q --upgrade pip
python -m pip install -q -r requirements-serverless.txt
echo "[bootstrap] starting handler OCR_ENGINE=$OCR_ENGINE"
exec python -u handler.py
