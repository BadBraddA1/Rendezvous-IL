import { PDFDocument, StandardFonts, rgb } from "pdf-lib"

/** Match SFP music slide aspect (LibreOffice export of 16:9 PPTs). */
export const SFP_SLIDE_WIDTH = 720
export const SFP_SLIDE_HEIGHT = 405

/** Legacy dark title cards we used to prepend (strip these on upgrade). */
const LEGACY_TITLE_WIDTH = 1920
const LEGACY_TITLE_HEIGHT = 1080

export const TITLE_SLIDE_PRODUCER = "ren-song-title-slide-v2"

export function parseSongDisplayTitle(title: string): {
  pageNumber: string | null
  name: string
} {
  const trimmed = title.trim()
  const match = trimmed.match(/^(\d+)\s*[·.•]\s*(.+)$/)
  if (match?.[1] && match[2]) {
    return { pageNumber: match[1], name: match[2].trim() }
  }
  const spaced = trimmed.match(/^(\d+)\s+(.+)$/)
  if (spaced?.[1] && spaced[2]) {
    return { pageNumber: spaced[1], name: spaced[2].trim() }
  }
  return { pageNumber: null, name: trimmed || "Song" }
}

/** `-3vr` / `-4vr` in an SFP filename before cleanSongTitle strips it. */
export function extractVerseCountHint(raw: string): number | null {
  const match = raw.match(/-(\d+)vr\b/i)
  if (!match?.[1]) return null
  const n = Number(match[1])
  return Number.isFinite(n) && n >= 1 && n <= 12 ? n : null
}

function nearly(a: number, b: number, tol = 2): boolean {
  return Math.abs(a - b) < tol
}

/**
 * Our white openers (and many LibreOffice title cards) are exactly 720×405.
 * Music slides from the SFP PPT export are ~720×405.071 — keep tolerance
 * tight so we peel stacked openers without deleting sheet music.
 * (tol 0.5 was wrong: it matched music pages and would strip a whole song.)
 */
function isExactTitleSlideSize(
  width: number,
  height: number,
  slideW = SFP_SLIDE_WIDTH,
  slideH = SFP_SLIDE_HEIGHT,
): boolean {
  return nearly(width, slideW, 0.02) && nearly(height, slideH, 0.02)
}

/**
 * Drop legacy 1920×1080 dark title cards so we can replace them with the
 * native-looking white SFP opener (or keep a real SFP title that was underneath).
 */
export async function stripLegacyDarkTitleSlides(
  pdfBytes: Uint8Array | ArrayBuffer,
): Promise<Uint8Array> {
  const source = await PDFDocument.load(pdfBytes)
  const keep: number[] = []
  for (let i = 0; i < source.getPageCount(); i++) {
    const { width, height } = source.getPage(i).getSize()
    if (nearly(width, LEGACY_TITLE_WIDTH) && nearly(height, LEGACY_TITLE_HEIGHT)) {
      continue
    }
    keep.push(i)
  }
  if (keep.length === source.getPageCount()) {
    return pdfBytes instanceof Uint8Array ? pdfBytes : new Uint8Array(pdfBytes)
  }
  if (keep.length === 0) {
    return pdfBytes instanceof Uint8Array ? pdfBytes : new Uint8Array(pdfBytes)
  }
  const out = await PDFDocument.create()
  const copied = await out.copyPages(source, keep)
  for (const page of copied) out.addPage(page)
  return out.save()
}

/**
 * Remove leading exact title cards (ours and/or native openers) so a fresh
 * opener can be prepended without stacking.
 * Strips classic SFP 720×405 and any extra sizes passed in `alsoSizes`
 * (e.g. 960×540 for Sacred Songs / LibreOffice widescreen).
 */
export async function stripLeadingExactTitleSlides(
  pdfBytes: Uint8Array | ArrayBuffer,
  alsoSizes: Array<{ width: number; height: number }> = [],
): Promise<Uint8Array> {
  const source = await PDFDocument.load(pdfBytes)
  const sizes = [
    { width: SFP_SLIDE_WIDTH, height: SFP_SLIDE_HEIGHT },
    ...alsoSizes,
  ]
  let start = 0
  while (start < source.getPageCount()) {
    const { width, height } = source.getPage(start).getSize()
    const match = sizes.some((s) => isExactTitleSlideSize(width, height, s.width, s.height))
    if (!match) break
    start++
  }
  // Never delete the whole document — leave at least one page.
  if (start === 0) {
    return pdfBytes instanceof Uint8Array ? pdfBytes : new Uint8Array(pdfBytes)
  }
  if (start >= source.getPageCount()) {
    start = source.getPageCount() - 1
  }
  const out = await PDFDocument.create()
  const rest = await out.copyPages(
    source,
    source.getPageIndices().slice(start),
  )
  for (const page of rest) out.addPage(page)
  return out.save()
}

