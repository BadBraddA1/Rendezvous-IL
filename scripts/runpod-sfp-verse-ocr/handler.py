"""
RunPod serverless handler: OCR SFP song PDFs → verse_count.

Input job:
  { "input": { "page": 4, "file_url": "https://cdn.../x.pdf", "title": "4 · To God Be the Glory" } }

Output:
  { "page": 4, "verse_count": 2, "method": "ocr|estimate" }

Deploy (from this folder, with RUNPOD_API_KEY set):
  See deploy.sh
"""
from __future__ import annotations

import io
import os
import re
import tempfile
from typing import Any

import runpod
import requests

try:
    import fitz  # PyMuPDF
except ImportError:  # pragma: no cover
    fitz = None

try:
    import pytesseract
    from PIL import Image
except ImportError:  # pragma: no cover
    pytesseract = None
    Image = None


def _estimate_from_pages(n: int) -> int:
    return max(1, min(12, max(1, round(n / 2))))


def _ocr_verse_count(pdf_bytes: bytes) -> tuple[int, str]:
    if fitz is None:
        return 0, "no-fitz"
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    pages = doc.page_count
    # Skip likely title opener (page 0); sample first few music pages
    texts: list[str] = []
    for i in range(min(pages, 8)):
        if i == 0 and pages > 2:
            continue
        page = doc.load_page(i)
        t = page.get_text("text") or ""
        if len(t.strip()) < 20 and pytesseract and Image:
            pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
            img = Image.open(io.BytesIO(pix.tobytes("png")))
            t = pytesseract.image_to_string(img) or ""
        texts.append(t)
    blob = "\n".join(texts)
    # Shape-note slides often label verses as "1-1", "2-1", or "1. " / "Verse 2"
    nums = set()
    for m in re.finditer(r"(?i)\b(?:verse\s*)?([1-9]|1[0-2])\s*[-.)]", blob):
        nums.add(int(m.group(1)))
    for m in re.finditer(r"\b([1-9]|1[0-2])\s*-\s*[12]\b", blob):
        nums.add(int(m.group(1)))
    if nums:
        return max(nums), "ocr"
    return _estimate_from_pages(max(1, pages - 1)), "estimate"


def handler(job: dict[str, Any]) -> dict[str, Any]:
    inp = job.get("input") or {}
    page = inp.get("page")
    url = inp.get("file_url")
    if not url:
        return {"error": "file_url required", "page": page}
    r = requests.get(url, timeout=120)
    r.raise_for_status()
    verse_count, method = _ocr_verse_count(r.content)
    return {
        "page": page,
        "title": inp.get("title"),
        "verse_count": verse_count,
        "method": method,
    }


runpod.serverless.start({"handler": handler})
