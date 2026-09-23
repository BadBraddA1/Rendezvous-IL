import { PDFDocument, StandardFonts, rgb } from "pdf-lib"

/** Landscape 16:9 title card (matches SFP slide aspect). */
const TITLE_WIDTH = 1920
const TITLE_HEIGHT = 1080

/**
 * Prepend a dark title slide (page · name) to a song PDF.
 * Idempotent marker in the title page metadata via Producer string.
 */
export async function prependSongTitleSlide(
  pdfBytes: Uint8Array | ArrayBuffer,
  title: string,
): Promise<Uint8Array> {
  const source = await PDFDocument.load(pdfBytes)
  const pages = source.getPages()
  if (pages[0]) {
    const { width, height } = pages[0].getSize()
    // Already has our 16:9 title card
    if (Math.abs(width - TITLE_WIDTH) < 1 && Math.abs(height - TITLE_HEIGHT) < 1) {
      return pdfBytes instanceof Uint8Array ? pdfBytes : new Uint8Array(pdfBytes)
    }
  }

  const out = await PDFDocument.create()
  out.setProducer("ren-song-title-slide")
  out.setTitle(title)

  const page = out.addPage([TITLE_WIDTH, TITLE_HEIGHT])
  page.drawRectangle({
    x: 0,
    y: 0,
    width: TITLE_WIDTH,
    height: TITLE_HEIGHT,
    color: rgb(0.08, 0.14, 0.18),
  })

  const font = await out.embedFont(StandardFonts.HelveticaBold)
  const display = title.trim() || "Song"
  const maxWidth = TITLE_WIDTH - 160
  let fontSize = 72
  while (fontSize > 36 && font.widthOfTextAtSize(display, fontSize) > maxWidth) {
    fontSize -= 4
  }
  const textWidth = font.widthOfTextAtSize(display, fontSize)
  page.drawText(display, {
    x: (TITLE_WIDTH - textWidth) / 2,
    y: TITLE_HEIGHT / 2 - fontSize / 3,
    size: fontSize,
    font,
    color: rgb(0.95, 0.96, 0.94),
  })

  const copied = await out.copyPages(source, source.getPageIndices())
  for (const p of copied) out.addPage(p)

  return out.save()
}
