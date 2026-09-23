#!/usr/bin/env python3
"""Quick unit checks for segment/postprocess (no GPU)."""
from __future__ import annotations

import json
import tempfile
from pathlib import Path

from postprocess import clean_lines, split_verses
from segment_match import load_library, segment_pages, song_to_ocr_row


def test_split_no_markers():
    lines = clean_lines("We praise Thee O God\nFor Thy love\n")
    v = split_verses(lines)
    assert len(v) == 1 and "praise" in v[0]["text"].lower()


def test_split_explicit_verse():
    lines = ["Verse 1 Hear the call", "line two", "Verse 2 Second verse here"]
    v = split_verses(lines)
    assert len(v) == 2
    assert v[0]["index"] == 1 and "Hear" in v[0]["text"]
    assert v[1]["index"] == 2


def test_match_library():
    lib = {
        "items": [
            {"id": "abc", "title": "2 · We Praise Thee O God", "page": 2},
        ]
    }
    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as f:
        json.dump(lib, f)
        path = f.name
    by = load_library(path)
    assert 2 in by and by[2]["item_id"] == "abc"
    Path(path).unlink()


def test_segment_two_songs():
    pages = [
        {"pdf_index": 0, "printed_page": 2, "text": "song a", "confidence": 0.9},
        {"pdf_index": 1, "printed_page": 3, "text": "song b", "confidence": 0.9},
    ]
    songs = segment_pages(pages)
    assert len(songs) == 2
    row = song_to_ocr_row(songs[0], {2: {"item_id": "x", "title": "2 · A"}})
    assert row["matched"] and row["printed_page"] == 2


if __name__ == "__main__":
    test_split_no_markers()
    test_split_explicit_verse()
    test_match_library()
    test_segment_two_songs()
    print("ok")
