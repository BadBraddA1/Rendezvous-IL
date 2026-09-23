#!/usr/bin/env python3
"""
SFP lyric-band OCR (macOS Vision).

Renders each music page, crops the lyric lanes between shape-note systems,
runs Vision, and emits per-page text + confidence.

Low confidence → status=needs_review for staff confirmation in admin.

  python3 scripts/sfp-lyric-band-ocr/batch_lyric_ocr.py \\
    --jobs=/tmp/sfp-ocr-jobs.json \\
    --out=/tmp/sfp-lyric-ocr.jsonl \\
    [--limit=N] [--skip-title]

Requires: pymupdf, pillow, and scripts/sfp-lyric-band-ocr/vision_ocr
  (build: swiftc -O vision_ocr.swift -o vision_ocr)
"""
from __future__ import annotations

import argparse
import io
import json
import re
import subprocess
import tempfile
from pathlib import Path

import requests

try:
    import pymupdf as fitz
except ImportError:
    import fitz  # type: ignore
from PIL import Image

HERE = Path(__file__).resolve().parent
VISION = HERE / "vision_ocr"

# Fractions of page height — lyric text under each music system on 16:9 SFP slides.
DEFAULT_BANDS = [
    (0.28, 0.37),
    (0.54, 0.64),
    (0.76, 0.88),
]

AUTO_MIN_CONF = 0.55


def ensure_vision() -> Path:
    if VISION.exists():
        return VISION
    src = HERE / "vision_ocr.swift"
    if not src.exists():
        raise SystemExit(f"missing {VISION} and {src}")
    subprocess.check_call(["swiftc", "-O", str(src), "-o", str(VISION)])
    return VISION


def is_junk_line(line: str) -> bool:
    s = line.strip()
    if len(s) < 3:
        return True
    letters = sum(c.isalpha() for c in s)
    if letters < 3:
        return True
    # stave / glyph noise
    if letters > 0 and sum(c.lower() in "aeiou" for c in s) / letters < 0.12 and "-" not in s:
        return True
    return False


def clean_lines(raw: str) -> str:
    out = []
    for line in raw.splitlines():
        line = line.strip()
        if not line or is_junk_line(line):
            continue
        out.append(line)
    return "\n".join(out)


def render_lyric_strip(page, bands, scale: float = 3.0) -> Path:
    pix = page.get_pixmap(matrix=fitz.Matrix(scale, scale), alpha=False)
    img = Image.open(io.BytesIO(pix.tobytes("png"))).convert("RGB")
    w, h = img.size
    crops = []
    for y0f, y1f in bands:
        y0, y1 = int(y0f * h), int(y1f * h)
        crops.append(img.crop((int(0.05 * w), y0, int(0.95 * w), y1)))
    total_h = sum(c.size[1] for c in crops) + 8 * (len(crops) - 1)
    out = Image.new("RGB", (crops[0].size[0], total_h), (255, 255, 255))
    y = 0
    for c in crops:
        out.paste(c, (0, y))
        y += c.size[1] + 8
    tmp = tempfile.NamedTemporaryFile(suffix=".png", delete=False)
    out.save(tmp.name)
    return Path(tmp.name)


def vision_ocr(png: Path) -> tuple[str, float]:
    proc = subprocess.run(
        [str(ensure_vision()), str(png)],
        capture_output=True,
        text=True,
        check=False,
    )
    if proc.returncode != 0:
        return "", 0.0
    conf = 0.0
    lines: list[str] = []
    for line in proc.stdout.splitlines():
        if line.startswith("CONF "):
            try:
                conf = float(line.split()[1])
            except (IndexError, ValueError):
                conf = 0.0
            continue
        # "0.85\ttext…"
        if "\t" in line:
            _, text = line.split("\t", 1)
            lines.append(text.strip())
        elif line.strip():
            lines.append(line.strip())
    return clean_lines("\n".join(lines)), conf


def process_pdf(
    pdf_bytes: bytes,
    *,
    skip_title: bool,
    bands: list[tuple[float, float]],
) -> dict:
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    pages_out = []
    confs: list[float] = []
    start = 1 if skip_title and doc.page_count > 1 else 0
    for i in range(start, doc.page_count):
        page = doc.load_page(i)
        # Exact 720×405 openers are title cards — skip if not already skipped
        r = page.rect
        if abs(r.width - 720) < 0.5 and abs(r.height - 405) < 0.01:
            continue
        png = render_lyric_strip(page, bands)
        try:
            text, conf = vision_ocr(png)
        finally:
            png.unlink(missing_ok=True)
        pages_out.append({"index": i, "text": text, "confidence": round(conf, 3)})
        if text:
            confs.append(conf)
    doc.close()
    overall = sum(confs) / len(confs) if confs else 0.0
    nonempty = sum(1 for p in pages_out if p["text"])
    status = "auto"
    if overall < AUTO_MIN_CONF or nonempty == 0:
        status = "needs_review"
    elif overall < 0.7 and nonempty < max(1, len(pages_out) // 2):
        status = "needs_review"
    return {
        "pages": pages_out,
        "confidence": round(overall, 3),
        "status": status,
        "method": "lyric_band_vision",
        "bands": bands,
    }


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--jobs", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--skip-title", action="store_true", default=True)
    ap.add_argument("--no-skip-title", action="store_true")
    args = ap.parse_args()
    skip_title = not args.no_skip_title

    ensure_vision()
    jobs = json.loads(Path(args.jobs).read_text())
    if isinstance(jobs, dict):
        jobs = jobs.get("jobs") or jobs.get("results") or []

    out_path = Path(args.out)
    done_titles = set()
    if out_path.exists():
        for line in out_path.read_text().splitlines():
            if not line.strip():
                continue
            try:
                done_titles.add(json.loads(line).get("title"))
            except json.JSONDecodeError:
                pass

    n = 0
    with out_path.open("a") as fh:
        for job in jobs:
            title = job.get("title") or ""
            if title in done_titles:
                continue
            if args.limit and n >= args.limit:
                break
            url = job["file_url"]
            try:
                r = requests.get(url, timeout=120)
                r.raise_for_status()
                result = process_pdf(r.content, skip_title=skip_title, bands=DEFAULT_BANDS)
            except Exception as e:
                result = {
                    "pages": [],
                    "confidence": 0.0,
                    "status": "needs_review",
                    "method": "lyric_band_vision",
                    "error": str(e),
                }
            row = {
                "item_id": job.get("item_id"),
                "page": job.get("page"),
                "title": title,
                "file_url": url,
                **result,
            }
            fh.write(json.dumps(row, ensure_ascii=False) + "\n")
            fh.flush()
            n += 1
            print(
                f"[{n}] {title} conf={result.get('confidence')} status={result.get('status')} pages={len(result.get('pages') or [])}",
                flush=True,
            )
    print(f"done wrote={n} → {out_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
