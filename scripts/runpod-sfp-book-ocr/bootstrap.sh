#!/usr/bin/env bash
# Cold-start bootstrap for RunPod serverless (no custom image registry).
# Downloads worker from CDN, installs deps once per worker disk, starts handler.
set -euo pipefail
mkdir -p /app
cd /app

WORKER_URL="${WORKER_URL:-https://cdn.rendezvousil.com/song-packs/sfp-book-scan/ocr-worker.tgz}"

if [[ ! -f /app/handler.py ]]; then
  echo "[bootstrap] fetching worker…"
  curl -fsSL "$WORKER_URL" | tar xz
fi

MARKER=/app/.deps-ok
if [[ ! -f "$MARKER" ]]; then
  echo "[bootstrap] installing Python deps (first start; may take several minutes)…"
  python -m pip install -q --upgrade pip
  # Paddle GPU wheels: cu118 works on RunPod CUDA 12.x images
  python -m pip install -q \
    "paddlepaddle-gpu==2.6.2" \
    -i https://www.paddlepaddle.org.cn/packages/stable/cu118/
  python -m pip install -q -r requirements-serverless.txt \
    --extra-index-url https://www.paddlepaddle.org.cn/packages/stable/cu118/
  touch "$MARKER"
  echo "[bootstrap] deps ready"
fi

exec python -u handler.py
