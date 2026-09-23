"""
Lyric cleanup + verse splitting for hymnal OCR text.
"""
from __future__ import annotations

import re
from typing import Any


# Lines that are almost certainly music / junk, not lyrics.
_JUNK_RE = re.compile(
    r"^[\d\s\-–—.|•·_/\\]+$|"
    r"^[a-gA-G][#b]?\s*$|"
    r"^(?i:verse|chorus|refrain|bridge)\s*\d*\s*$",
)

# Only explicit verse markers — bare digits are measure/shape-note noise.
_VERSE_START = re.compile(
    r"^(?i:verse)\s*([1-9]|1[0-2])\s*[.):\-–—]?\s*(.*)$|"
    r"^([1-9]|1[0-2])\s*[.)]\s+(.+)$",
)

_PAGE_NUM = re.compile(r"(?i)\b(?:page\s*)?(\d{1,4})\b")


def is_junk_line(line: str) -> bool:
    s = line.strip()
    if len(s) < 2:
        return True
    letters = sum(c.isalpha() for c in s)
    if letters < 2:
        return True
    if _JUNK_RE.match(s):
        return True
    # Mostly non-latin / diacritic garbage from bad OCR
    ascii_letters = sum(c.isascii() and c.isalpha() for c in s)
    if letters > 0 and ascii_letters / letters < 0.5 and "-" not in s:
        return True
    return False


def clean_lines(raw: str) -> list[str]:
    out: list[str] = []
    for line in raw.replace("\u000c", "\n").splitlines():
        line = line.strip()
        if not line or is_junk_line(line):
            continue
        out.append(line)
    return out


def detect_page_number(text: str, hint: int | None = None) -> int | None:
    if hint is not None:
        return hint
    # Prefer short lines near the start (headers)
    lines = [ln.strip() for ln in text.splitlines() if ln.strip()][:8]
    for ln in lines:
        if re.fullmatch(r"\d{1,4}", ln):
            n = int(ln)
            if 1 <= n <= 1999:
                return n
    # Fallback: first standalone-ish number in first 200 chars
    head = text[:200]
    for m in re.finditer(r"(?m)^\s*(\d{1,4})\s*$", head):
        n = int(m.group(1))
        if 1 <= n <= 1999:
            return n
    return None


def split_verses(lines: list[str]) -> list[dict[str, Any]]:
    """
    Split cleaned lyric lines into verses.
    Prefer explicit 'Verse N' / 'N. lyrics…' markers. If none, one block.
    """
    if not lines:
        return []

    buckets: list[tuple[int, list[str]]] = []
    current_n = 1
    current: list[str] = []
    saw_marker = False

    for line in lines:
        m = _VERSE_START.match(line)
        if m:
            saw_marker = True
            if m.group(1) is not None:
                n = int(m.group(1))
                rest = (m.group(2) or "").strip()
            else:
                n = int(m.group(3))
                rest = (m.group(4) or "").strip()
            if current:
                buckets.append((current_n, current))
            current_n = n
            current = [rest] if rest else []
            continue
        current.append(line)

    if current or not buckets:
        buckets.append((current_n, current))

    if not saw_marker:
        text = "\n".join(lines).strip()
        return [{"index": 1, "text": text, "lines": list(lines)}] if text else []

    verses: list[dict[str, Any]] = []
    for n, ls in buckets:
        text = "\n".join(ls).strip()
        if not text:
            continue
        verses.append({"index": n, "text": text, "lines": ls})
    return verses


def overall_confidence(page_confs: list[float], nonempty: int, total: int) -> float:
    if not page_confs:
        return 0.0
    mean = sum(page_confs) / len(page_confs)
    if nonempty == 0:
        return 0.0
    # Penalize sparse pages
    coverage = nonempty / max(1, total)
    return round(mean * (0.5 + 0.5 * coverage), 3)


def decide_status(confidence: float, verses: list[dict[str, Any]], auto_min: float = 0.65) -> str:
    if not verses:
        return "needs_review"
    chars = sum(len(v.get("text") or "") for v in verses)
    if confidence < auto_min or chars < 40:
        return "needs_review"
    return "auto"
