"""
RunPod serverless handler: full-song / book-page OCR → verses + confidence.

Input:
  {
    "input": {
      "file_url": "https://cdn.../0002-....pdf",
      "item_id": "uuid",
      "title": "2 · We Praise Thee O God",
      "printed_page": 2,
      "dpi": 200
    }
  }

Engines: OCR_ENGINE=rapid (default, fast cold start) | paddle
"""
from __future__ import annotations

import io
import os
from typing import Any

import requests
import runpod

try:
    import pymupdf as fitz
except ImportError:
    import fitz  # type: ignore
from PIL import Image

from postprocess import (
    clean_lines,
    decide_status,
    overall_confidence,
    split_verses,
)

_OCR = None
DPI_DEFAULT = int(os.environ.get("OCR_DPI", "200"))
AUTO_MIN = float(os.environ.get("OCR_AUTO_MIN", "0.65"))
ENGINE = os.environ.get("OCR_ENGINE", "rapid").strip().lower()


def get_ocr():
    global _OCR
    if _OCR is not None:
        return _OCR
    if ENGINE == "paddle":
        from paddleocr import PaddleOCR

        use_gpu = os.environ.get("OCR_CPU", "").strip() not in ("1", "true", "yes")
        _OCR = ("paddle", PaddleOCR(use_angle_cls=True, lang="en", use_gpu=use_gpu, show_log=False))
    else:
        from rapidocr_onnxruntime import RapidOCR

        _OCR = ("rapid", RapidOCR())
    return _OCR


def ocr_image(ocr_pack, img: Image.Image) -> tuple[str, float]:
    import numpy as np

    kind, engine = ocr_pack
    arr = np.array(img.convert("RGB"))
    lines: list[str] = []
    confs: list[float] = []

    if kind == "paddle":
        result = engine.ocr(arr, cls=True)
        if not result or not result[0]:
            return "", 0.0
        for item in result[0]:
            try:
                text = item[1][0]
                conf = float(item[1][1])
            except (IndexError, TypeError, ValueError):
                continue
            if text and str(text).strip():
                lines.append(str(text).strip())
                confs.append(conf)
    else:
        result, _ = engine(arr)
        if not result:
            return "", 0.0
        for item in result:
            try:
                text = item[1]
                conf = float(item[2])
            except (IndexError, TypeError, ValueError):
                continue
            if text and str(text).strip():
                lines.append(str(text).strip())
                confs.append(conf)

    mean = sum(confs) / len(confs) if confs else 0.0
    return "\n".join(lines), mean


def ocr_pdf_bytes(pdf_bytes: bytes, dpi: int) -> dict[str, Any]:
    ocr = get_ocr()
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    scale = dpi / 72.0
    page_rows: list[dict[str, Any]] = []
    confs: list[float] = []
    all_lines: list[str] = []

    for pi in range(doc.page_count):
        page = doc.load_page(pi)
        pix = page.get_pixmap(matrix=fitz.Matrix(scale, scale), alpha=False)
        img = Image.open(io.BytesIO(pix.tobytes("png")))
        text, conf = ocr_image(ocr, img)
        cleaned = clean_lines(text)
        page_rows.append(
            {
                "index": pi,
                "text": "\n".join(cleaned),
                "confidence": round(conf, 3),
            }
        )
        if cleaned:
            confs.append(conf)
            all_lines.extend(cleaned)
    page_count = doc.page_count
    doc.close()

    verses = split_verses(all_lines)
    nonempty = sum(1 for p in page_rows if p["text"])
    confidence = overall_confidence(confs, nonempty, max(1, len(page_rows)))
    status = decide_status(confidence, verses, auto_min=AUTO_MIN)
    return {
        "verses": verses,
        "pages": page_rows,
        "confidence": confidence,
        "status": status,
        "page_count": page_count,
        "verse_count": len(verses) if verses else None,
    }


def handler(job: dict[str, Any]) -> dict[str, Any]:
    inp = job.get("input") or {}
    url = inp.get("file_url") or inp.get("pdf_url")
    if not url:
        return {"error": "file_url required"}

    dpi = int(inp.get("dpi") or DPI_DEFAULT)
    try:
        r = requests.get(url, timeout=180)
        r.raise_for_status()
    except Exception as e:
        return {"error": f"download failed: {e}", "file_url": url}

    try:
        result = ocr_pdf_bytes(r.content, dpi=dpi)
    except Exception as e:
        return {"error": f"ocr failed: {e}", "file_url": url}

    method = "rapidocr_serverless" if ENGINE != "paddle" else "paddleocr_serverless"
    return {
        "item_id": inp.get("item_id"),
        "title": inp.get("title"),
        "printed_page": inp.get("printed_page") or inp.get("page"),
        "file_url": url,
        "method": method,
        **result,
    }


runpod.serverless.start({"handler": handler})
