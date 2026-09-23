#!/usr/bin/env python3
"""
SFP book-scan OCR on RunPod (PaddleOCR PP-OCRv4 GPU).

Input: full hymnal PDF or page images (from ingest-sfp-book-scan.ts index),
plus a library JSON of song_pack_items for page→item matching.

  python -u batch_book_ocr.py \\
    --pdf=/workspace/sfp-book-scan.pdf \\
    --library=/workspace/sfp-library.json \\
    --out=/workspace/sfp-book-ocr.jsonl \\
    [--limit=20] [--dpi=200]

  # Or from ingest index (images already on disk / URLs):
  python -u batch_book_ocr.py \\
    --index=/workspace/sfp-book-scan-index.json \\
    --library=/workspace/sfp-library.json \\
    --out=/workspace/sfp-book-ocr.jsonl

Output JSONL rows (one song):
  { item_id, title, printed_page, verses:[{index,text}], pages, confidence, status, method }
"""
from __future__ import annotations

import argparse
import io
import json
import sys
import tempfile
from pathlib import Path

import requests

try:
    import pymupdf as fitz
except ImportError:
    import fitz  # type: ignore
from PIL import Image

from postprocess import detect_page_number
from segment_match import match_and_export

DPI_DEFAULT = 200
AUTO_MIN = 0.65


def get_ocr():
    from paddleocr import PaddleOCR

    # use_angle_cls helps skewed scans; lang=en for Latin hymnals
    return PaddleOCR(
        use_angle_cls=True,
        lang="en",
        use_gpu=True,
        show_log=False,
    )


def ocr_image(ocr, img: Image.Image) -> tuple[str, float]:
    """Return (text, mean_confidence)."""
    import numpy as np

    arr = np.array(img.convert("RGB"))
    result = ocr.ocr(arr, cls=True)
    if not result or not result[0]:
        return "", 0.0
    lines = []
    confs = []
    for item in result[0]:
        # item: [box, (text, conf)]
        try:
            text = item[1][0]
            conf = float(item[1][1])
        except (IndexError, TypeError, ValueError):
            continue
        if text and str(text).strip():
            lines.append(str(text).strip())
            confs.append(conf)
    mean = sum(confs) / len(confs) if confs else 0.0
    return "\n".join(lines), mean


def render_pdf_pages(pdf_path: Path, dpi: int, limit: int = 0):
    doc = fitz.open(pdf_path)
    n = doc.page_count
    if limit > 0:
        n = min(n, limit)
    scale = dpi / 72.0
    for i in range(n):
        page = doc.load_page(i)
        pix = page.get_pixmap(matrix=fitz.Matrix(scale, scale), alpha=False)
        img = Image.open(io.BytesIO(pix.tobytes("png")))
        yield i, img
    doc.close()


def load_image(path: Path) -> Image.Image:
    return Image.open(path).convert("RGB")


def download(url: str, dest: Path) -> Path:
    r = requests.get(url, timeout=180)
    r.raise_for_status()
    dest.write_bytes(r.content)
    return dest


