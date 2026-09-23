#!/usr/bin/env bash
# Export song_pack_items for book-OCR page matching + optional RunPod notes.
#
#   npx tsx --env-file=.env.local scripts/export-sfp-book-ocr-library.ts \
#     --out=/tmp/sfp-library.json
#
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
OUT="${1:-/tmp/sfp-library.json}"
npx tsx --env-file=.env.local scripts/export-sfp-book-ocr-library.ts --out="$OUT"
echo "Library ready: $OUT"
echo ""
echo "On RunPod GPU pod (after docker build / or pip install -r requirements.txt):"
echo "  python -u batch_book_ocr.py \\"
echo "    --pdf=/workspace/sfp-book-scan.pdf \\"
echo "    --library=/workspace/sfp-library.json \\"
echo "    --out=/workspace/sfp-book-ocr.jsonl \\"
echo "    --limit=20"
echo ""
echo "Then persist:"
echo "  npx tsx --env-file=.env.local scripts/persist-sfp-book-ocr.ts \\"
echo "    --from=/tmp/sfp-book-ocr.jsonl --apply"
