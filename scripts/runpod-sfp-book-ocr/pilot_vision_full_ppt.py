#!/usr/bin/env python3
"""
Local pilot OCR for full-song PDFs using macOS Vision (no GPU required).

Validates convert → OCR → verses → JSONL before RunPod PaddleOCR.
Not the production engine — PaddleOCR on RunPod is v3 primary.

  python3 scripts/runpod-sfp-book-ocr/pilot_vision_full_ppt.py \\
    --index=/tmp/sfp-full-ppt-index.json \\
    --library=/tmp/sfp-library.json \\
    --out=/tmp/sfp-book-ocr-pilot.jsonl \\
    --limit=20
"""
from __future__ import annotations

import argparse
import io
import json
import subprocess
import sys
import tempfile
from pathlib import Path

try:
    import pymupdf as fitz
except ImportError:
    import fitz  # type: ignore
from PIL import Image

HERE = Path(__file__).resolve().parent
VISION = HERE.parent / "sfp-lyric-band-ocr" / "vision_ocr"
if not VISION.exists():
    VISION = HERE / "vision_ocr"

sys.path.insert(0, str(HERE))
from postprocess import clean_lines, decide_status, overall_confidence, split_verses
from segment_match import load_library


def ensure_vision() -> Path:
    if VISION.exists():
        return VISION
    src = HERE.parent / "sfp-lyric-band-ocr" / "vision_ocr.swift"
    if not src.exists():
        raise SystemExit(f"missing vision binary and {src}")
    out = HERE / "vision_ocr"
    subprocess.check_call(["swiftc", "-O", str(src), "-o", str(out)])
    return out


def vision_ocr(png: Path) -> tuple[str, float]:
    raw = subprocess.check_output([str(ensure_vision()), str(png)], text=True)
    lines_out: list[str] = []
    confs: list[float] = []
    overall = 0.0
    for line in raw.splitlines():
        s = line.strip()
        if not s:
            continue
        if s.upper().startswith("CONF"):
            try:
                overall = float(s.split()[-1])
            except ValueError:
                pass
            continue
        if "\t" in s:
            left, right = s.split("\t", 1)
            try:
                confs.append(float(left))
            except ValueError:
                lines_out.append(s)
                continue
            if right.strip():
                lines_out.append(right.strip())
            continue
        lines_out.append(s)
    mean = sum(confs) / len(confs) if confs else overall
    return "\n".join(lines_out), float(mean)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--index", required=True)
    ap.add_argument("--library", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--limit", type=int, default=20)
    ap.add_argument("--dpi", type=int, default=200)
    ap.add_argument("--auto-min", type=float, default=0.65)
    args = ap.parse_args()

    ensure_vision()
    index = json.loads(Path(args.index).read_text())
    library = load_library(args.library)
    pages = index.get("pages") or []
    scale = args.dpi / 72.0
    done = 0
    out = Path(args.out)
    done_pages: set[int] = set()
    if out.exists():
        for line in out.read_text().splitlines():
            if not line.strip():
                continue
            try:
                row = json.loads(line)
                if row.get("printed_page") is not None:
                    done_pages.add(int(row["printed_page"]))
            except json.JSONDecodeError:
                pass
    with out.open("a") as fh:
        for p in pages:
            printed = p.get("page")
            if printed is not None and int(printed) in done_pages:
                continue
            if args.limit and done >= args.limit:
                break
            pdf = p.get("pdf")
            if not pdf or not Path(pdf).exists():
                print(f"skip missing {printed}", flush=True)
                continue
            doc = fitz.open(pdf)
            page_rows = []
            confs = []
            all_lines: list[str] = []
            for pi in range(doc.page_count):
                page = doc.load_page(pi)
                pix = page.get_pixmap(matrix=fitz.Matrix(scale, scale), alpha=False)
                with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
                    png = Path(tmp.name)
                    png.write_bytes(pix.tobytes("png"))
                try:
                    text, conf = vision_ocr(png)
                finally:
                    png.unlink(missing_ok=True)
                cleaned = clean_lines(text)
                page_rows.append(
                    {
                        "index": pi,
                        "printed_page": printed,
                        "text": "\n".join(cleaned),
                        "confidence": round(conf, 3),
                    }
                )
                if cleaned:
                    confs.append(conf)
                    all_lines.extend(cleaned)
            doc.close()
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
                "method": "vision_full_song_ppt_pilot",
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
            if printed is not None:
                done_pages.add(int(printed))
            sample = (verses[0]["text"][:80] if verses else "")
            print(
                f"[{done}] #{printed} conf={confidence} status={status} verses={len(verses)} matched={bool(match)} | {sample}",
                flush=True,
            )
    print(f"done wrote={done} → {out} total_unique={len(done_pages)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
