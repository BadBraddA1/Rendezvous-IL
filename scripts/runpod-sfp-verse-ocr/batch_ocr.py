#!/usr/bin/env python3
"""Batch OCR SFP song PDFs on a RunPod (or any Linux box with pymupdf+tesseract).

Usage:
  python batch_ocr.py /workspace/sfp-ocr-jobs.json /workspace/sfp-verse-ocr.json
"""
from __future__ import annotations

import io
import json
import re
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

import requests

try:
    import fitz
except ImportError:
    raise SystemExit("pip install pymupdf")

try:
    import pytesseract
    from PIL import Image
except ImportError:
    pytesseract = None
    Image = None


def estimate(n: int) -> int:
    return max(1, min(12, max(1, round(n / 2))))


def verse_count_from_pdf(pdf_bytes: bytes) -> tuple[int, str]:
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    pages = doc.page_count
    texts: list[str] = []
    for i in range(min(pages, 10)):
        if i == 0 and pages > 2:
            continue  # skip title opener
        page = doc.load_page(i)
        t = page.get_text("text") or ""
        if len(t.strip()) < 30 and pytesseract and Image:
            pix = page.get_pixmap(matrix=fitz.Matrix(1.5, 1.5))
            img = Image.open(io.BytesIO(pix.tobytes("png")))
            t = pytesseract.image_to_string(img) or ""
        texts.append(t)
    blob = "\n".join(texts)
    nums: set[int] = set()
    for m in re.finditer(r"(?i)\b(?:verse\s*)?([1-9]|1[0-2])\s*[-.)]", blob):
        nums.add(int(m.group(1)))
    for m in re.finditer(r"\b([1-9]|1[0-2])\s*-\s*[12Cc]\b", blob):
        nums.add(int(m.group(1)))
    # Slide labels like "1-1 Title" / "3 We Praise"
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
        r = requests.get(url, timeout=120)
        r.raise_for_status()
        vc, method = verse_count_from_pdf(r.content)
        return {"page": page, "title": title, "verse_count": vc, "method": method}
    except Exception as e:
        return {
            "page": page,
            "title": title,
            "verse_count": job.get("verse_count_estimate") or 1,
            "method": f"error:{e}",
        }


def main() -> int:
    inp, outp = sys.argv[1], sys.argv[2]
    jobs = json.load(open(inp))
    # Only rows with a page number
    jobs = [j for j in jobs if j.get("page") is not None]
    print(f"jobs={len(jobs)}", flush=True)
    results: list[dict] = []
    workers = int(__import__("os").environ.get("OCR_WORKERS", "8"))
    t0 = time.time()
    done = 0
    with ThreadPoolExecutor(max_workers=workers) as ex:
        futs = {ex.submit(process_one, j): j for j in jobs}
        for fut in as_completed(futs):
            results.append(fut.result())
            done += 1
            if done % 25 == 0 or done == len(jobs):
                elapsed = time.time() - t0
                rate = done / max(elapsed, 0.1)
                print(f"progress {done}/{len(jobs)} {rate:.1f}/s", flush=True)
    results.sort(key=lambda x: (x.get("page") is None, x.get("page") or 0, x.get("title") or ""))
    # Map form for apply script + full list
    by_page: dict[str, int] = {}
    for r in results:
        if r.get("page") is not None and r.get("verse_count"):
            # Prefer higher confidence later; last write wins per page — use title-keyed map instead
            pass
    payload = {
        "results": results,
        "by_title": {r["title"]: r["verse_count"] for r in results if r.get("title")},
        "by_page": {
            str(r["page"]): r["verse_count"]
            for r in results
            if r.get("page") is not None and r.get("verse_count")
        },
    }
    # Also write flat list apply script accepts
    flat = [{"page": r["page"], "verse_count": r["verse_count"], "title": r.get("title")} for r in results]
    json.dump(flat, open(outp, "w"), indent=2)
    json.dump(payload, open(outp.replace(".json", "-full.json"), "w"), indent=2)
    ocr_n = sum(1 for r in results if r.get("method") == "ocr")
    print(f"done results={len(results)} ocr={ocr_n} estimate={len(results)-ocr_n} → {outp}", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