def main() -> int:
    ap = argparse.ArgumentParser(description="SFP book-scan PaddleOCR batch")
    ap.add_argument("--pdf", help="Local path to full book scan PDF")
    ap.add_argument("--index", help="ingest-sfp-book-scan index JSON")
    ap.add_argument("--library", required=True, help="Library items JSON for matching")
    ap.add_argument("--out", required=True, help="Output JSONL path")
    ap.add_argument("--pages-json", default="", help="Optional intermediate per-page OCR JSON")
    ap.add_argument("--limit", type=int, default=0, help="Max PDF/image pages to OCR")
    ap.add_argument("--dpi", type=int, default=DPI_DEFAULT)
    ap.add_argument("--auto-min", type=float, default=AUTO_MIN)
    ap.add_argument("--cpu", action="store_true", help="Force CPU (no GPU)")
    args = ap.parse_args()

    if not args.pdf and not args.index:
        print("pass --pdf=… or --index=…", file=sys.stderr)
        return 1

    print("loading PaddleOCR…", flush=True)
    if args.cpu:
        from paddleocr import PaddleOCR

        ocr = PaddleOCR(use_angle_cls=True, lang="en", use_gpu=False, show_log=False)
    else:
        ocr = get_ocr()
    print("PaddleOCR ready", flush=True)

    ocr_pages: list[dict] = []

    if args.pdf:
        pdf_path = Path(args.pdf)
        if not pdf_path.exists():
            # try download if URL
            if str(args.pdf).startswith("http"):
                dest = Path("/tmp/sfp-book-scan.pdf")
                print(f"downloading {args.pdf}…", flush=True)
                download(args.pdf, dest)
                pdf_path = dest
            else:
                print(f"missing pdf {args.pdf}", file=sys.stderr)
                return 1
        for i, img in render_pdf_pages(pdf_path, args.dpi, args.limit):
            text, conf = ocr_image(ocr, img)
            printed = detect_page_number(text)
            row = {
                "pdf_index": i,
                "printed_page": printed,
                "text": text,
                "confidence": conf,
            }
            ocr_pages.append(row)
            print(
                f"[{i+1}] printed={printed} conf={conf:.3f} chars={len(text)}",
                flush=True,
            )
            if args.limit and len(ocr_pages) >= args.limit:
                break
    else:
        index = json.loads(Path(args.index).read_text())
        kind = index.get("kind")
        pages = index.get("pages") or []

        # Full-song PPT index: each entry is already one song (1–3 slides) with page #.
        if kind == "full_song_ppt":
            from postprocess import clean_lines, decide_status, overall_confidence, split_verses
            from segment_match import load_library

            library = load_library(args.library)
            out_path = Path(args.out)
            done = 0
            with out_path.open("w") as fh:
                for i, p in enumerate(pages):
                    if args.limit and done >= args.limit:
                        break
                    pdf = p.get("pdf")
                    printed = p.get("page")
                    if not pdf or not Path(pdf).exists():
                        print(f"skip missing pdf page={printed}", flush=True)
                        continue
                    page_rows = []
                    confs = []
                    all_lines: list[str] = []
                    for pi, img in render_pdf_pages(Path(pdf), args.dpi, limit=0):
                        text, conf = ocr_image(ocr, img)
                        page_rows.append(
                            {
                                "index": pi,
                                "printed_page": printed,
                                "text": "\n".join(clean_lines(text)),
                                "confidence": round(conf, 3),
                            }
                        )
                        if text.strip():
                            confs.append(conf)
                            all_lines.extend(clean_lines(text))
                    verses = split_verses(all_lines)
                    nonempty = sum(1 for pg in page_rows if pg["text"])
                    confidence = overall_confidence(confs, nonempty, max(1, len(page_rows)))
                    status = decide_status(confidence, verses, auto_min=args.auto_min)
                    match = library.get(int(printed)) if printed is not None else None
                    row = {
                        "printed_page": printed,
                        "item_id": match["item_id"] if match else None,
                        "title": match["title"] if match else f"{printed} · (unmatched)",
                        "matched": bool(match),
                        "method": "paddleocr_full_song_ppt",
                        "confidence": confidence,
                        "status": status,
                        "verse_count": len(verses) if verses else None,
                        "verses": verses,
                        "pages": page_rows,
                        "ppt": p.get("ppt"),
                        "pdf": pdf,
                    }
                    fh.write(json.dumps(row, ensure_ascii=False) + "\n")
                    fh.flush()
                    done += 1
                    print(
                        f"[{done}] page={printed} conf={confidence} status={status} verses={len(verses)} matched={bool(match)}",
                        flush=True,
                    )
            print(f"done wrote={done} → {out_path}", flush=True)
            return 0

        if kind == "pdf" and pages:
            url = pages[0].get("url")
            source = pages[0].get("source")
            pdf_path = Path(source) if source and Path(source).exists() else None
            if pdf_path is None and url:
                pdf_path = Path("/tmp/sfp-book-scan.pdf")
                print(f"downloading {url}…", flush=True)
                download(url, pdf_path)
            if pdf_path is None:
                print("index pdf has no local source or url", file=sys.stderr)
                return 1
            for i, img in render_pdf_pages(pdf_path, args.dpi, args.limit):
                text, conf = ocr_image(ocr, img)
                printed = detect_page_number(text)
                ocr_pages.append(
                    {
                        "pdf_index": i,
                        "printed_page": printed,
                        "text": text,
                        "confidence": conf,
                    }
                )
                print(
                    f"[{i+1}] printed={printed} conf={conf:.3f} chars={len(text)}",
                    flush=True,
                )
        else:
            for i, p in enumerate(pages):
                if args.limit and i >= args.limit:
                    break
                path = p.get("source")
                url = p.get("url")
                hint = p.get("page_hint")
                img = None
                if path and Path(path).exists():
                    img = load_image(Path(path))
                elif url:
                    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
                        download(url, Path(tmp.name))
                        img = load_image(Path(tmp.name))
                if img is None:
                    print(f"skip page {i}: no image", flush=True)
                    continue
                text, conf = ocr_image(ocr, img)
                printed = detect_page_number(text, hint=hint)
                ocr_pages.append(
                    {
                        "pdf_index": p.get("pdf_index", i),
                        "printed_page": printed,
                        "text": text,
                        "confidence": conf,
                    }
                )
                print(
                    f"[{i+1}] printed={printed} conf={conf:.3f} chars={len(text)}",
                    flush=True,
                )

    if args.pages_json:
        Path(args.pages_json).write_text(json.dumps(ocr_pages, ensure_ascii=False, indent=2))
        print(f"wrote pages → {args.pages_json}", flush=True)

    stats = match_and_export(
        ocr_pages,
        args.library,
        args.out,
        auto_min=args.auto_min,
    )
    print(f"done {stats} → {args.out}", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
