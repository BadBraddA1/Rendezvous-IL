# SFP book / full-song OCR (v3) — RunPod PaddleOCR

Text-mode lyrics from **full-song PPTs** (1–3 slides/song) or a book scan PDF.
Slides mode stays on the multi-page digital PDFs already in the app.

## Local source (copied off PRO-G40)

```
~/Code/sfp-full-song-ppt/*.ppt   # 935 files, ~879 unique page #s
```

## Pipeline

```bash
# 1) Canonical PPT list + convert pilot PDFs
npx tsx scripts/ingest-sfp-full-ppt.ts \
  --from=$HOME/Code/sfp-full-song-ppt \
  --out=/tmp/sfp-full-ppt-index.json \
  --pdf-dir=/tmp/sfp-full-pdf \
  --limit=20 --convert

# 2) Library map (Turso → page #)
npx tsx --env-file=.env.local scripts/export-sfp-book-ocr-library.ts \
  --out=/tmp/sfp-library.json

# 3) OCR on RunPod GPU (or local CPU with --cpu for a tiny smoke test)
python -u scripts/runpod-sfp-book-ocr/batch_book_ocr.py \
  --index=/tmp/sfp-full-ppt-index.json \
  --library=/tmp/sfp-library.json \
  --out=/tmp/sfp-book-ocr.jsonl \
  --limit=20

# 4) Persist → R2 ocr_url + ocr_status
npx tsx --env-file=.env.local scripts/persist-sfp-book-ocr.ts \
  --from=/tmp/sfp-book-ocr.jsonl --apply --pilot
```

## Docker (RunPod)

```bash
docker build -t sfp-book-ocr:latest scripts/runpod-sfp-book-ocr
# Run on a 4090/A40 community pod with the PDF dir + library mounted.
```

## Output shape

```json
{
  "item_id": "…",
  "title": "2 · We Praise Thee O God",
  "printed_page": 2,
  "verses": [{ "index": 1, "text": "…" }],
  "pages": [{ "index": 0, "text": "…" }],
  "confidence": 0.91,
  "status": "auto",
  "method": "paddleocr_full_song_ppt"
}
```
