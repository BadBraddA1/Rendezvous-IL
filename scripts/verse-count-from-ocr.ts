/**
 * Prefer the “N verses” label on early title pages over OCR digit heuristics
 * (sheet music OCR often invents false verse numbers).
 *
 * Sanity: label must fit music length (≤ page_count − 1). Fast-import sometimes
 * baked a wrong “N verses” onto our opener; later OCR just re-read that lie.
 */
export function verseCountFromTitleLabel(
  pages: { text?: string }[],
  pageCount?: number | null,
): number | null {
  for (const p of pages.slice(0, 3)) {
    const t = p.text || ""
    // Prefer short title-card pages (page # + quoted title + N verses).
    const m = t.match(/\b([1-9]|1[0-2])\s+verses?\b/i)
    if (!m?.[1]) continue
    const n = Number(m[1])
    if (!Number.isFinite(n) || n < 1 || n > 12) continue
    if (pageCount != null && pageCount > 1 && n > pageCount - 1) continue
    // Reject absurd “12 verses” on short songs unless page budget allows.
    if (n >= 8 && (pageCount == null || pageCount < 17)) continue
    return n
  }
  return null
}

/** Shape-note slides are often ~3–4 music pages per verse (after title). */
export function estimateVerseCountFromPages(pageCount: number): number {
  const music = Math.max(1, pageCount - 1)
  return Math.max(1, Math.min(6, Math.round(music / 4)))
}
