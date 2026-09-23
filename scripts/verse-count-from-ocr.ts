/**
 * Prefer the “N verses” label on early title pages over OCR digit heuristics
 * (sheet music OCR often invents false verse numbers).
 */
export function verseCountFromTitleLabel(
  pages: { text?: string }[],
): number | null {
  for (const p of pages.slice(0, 3)) {
    const t = p.text || ""
    const m = t.match(/\b([1-9]|1[0-2])\s+verses?\b/i)
    if (m?.[1]) return Number(m[1])
  }
  return null
}
