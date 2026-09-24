#!/usr/bin/env bash
set -euxo pipefail
mkdir -p /workspace/app /workspace/logs
cd /workspace/app
curl -fsSL https://cdn.rendezvousil.com/song-packs/sfp-book-scan/ocr-http-worker.tgz | tar xz
python -m pip install -q --upgrade pip
python -m pip install -q -r requirements-http.txt
export OCR_ENGINE=rapid
export PORT=8000
# Ready file for health probing during install
echo starting > /workspace/logs/ocr.status
exec python -u http_server.py
