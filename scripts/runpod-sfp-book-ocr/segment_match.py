"""
Segment OCR'd book pages into songs and match to library items by SFP page #.
"""
from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

from postprocess import clean_lines, decide_status, overall_confidence, split_verses

TITLE_PAGE_RE = re.compile(r"^(\d{1,4})\s*[·.•\-–—]\s*(.+)$")


def parse_library_title(title: str) -> tuple[int | None, str]:
    m = TITLE_PAGE_RE.match(title.strip())
    if m:
        return int(m.group(1)), m.group(2).strip()
    return None, title.strip()


def load_library(path: str | Path) -> dict[int, dict[str, str]]:
    """
    library JSON: [{id, title, page?}] or {items: [...]}
    Returns map printed_page -> {item_id, title}
    """
    data = json.loads(Path(path).read_text())
    items = data.get("items") if isinstance(data, dict) else data
    by_page: dict[int, dict[str, str]] = {}
    for it in items or []:
        page = it.get("page")
        title = str(it.get("title") or "")
        if page is None:
            page, _ = parse_library_title(title)
        if page is None:
            continue
        by_page[int(page)] = {
            "item_id": str(it.get("item_id") or it.get("id") or ""),
            "title": title,
        }
    return by_page


def segment_pages(pages: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """
    Group consecutive pages into songs.
    A new song starts when printed_page increases by >= 1 from a known number,
    or when page_hint / detected number jumps.
    For hymnal scans: usually 1 page per song; sometimes 2 (continued).
    """
    if not pages:
        return []

    # Sort by pdf_index
    pages = sorted(pages, key=lambda p: p.get("pdf_index", 0))
    songs: list[dict[str, Any]] = []
    current: list[dict[str, Any]] = []
    current_page_num: int | None = None

    def flush():
        nonlocal current, current_page_num
        if not current:
            return
        song_page = current_page_num
        if song_page is None:
            for p in current:
                if p.get("printed_page") is not None:
                    song_page = p["printed_page"]
                    break
        songs.append(
            {
                "printed_page": song_page,
                "pdf_indexes": [p.get("pdf_index") for p in current],
                "pages": current,
            }
        )
        current = []
        current_page_num = None

    for p in pages:
        pn = p.get("printed_page")
        if not current:
            current = [p]
            current_page_num = pn
            continue

        # Same song if continued (same page # or None after a start) or next physical page
        # without a new printed number that's different by >0 from start+1 wrongly...
        # Rule: if printed_page is set and differs from current song's page AND
        # it's not current+0 (same), start new song. Continuation pages often have
        # no number or same number.
        if pn is not None and current_page_num is not None and pn != current_page_num:
            # New song at pn
            flush()
            current = [p]
            current_page_num = pn
            continue
        if pn is not None and current_page_num is None:
            current_page_num = pn

        # Cap at 2 pages per song (hymnal layout)
        if len(current) >= 2 and pn is not None and pn != current_page_num:
            flush()
            current = [p]
            current_page_num = pn
            continue
        if len(current) >= 2:
            # Force flush before adding a 3rd unless no printed page (rare)
            flush()
            current = [p]
            current_page_num = pn
            continue

        current.append(p)

    flush()
    return songs


def song_to_ocr_row(
    song: dict[str, Any],
    library: dict[int, dict[str, str]],
    auto_min: float = 0.65,
) -> dict[str, Any]:
    pages_out = []
    confs: list[float] = []
    all_lines: list[str] = []

    for p in song.get("pages") or []:
        raw = p.get("text") or ""
        conf = float(p.get("confidence") or 0)
        lines = clean_lines(raw)
        pages_out.append(
            {
                "index": p.get("pdf_index", 0),
                "printed_page": p.get("printed_page"),
                "text": "\n".join(lines),
                "confidence": round(conf, 3),
            }
        )
        if lines:
            confs.append(conf)
            all_lines.extend(lines)

    verses = split_verses(all_lines)
    nonempty = sum(1 for pg in pages_out if pg["text"])
    confidence = overall_confidence(confs, nonempty, max(1, len(pages_out)))
    status = decide_status(confidence, verses, auto_min=auto_min)

    printed = song.get("printed_page")
    match = library.get(int(printed)) if printed is not None else None

    return {
        "printed_page": printed,
        "item_id": match["item_id"] if match else None,
        "title": match["title"] if match else (f"{printed} · (unmatched)" if printed else "unmatched"),
        "matched": bool(match),
        "method": "paddleocr_book_scan",
        "confidence": confidence,
        "status": status,
        "verse_count": len(verses) if verses else None,
        "verses": verses,
        "pages": pages_out,
        "pdf_indexes": song.get("pdf_indexes"),
    }


def match_and_export(
    ocr_pages: list[dict[str, Any]],
    library_path: str | Path,
    out_jsonl: str | Path,
    auto_min: float = 0.65,
) -> dict[str, int]:
    library = load_library(library_path)
    songs = segment_pages(ocr_pages)
    matched = unmatched = 0
    out = Path(out_jsonl)
    with out.open("w") as fh:
        for song in songs:
            row = song_to_ocr_row(song, library, auto_min=auto_min)
            if row["matched"]:
                matched += 1
            else:
                unmatched += 1
            fh.write(json.dumps(row, ensure_ascii=False) + "\n")
    return {"songs": len(songs), "matched": matched, "unmatched": unmatched}
