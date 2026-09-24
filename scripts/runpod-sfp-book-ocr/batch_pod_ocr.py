#!/usr/bin/env python3
"""
Batch OCR full-song PDFs on the RunPod HTTP worker box (local RapidOCR).

  python -u batch_pod_ocr.py \
    --pdf-dir=/workspace/pdfs \
    --index=/workspace/sfp-full-ppt-index.json \
    --library=/workspace/sfp-library.json \
    --out=/workspace/sfp-book-ocr-http.jsonl \
    --done=/workspace/sfp-book-ocr-done-pages.txt

Resumes by printed_page already in --out or --done.
Writes /workspace/sfp-ocr-progress.json every song for the Mac pusher.
"""
from __future__ import annotations

import argparse
import io
import json
import re
import time
from pathlib import Path

try:
    import pymupdf as fitz
except ImportError:
    import fitz  # type: ignore
from PIL import Image
import numpy as np
from rapidocr_onnxruntime import RapidOCR

from postprocess import clean_lines, decide_status, overall_confidence, split_verses

DPI = 200
AUTO_MIN = 0.65


def load_done(out: Path, done_file: Path | None) -> set[int]:
    pages: set[int] = set()
    if done_file and done_file.exists():
        for line in done_file.read_text().splitlines():
            line = line.strip()
            if line.isdigit():
                pages.add(int(line))
    if out.exists():
        for line in out.read_text().splitlines():
            if not line.strip():
                continue
            try:
                row = json.loads(line)
            except json.JSONDecodeError:
                continue
            if row.get("printed_page") is not None:
                pages.add(int(row["printed_page"]))
    return pages


def ocr_pdf(engine: RapidOCR, pdf_path: Path, dpi: int = DPI) -> dict:
    doc = fitz.open(pdf_path)
    scale = dpi / 72.0
    page_rows, confs, all_lines = [], [], []
    for pi in range(doc.page_count):
        page = doc.load_page(pi)
        pix = page.get_pixmap(matrix=fitz.Matrix(scale, scale), alpha=False)
        img = Image.open(io.BytesIO(pix.tobytes("png")))
        arr = np.array(img.convert("RGB"))
        result, _ = engine(arr)
        lines, confs_p = [], []
        if result:
            for item in result:
                try:
                    text, conf = item[1], float(item[2])
                except (IndexError, TypeError, ValueError):
                    continue
                if text and str(text).strip():
                    lines.append(str(text).strip())
                    confs_p.append(conf)
        text = "\n".join(lines)
        mean = sum(confs_p) / len(confs_p) if confs_p else 0.0
        cleaned = clean_lines(text)
        page_rows.append({"index": pi, "text": "\n".join(cleaned), "confidence": round(mean, 3)})
        if cleaned:
            confs.append(mean)
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
        "method": "rapidocr_pod_batch",
    }


def write_progress(path: Path, **kw) -> None:
    path.write_text(json.dumps({**kw, "ts": time.time()}, indent=2))


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--pdf-dir", required=True)
    ap.add_argument("--index", required=True)
    ap.add_argument("--library", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--done", default="")
    ap.add_argument("--progress", default="/workspace/sfp-ocr-progress.json")
    ap.add_argument("--dpi", type=int, default=DPI)
    ap.add_argument("--limit", type=int, default=0)
    args = ap.parse_args()

    pdf_dir = Path(args.pdf_dir)
    index = json.loads(Path(args.index).read_text())
    library = json.loads(Path(args.library).read_text())
    by_page = {int(it["page"]): it for it in library.get("items") or [] if it.get("page") is not None}
    pages = index.get("pages") or []
    out = Path(args.out)
    done_file = Path(args.done) if args.done else None
    progress = Path(args.progress)
    done = load_done(out, done_file)

    jobs = []
    for row in pages:
        page = int(row["page"])
        if page in done:
            continue
        pdf = row.get("pdf") or ""
        # Remap Mac path → pod pdf-dir by basename
        name = Path(pdf).name
        local = pdf_dir / name
        if not local.exists():
            # try zero-padded glob
            hits = list(pdf_dir.glob(f"{page:04d}*.pdf")) + list(pdf_dir.glob(f"{page:03d}*.pdf"))
            if not hits:
                continue
            local = hits[0]
        lib = by_page.get(page) or {}
        jobs.append(
            {
                "printed_page": page,
                "pdf": str(local),
                "item_id": lib.get("item_id") or lib.get("id"),
                "title": lib.get("title") or f"{page}",
            }
        )
    if args.limit > 0:
        jobs = jobs[: args.limit]

    total = len(jobs) + len(done)
    print(f"batch pending={len(jobs)} already={len(done)} total_target≈{total}", flush=True)
    write_progress(
        progress,
        status="starting",
        pending=len(jobs),
        done=len(done),
        ok=0,
        fail=0,
        rate_per_min=0,
    )

    engine = RapidOCR()
    t0 = time.time()
    ok = fail = 0
    out.parent.mkdir(parents=True, exist_ok=True)

    for i, job in enumerate(jobs, 1):
        t_song = time.time()
        try:
            result = ocr_pdf(engine, Path(job["pdf"]), dpi=args.dpi)
            row = {
                "item_id": job["item_id"],
                "title": job["title"],
                "printed_page": job["printed_page"],
                "matched": bool(job["item_id"]),
                "pdf": job["pdf"],
                **result,
            }
            with out.open("a") as f:
                f.write(json.dumps(row) + "\n")
            if done_file:
                with done_file.open("a") as f:
                    f.write(f"{job['printed_page']}\n")
            ok += 1
            sample = (result.get("verses") or [{}])[0].get("text", "")[:60].replace("\n", " / ")
            print(
                f"[{i}/{len(jobs)}] p{job['printed_page']} conf={result['confidence']:.2f} "
                f"status={result['status']} {sample}",
                flush=True,
            )
        except Exception as e:
            fail += 1
            print(f"[{i}/{len(jobs)}] p{job['printed_page']} FAIL {e}", flush=True)
            with out.open("a") as f:
                f.write(
                    json.dumps(
                        {
                            "item_id": job["item_id"],
                            "title": job["title"],
                            "printed_page": job["printed_page"],
                            "error": str(e),
                            "status": "needs_review",
                            "confidence": 0,
                            "verses": [],
                            "method": "rapidocr_pod_batch",
                        }
                    )
                    + "\n"
                )

        elapsed = max(1.0, time.time() - t0)
        rate = (ok + fail) / (elapsed / 60.0)
        remaining = len(jobs) - i
        eta_min = remaining / rate if rate > 0 else None
        write_progress(
            progress,
            status="running",
            pending=remaining,
            done=len(done) + ok + fail,
            ok=ok,
            fail=fail,
            rate_per_min=round(rate, 2),
            eta_min=round(eta_min, 1) if eta_min is not None else None,
            last_page=job["printed_page"],
            last_secs=round(time.time() - t_song, 1),
            elapsed_min=round(elapsed / 60.0, 1),
        )

    write_progress(
        progress,
        status="complete",
        pending=0,
        done=len(done) + ok + fail,
        ok=ok,
        fail=fail,
        rate_per_min=round((ok + fail) / max(0.01, (time.time() - t0) / 60.0), 2),
        eta_min=0,
    )
    print(f"done ok={ok} fail={fail} → {out}", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
