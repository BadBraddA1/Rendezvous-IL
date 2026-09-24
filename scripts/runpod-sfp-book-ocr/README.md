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


## Live HTTP worker (community pod)

When serverless is cold/stuck, a community GPU pod runs RapidOCR over HTTP:

```bash
# Health
curl https://$POD-8000.proxy.runpod.net/health

# OCR
npx tsx scripts/call-sfp-ocr-http.ts --file-url=https://cdn…/song.pdf

# URL saved in ~/.config/runpod/agent.env as SFP_OCR_HTTP_URL
# Pod id in /tmp/sfp-ocr-http-pod.id — terminate when done to stop $0.34/hr
```

## Serverless API (hit whenever you need OCR)

Live endpoint (scale-to-zero):

| | |
|---|---|
| Endpoint id | `h5ypc3kbpa5e7n` |
| Async | `POST https://api.runpod.ai/v2/h5ypc3kbpa5e7n/run` |
| Sync | `POST https://api.runpod.ai/v2/h5ypc3kbpa5e7n/runsync` |
| Auth | `Authorization: Bearer $RUNPOD_API_KEY` |

Saved in `~/.config/runpod/agent.env` as `RUNPOD_SFP_OCR_ENDPOINT_ID`.

```bash
# One PDF (async + poll)
npx tsx --env-file=.env.local scripts/call-sfp-ocr-endpoint.ts \
  --file-url=https://cdn.rendezvousil.com/song-packs/sfp-book-scan/smoke/0002-we-praise.pdf \
  --title="2 · We Praise Thee O God" --printed-page=2

# Sync (waits for result; cold start can take several minutes first time)
npx tsx --env-file=.env.local scripts/call-sfp-ocr-endpoint.ts \
  --file-url=… --sync
```

Body:

```json
{ "input": { "file_url": "https://…/song.pdf", "title": "…", "printed_page": 2, "dpi": 200 } }
```

Worker boots from public pytorch + CDN tarball (`ocr-worker.tgz`) — no custom registry.
First worker start installs PaddleOCR (slow); later jobs on a warm worker are fast.

Redeploy worker code: re-tar + upload `ocr-worker.tgz` to R2, then new workers pick it up.
Template id: `4bs7xksqlw`.

## Docker (optional custom image)

```bash
# Prefer when RunPod registry login works:
./scripts/runpod-sfp-book-ocr/deploy-serverless.sh

# Or community pod with volume mount:
docker build -t sfp-book-ocr:latest scripts/runpod-sfp-book-ocr
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
