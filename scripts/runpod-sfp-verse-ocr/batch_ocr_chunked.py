#!/usr/bin/env python3
"""Chunked resumable SFP verse OCR — survives kills by checkpointing every N jobs."""
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

CHUNK = int(__import__("os").environ.get("OCR_CHUNK", "40"))


def estimate(n: int) -> int:
    return max(1, min(12, max(1, round(n / 2))))


def verse_count_from_pdf(pdf_bytes: bytes) -> tuple[int, str]:
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    pages = doc.page_count
    texts: list[str] = []
    for i in range(min(pages, 8)):
        if i == 0 and pages > 2:
            continue
        page = doc.load_page(i)
        t = page.get_text("text") or ""
        if len(t.strip()) < 30 and pytesseract and Image:
            pix = page.get_pixmap(matrix=fitz.Matrix(1.5, 1.5))
            img = Image.open(io.BytesIO(pix.tobytes("png")))
            t = pytesseract.image_to_string(img) or ""
        texts.append(t)
    doc.close()
    blob = "\n".join(texts)
    nums: set[int] = set()
    for m in re.finditer(r"(?i)\b(?:verse\s*)?([1-9]|1[0-2])\s*[-.)]", blob):
        nums.add(int(m.group(1)))
    for m in re.finditer(r"\b([1-9]|1[0-2])\s*-\s*[12Cc]\b", blob):
        nums.add(int(m.group(1)))
    for m in re.finditer(r"(?m)^\s*([1-9]|1[0-2])(?:\s*-\s*\d+)?\s+\S", blob):
        nums.add(int(m.group(1)))
    if nums:
        return max(nums), "ocr"
    return estimate(max(1, pages - 1)), "estimate"


def process_one(job: dict) -> dict:
    url = job.get("file_url")
    page = job.get("page")
    title = job.get("title")
    try:
        r = requests.get(url, timeout=90)
        r.raise_for_status()
        vc, method = verse_count_from_pdf(r.content)
        return {"page": page, "title": title, "verse_count": vc, "method": method}
    except Exception as e:
        return {
            "page": page,
            "title": title,
            "verse_count": job.get("verse_count_estimate") or 1,
            "method": f"error:{type(e).__name__}",
        }


def main() -> int:
    jobs_path, out_path = Path(sys.argv[1]), Path(sys.argv[2])
    jobs = [j for j in json.loads(jobs_path.read_text()) if j.get("page") is not None]
    done: dict[str, dict] = {}
    if out_path.exists():
        for row in json.loads(out_path.read_text()):
            if row.get("title"):
                done[row["title"]] = row
        print(f"resume have={len(done)}", flush=True)

    pending = [j for j in jobs if j.get("title") not in done]
    print(f"jobs={len(jobs)} pending={len(pending)} chunk={CHUNK}", flush=True)
    t0 = time.time()
    for i in range(0, len(pending), CHUNK):
        batch = pending[i : i + CHUNK]
        for job in batch:
            row = process_one(job)
            done[row["title"]] = row
        # checkpoint
        flat = sorted(done.values(), key=lambda x: (x.get("page") or 0, x.get("title") or ""))
        out_path.write_text(json.dumps(flat, indent=2))
        n = len(done)
        rate = n / max(time.time() - t0, 0.1)
        print(f"progress {n}/{len(jobs)} {rate:.1f}/s checkpoint", flush=True)

    print(f"done results={len(done)} → {out_path}", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