export async function countPdfPages(pdfBytes: Uint8Array | ArrayBuffer): Promise<number> {
  const doc = await PDFDocument.load(pdfBytes)
  return doc.getPageCount()
}

/**
 * Prepend a white SFP-style title slide (page number + quoted title), matching
 * songs like “2 / We Praise Thee, O God” in the Taylor Publications decks.
 *
 * Idempotent when the PDF already has a single exact-720×405 opener and the
 * caller is not forcing a rebuild. Always peels stacked exact-size title cards
 * (pdf-lib overwrites Producer, so we cannot rely on that marker).
 * Pass `force: true` to rebuild the opener even when one is already present.
 * Pass `hasNativeTitle: true` to only strip legacy cards (no new opener).
 */
export async function prependSongTitleSlide(
  pdfBytes: Uint8Array | ArrayBuffer,
  title: string,
  options: {
    verseCount?: number | null
    force?: boolean
    hasNativeTitle?: boolean
    /** Override opener size (default SFP 720×405). Match music pages for SSOC. */
    slideWidth?: number
    slideHeight?: number
  } = {},
): Promise<Uint8Array> {
  const slideW = options.slideWidth ?? SFP_SLIDE_WIDTH
  const slideH = options.slideHeight ?? SFP_SLIDE_HEIGHT

  const noDark = await stripLegacyDarkTitleSlides(pdfBytes)
  // Always peel classic SFP/mismatched openers (720×405).
  let stripped = await stripLeadingExactTitleSlides(noDark)

  // If we previously baked a matching-size opener (subject marker), peel exactly
  // one leading page. Do NOT peel music slides that share the same size.
  if (options.force) {
    const doc = await PDFDocument.load(stripped)
    const subject = doc.getSubject() || ""
    if (
      subject === TITLE_SLIDE_PRODUCER &&
      doc.getPageCount() >= 2
    ) {
      const first = doc.getPage(0).getSize()
      if (isExactTitleSlideSize(first.width, first.height, slideW, slideH)) {
        const out = await PDFDocument.create()
        const rest = await out.copyPages(doc, doc.getPageIndices().slice(1))
        for (const p of rest) out.addPage(p)
        stripped = await out.save()
      }
    }
  }

  const source = await PDFDocument.load(stripped)

  if (options.hasNativeTitle) {
    return stripped instanceof Uint8Array ? stripped : new Uint8Array(stripped)
  }

  const { pageNumber, name } = parseSongDisplayTitle(title)
  const out = await PDFDocument.create()
  out.setSubject(TITLE_SLIDE_PRODUCER)
  out.setTitle(title)

  const page = out.addPage([slideW, slideH])
  page.drawRectangle({
    x: 0,
    y: 0,
    width: slideW,
    height: slideH,
    color: rgb(1, 1, 1),
  })

  const font = await out.embedFont(StandardFonts.TimesRoman)
  const black = rgb(0, 0, 0)
  const maxWidth = slideW - 80
  const scale = Math.min(1.35, Math.max(1, slideW / SFP_SLIDE_WIDTH))

  if (pageNumber) {
    const numSize = Math.round(42 * scale)
    const numWidth = font.widthOfTextAtSize(pageNumber, numSize)
    page.drawText(pageNumber, {
      x: (slideW - numWidth) / 2,
      y: slideH / 2 + 28 * scale,
      size: numSize,
      font,
      color: black,
    })
  }

  const quoted = `"${name}"`
  let titleSize = Math.round(36 * scale)
  const minTitle = Math.round(20 * scale)
  while (titleSize > minTitle && font.widthOfTextAtSize(quoted, titleSize) > maxWidth) {
    titleSize -= 2
  }
  const titleWidth = font.widthOfTextAtSize(quoted, titleSize)
  page.drawText(quoted, {
    x: (slideW - titleWidth) / 2,
    y: pageNumber ? slideH / 2 - 18 * scale : slideH / 2 - titleSize / 3,
    size: titleSize,
    font,
    color: black,
  })

  const verses = options.verseCount
  if (verses && verses > 0) {
    const label = verses === 1 ? "1 verse" : `${verses} verses`
    const verseSize = Math.round(16 * scale)
    const verseWidth = font.widthOfTextAtSize(label, verseSize)
    page.drawText(label, {
      x: (slideW - verseWidth) / 2,
      y: 48 * scale,
      size: verseSize,
      font,
      color: rgb(0.25, 0.25, 0.25),
    })
  }

  const copied = await out.copyPages(source, source.getPageIndices())
  for (const p of copied) out.addPage(p)

  return out.save()
}
