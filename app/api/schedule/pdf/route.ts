import { jsPDF } from "jspdf"
import { getPublicSchedule } from "@/lib/event-schedule"

export const dynamic = "force-dynamic"

export async function GET() {
  const { days } = await getPublicSchedule(2027)
  const doc = new jsPDF({ unit: "mm", format: "letter" })

  // Page geometry
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 15
  const contentWidth = pageWidth - margin * 2
  const bottomLimit = pageHeight - 18 // leave room for footer

  // Layout columns
  const timeColX = margin
  const timeColWidth = 32
  const titleColX = margin + timeColWidth + 2
  const titleColWidth = contentWidth - timeColWidth - 2

  let yPos = 18

  // Helper to add new page when needed (with running running header on subsequent pages)
  const checkPageBreak = (neededSpace: number) => {
    if (yPos + neededSpace > bottomLimit) {
      doc.addPage()
      yPos = 18
    }
  }

  // === Header ===
  doc.setFont("helvetica", "bold")
  doc.setFontSize(22)
  doc.text("Rendezvous 2027 Schedule", pageWidth / 2, yPos, { align: "center" })
  yPos += 8

  doc.setFont("helvetica", "normal")
  doc.setFontSize(12)
  doc.text("May 3-7, 2027", pageWidth / 2, yPos, { align: "center" })
  yPos += 6

  doc.setFontSize(10)
  doc.setTextColor(100)
  doc.text("Lake Williamson Christian Center, Carlinville, IL", pageWidth / 2, yPos, { align: "center" })
  doc.setTextColor(0)
  yPos += 8

  doc.setLineWidth(0.5)
  doc.line(margin, yPos, pageWidth - margin, yPos)
  yPos += 8

  // === Schedule by day ===
  days.forEach((day) => {
    checkPageBreak(20)

    // Day header
    doc.setFont("helvetica", "bold")
    doc.setFontSize(14)
    doc.text(`${day.dateLabel} (${day.day})`, margin, yPos)
    yPos += 2
    doc.setLineWidth(0.2)
    doc.line(margin, yPos, pageWidth - margin, yPos)
    yPos += 6

    // Events
    day.events.forEach((event) => {
      // Wrap text to fit columns
      doc.setFontSize(10)
      const titleLines = doc.splitTextToSize(event.title, titleColWidth)
      doc.setFontSize(9)
      const locationLines = event.location
        ? doc.splitTextToSize(event.location, titleColWidth)
        : []
      const noteLines = event.note ? doc.splitTextToSize(event.note, titleColWidth) : []

      // Compute height (line spacing is ~4mm for body, 3.5mm for sub)
      const titleHeight = titleLines.length * 4.2
      const locationHeight = locationLines.length * 3.6
      const noteHeight = noteLines.length * 3.6
      const blockHeight = titleHeight + locationHeight + noteHeight + 3

      checkPageBreak(blockHeight + 4)

      // Time (left column)
      doc.setFont("helvetica", "bold")
      doc.setFontSize(9)
      doc.setTextColor(40)
      const timeLines = doc.splitTextToSize(event.time, timeColWidth)
      doc.text(timeLines, timeColX, yPos + 3.2)

      // Title (right column)
      doc.setFont("helvetica", "normal")
      doc.setFontSize(10)
      doc.setTextColor(0)
      doc.text(titleLines, titleColX, yPos + 3.2)
      let lineY = yPos + 3.2 + titleHeight

      // Location
      if (locationLines.length) {
        doc.setFont("helvetica", "normal")
        doc.setFontSize(9)
        doc.setTextColor(80)
        doc.text(locationLines, titleColX, lineY)
        lineY += locationHeight
      }

      // Note (italic)
      if (noteLines.length) {
        doc.setFont("helvetica", "italic")
        doc.setFontSize(9)
        doc.setTextColor(120)
        doc.text(noteLines, titleColX, lineY)
        lineY += noteHeight
      }

      // Reset & advance
      doc.setFont("helvetica", "normal")
      doc.setTextColor(0)
      // The block consumed at most max(timeLines, lineY-yPos)
      const consumed = Math.max(lineY - yPos, timeLines.length * 4.2 + 3.2)
      yPos += consumed + 3
    })

    yPos += 4
  })

  // === Footer on each page ===
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(8)
    doc.setTextColor(100)
    doc.text(
      "Rendezvous 2027 - Lake Williamson Christian Center - Carlinville, IL",
      pageWidth / 2,
      pageHeight - 10,
      { align: "center" },
    )
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 10, { align: "right" })
  }

  const pdfBuffer = doc.output("arraybuffer")

  return new Response(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="rendezvous-2027-schedule.pdf"',
      "Cache-Control": "no-store",
    },
  })
}
