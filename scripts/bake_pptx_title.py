#!/usr/bin/env python3
"""
Strip leading title-like slides from an SFP .pptx and insert a uniform opener:
  page number, quoted title, "N verses".

IMPORTANT: Do NOT resize the slide canvas. Original SFP decks are ~10"×5.63"
(16:9); forcing 13.33"×7.5" without scaling shapes left music at ~75% size.

Usage:
  python bake_pptx_title.py input.pptx output.pptx --page 121 --title "God Is Love" --verses 3
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import PP_ALIGN
from pptx.util import Emu, Inches, Pt


def _delete_slide(prs: Presentation, index: int) -> None:
    slide_id_list = prs.slides._sldIdLst  # noqa: SLF001
    slides = list(slide_id_list)
    r_id = slides[index].get("rId")
    slide_id_list.remove(slides[index])
    if r_id:
        try:
            prs.part.drop_rel(r_id)
        except Exception:
            pass


def _shape_count(slide) -> int:
    return len(slide.shapes)


def _has_picture(slide) -> bool:
    for shape in slide.shapes:
        if shape.shape_type is not None and int(shape.shape_type) == 13:  # PICTURE
            return True
    return False


def _looks_like_title_slide(slide) -> bool:
    """Sparse text-only openers (old SFP titles) vs dense music slides."""
    n = _shape_count(slide)
    if _has_picture(slide):
        return False
    if n <= 8:
        return True
    text_len = 0
    for shape in slide.shapes:
        if not shape.has_text_frame:
            return False
        text_len += len(shape.text_frame.text or "")
    return text_len < 120 and n <= 20


def strip_leading_titles(prs: Presentation) -> int:
    removed = 0
    while len(prs.slides) > 1 and _looks_like_title_slide(prs.slides[0]):
        _delete_slide(prs, 0)
        removed += 1
        if removed >= 3:
            break
    return removed


def _blank_layout(prs: Presentation):
    for layout in prs.slide_layouts:
        name = (layout.name or "").lower()
        if "blank" in name:
            return layout
    return prs.slide_layouts[0]


def insert_title_slide(
    prs: Presentation,
    *,
    page: str | None,
    title: str,
    verses: int | None,
) -> None:
    layout = _blank_layout(prs)
    slide = prs.slides.add_slide(layout)

    slide_w = prs.slide_width
    slide_h = prs.slide_height

    # White background matching the native canvas size
    background = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, slide_w, slide_h)
    background.fill.solid()
    background.fill.fore_color.rgb = RGBColor(255, 255, 255)
    background.line.fill.background()

    margin = int(slide_w * 0.06)
    box_w = slide_w - 2 * margin

    def add_centered(text: str, top: int, size_pt: int, bold: bool = False) -> None:
        box = slide.shapes.add_textbox(margin, top, box_w, int(slide_h * 0.16))
        tf = box.text_frame
        tf.word_wrap = True
        p = tf.paragraphs[0]
        p.alignment = PP_ALIGN.CENTER
        run = p.add_run()
        run.text = text
        run.font.size = Pt(size_pt)
        run.font.bold = bold
        run.font.color.rgb = RGBColor(0, 0, 0)
        run.font.name = "Times New Roman"

    mid = int(slide_h * 0.42)
    if page:
        add_centered(page, mid - int(slide_h * 0.14), 44, bold=False)
        add_centered(f'"{title}"', mid, 32, bold=False)
    else:
        add_centered(f'"{title}"', mid - int(slide_h * 0.04), 32, bold=False)

    if verses and verses > 0:
        label = "1 verse" if verses == 1 else f"{verses} verses"
        add_centered(label, int(slide_h * 0.78), 16, bold=False)

    # Move new slide to index 0 (single element move — avoid duplicate rIds)
    sld_id_lst = prs.slides._sldIdLst  # noqa: SLF001
    slides = list(sld_id_lst)
    last = slides[-1]
    sld_id_lst.remove(last)
    sld_id_lst.insert(0, last)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("input")
    ap.add_argument("output")
    ap.add_argument("--page", default="")
    ap.add_argument("--title", required=True)
    ap.add_argument("--verses", type=int, default=0)
    args = ap.parse_args()

    src = Path(args.input)
    dst = Path(args.output)
    if not src.exists():
        print(f"missing {src}", file=sys.stderr)
        return 1

    prs = Presentation(str(src))
    # Keep native slide size (typically ~10" × 5.63"). Never call set_slide_size.
    removed = strip_leading_titles(prs)
    insert_title_slide(
        prs,
        page=args.page.strip() or None,
        title=args.title.strip(),
        verses=args.verses if args.verses > 0 else None,
    )
    dst.parent.mkdir(parents=True, exist_ok=True)
    prs.save(str(dst))
    print(
        f"ok removed_titles={removed} slides={len(prs.slides)} "
        f"size={float(prs.slide_width)/914400:.2f}x{float(prs.slide_height)/914400:.2f}in -> {dst}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
