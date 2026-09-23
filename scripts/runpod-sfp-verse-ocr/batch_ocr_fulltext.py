#!/usr/bin/env python3
"""
Full-text SFP PDF OCR on RunPod.

For each song:
  - verse_count (for title slides)
  - pages[].text (full OCR / embedded text per page)

Outputs:
  /workspace/sfp-verse-ocr.json     — apply script (page/title/verse_count)
  /workspace/sfp-fulltext.jsonl     — one JSON object per song with all page text
"""
from __future__ import annotations

import io
import json
import re
import sys
import time
from pathlib import Path

import requests

try:
    import pymupdf as fitz
except ImportError:
    import fitz  # type: ignore

try:
    import pytesseract
    from PIL import Image
except ImportError:
    pytesseract = None
    Image = None

CHUNK = int(__import__("os").environ.get("OCR_CHUNK", "20"))
DPI_SCALE = float(__import__("os").environ.get("OCR_SCALE", "2.0"))


def estimate(n: int) -> int:
    return max(1, min(12, max(1, round(n / 2))))


def page_text(page) -> str:
    t = page.get_text("text") or ""
    if len(t.strip()) >= 40:
        return t
    if not (pytesseract and Image):
        return t
    pix = page.get_pixmap(matrix=fitz.Matrix(DPI_SCALE, DPI_SCALE))
    img = Image.open(io.BytesIO(pix.tobytes("png")))
    return pytesseract.image_to_string(img) or t


def verse_count_from_texts(texts: list[str], page_count: int) -> tuple[int, str]:
    # Skip opener (index 0) when present
    body = texts[1:] if len(texts) > 2 else texts
    blob = "\n".join(body)
    nums: set[int] = set()
    for m in re.finditer(r"(?i)\b(?:verse\s*)?([1-9]|1[0-2])\s*[-.)]", blob):
        nums.add(int(m.group(1)))
    for m in re.finditer(r"\b([1-9]|1[0-2])\s*-\s*[12Cc]\b", blob):
        nums.add(int(m.group(1)))
    for m in re.finditer(r"(?m)^\s*([1-9]|1[0-2])(?:\s*-\s*\d+)?\s+\S", blob):
        nums.add(int(m.group(1)))
    if nums:
        return max(nums), "ocr"
    return estimate(max(1, page_count - 1)), "estimate"


def process_one(job: dict) -> dict:
    url = job["file_url"]
    r = requests.get(url, timeout=120)
    r.raise_for_status()
    doc = fitz.open(stream=r.content, filetype="pdf")
    pages_out = []
    texts = []
    for i in range(doc.page_count):
        text = page_text(doc.load_page(i))
        texts.append(text)
        pages_out.append({"index": i, "text": text})
    vc, method = verse_count_from_texts(texts, doc.page_count)
    doc.close()
    return {
        "item_id": job.get("item_id"),
        "page": job.get("page"),
        "title": job.get("title"),
        "verse_count": vc,
        "method": method,
        "page_count": len(pages_out),
        "pages": pages_out,
        "full_text": "\n\n----\n\n".join(texts),
    }


def main() -> int:
    jobs_path = Path(sys.argv[1])
    verse_out = Path(sys.argv[2])
    text_out = Path(sys.argv[3] if len(sys.argv) > 3 else "/workspace/sfp-fulltext.jsonl")

    jobs = [j for j in json.loads(jobs_path.read_text()) if j.get("page") is not None]
    done_titles: set[str] = set()
    if verse_out.exists():
        for row in json.loads(verse_out.read_text()):
            if row.get("title"):
                done_titles.add(row["title"])
    if text_out.exists():
        for line in text_out.read_text().splitlines():
            if not line.strip():
                continue
            try:
                done_titles.add(json.loads(line)["title"])
            except Exception:
                pass

    pending = [j for j in jobs if j.get("title") not in done_titles]
    print(f"jobs={len(jobs)} pending={len(pending)} chunk={CHUNK}", flush=True)

    verse_rows = []
    if verse_out.exists():
        verse_rows = json.loads(verse_out.read_text())
    by_title = {r["title"]: r for r in verse_rows if r.get("title")}

    t0 = time.time()
    for i in range(0, len(pending), CHUNK):
        batch = pending[i : i + CHUNK]
        with text_out.open("a") as tf:
            for job in batch:
                try:
                    full = process_one(job)
                except Exception as e:
                    full = {
                        "item_id": job.get("item_id"),
                        "page": job.get("page"),
                        "title": job.get("title"),
                        "verse_count": job.get("verse_count_estimate") or 1,
                        "method": f"error:{type(e).__name__}",
                        "page_count": 0,
                        "pages": [],
                        "full_text": "",
                        "error": str(e),
                    }
                tf.write(json.dumps(full, ensure_ascii=False) + "\n")
                tf.flush()
                by_title[full["title"]] = {
                    "page": full["page"],
                    "title": full["title"],
                    "verse_count": full["verse_count"],
                    "method": full["method"],
                }
        verse_out.write_text(
            json.dumps(sorted(by_title.values(), key=lambda x: (x.get("page") or 0, x.get("title") or "")), indent=2)
        )
        n = len(by_title)
        rate = n / max(time.time() - t0, 0.1)
        print(f"progress {n}/{len(jobs)} {rate:.2f}/s", flush=True)

    print(f"done verse={verse_out} text={text_out} n={len(by_title)}", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
