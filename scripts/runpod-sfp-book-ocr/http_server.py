#!/usr/bin/env python3
"""Minimal HTTP OCR API for RunPod community pod (RapidOCR)."""
from __future__ import annotations

import io
import os
import sys
from typing import Any

# Ensure /workspace/app on path
sys.path.insert(0, "/workspace/app")

from flask import Flask, jsonify, request

try:
    import pymupdf as fitz
except ImportError:
    import fitz  # type: ignore
from PIL import Image
import numpy as np
from rapidocr_onnxruntime import RapidOCR

from postprocess import clean_lines, decide_status, overall_confidence, split_verses

app = Flask(__name__)
OCR = RapidOCR()
DPI = int(os.environ.get("OCR_DPI", "200"))
AUTO_MIN = float(os.environ.get("OCR_AUTO_MIN", "0.65"))


def ocr_image(img: Image.Image) -> tuple[str, float]:
    arr = np.array(img.convert("RGB"))
    result, _ = OCR(arr)
    if not result:
        return "", 0.0
    lines, confs = [], []
    for item in result:
        try:
            text, conf = item[1], float(item[2])
        except (IndexError, TypeError, ValueError):
            continue
        if text and str(text).strip():
            lines.append(str(text).strip())
            confs.append(conf)
    return "\n".join(lines), (sum(confs) / len(confs) if confs else 0.0)


def ocr_pdf_bytes(pdf_bytes: bytes, dpi: int) -> dict[str, Any]:
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    scale = dpi / 72.0
    page_rows, confs, all_lines = [], [], []
    for pi in range(doc.page_count):
        page = doc.load_page(pi)
        pix = page.get_pixmap(matrix=fitz.Matrix(scale, scale), alpha=False)
        img = Image.open(io.BytesIO(pix.tobytes("png")))
        text, conf = ocr_image(img)
        cleaned = clean_lines(text)
        page_rows.append({"index": pi, "text": "\n".join(cleaned), "confidence": round(conf, 3)})
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
        "method": "rapidocr_http",
    }


@app.get("/health")
def health():
    return jsonify({"ok": True, "engine": "rapid"})


@app.post("/ocr")
def ocr():
    body = request.get_json(force=True, silent=True) or {}
    # Accept RunPod-style envelope too
    inp = body.get("input") if isinstance(body.get("input"), dict) else body
    url = inp.get("file_url") or inp.get("pdf_url")
    if not url:
        return jsonify({"error": "file_url required"}), 400
    dpi = int(inp.get("dpi") or DPI)
    try:
        import requests

        r = requests.get(url, timeout=180)
        r.raise_for_status()
    except Exception as e:
        return jsonify({"error": f"download failed: {e}", "file_url": url}), 502
    try:
        result = ocr_pdf_bytes(r.content, dpi=dpi)
    except Exception as e:
        return jsonify({"error": f"ocr failed: {e}", "file_url": url}), 500
    return jsonify(
        {
            "item_id": inp.get("item_id"),
            "title": inp.get("title"),
            "printed_page": inp.get("printed_page") or inp.get("page"),
            "file_url": url,
            **result,
        }
    )


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", "8000")), threaded=True)
