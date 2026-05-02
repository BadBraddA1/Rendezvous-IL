import { jsPDF } from "jspdf"

// Schedule data - same as print page
const scheduleData = [
  {
    day: "Monday",
    date: "May 4",
    events: [
      { time: "1:00 – 5:15 PM", title: "Check-in", location: "Activity Center (AC) [upstairs outside Room 207]", note: "Mini-fridge available in AC Room 205. Use this time for setting up RVs & tents, settling into motel rooms, and for visiting." },
      { time: "4:00 – 5:00 PM", title: "Ice Breaker", location: "AC Room 205/206", note: "Take-A-Hike Game or similar" },
      { time: "5:30 PM", title: "Dinner", location: "Lakeside Dining Room", note: "Please gather outside for a prayer prior to each designated meal time" },
      { time: "7:00 PM", title: "Evening assembly, welcome, family introductions, & announcements", location: "AC Room 207" },
      { time: "8:00 PM", title: "Black-light Dodgeball, Bombardment, & Steal the Bacon", location: "Activity Center", note: "Recommended: small children (under 10) wear light colored clothing" },
      { time: "9:00 PM", title: "Nine Square & Knockout", location: "Activity Center" },
    ],
  },
  {
    day: "Tuesday",
    date: "May 5",
    events: [
      { time: "7:30 AM", title: "Breakfast", location: "Lakeside Dining Room" },
      { time: "9:00 AM", title: "Morning assembly & announcements", location: "AC Room 207" },
      { time: "10:00 AM", title: "Young Adult session", location: "AC Ping Pong Room", note: "Non-parent graduates" },
      { time: "10:00 AM", title: "Mom's session", location: "AC Room 207", note: "Free time for everyone else; black-light activities & nine square" },
      { time: "12:00 PM", title: "Lunch", location: "Lakeside Dining Room" },
      { time: "1:30 PM", title: "Archery, Obstacle course, & rope games", location: "Outdoor", note: "Tug of War / Kajabe Cancan / Hoosker Doosker" },
      { time: "3:30 PM", title: "Kids' movie", location: "AC Room 207" },
      { time: "3:30 PM", title: "Human Foosball", location: "Human Foosball Court" },
      { time: "5:30 PM", title: "Dinner", location: "Lakeside Dining Room" },
      { time: "7:00 PM", title: "Evening assembly & announcements", location: "AC Room 207" },
      { time: "8:00 PM", title: "Main gym time & table games", location: "Activity Center" },
      { time: "8:00 – 10:00 PM", title: "Indoor pool time for females", location: "Pool", note: "Female lifeguard – bring your own towel" },
    ],
  },
  {
    day: "Wednesday",
    date: "May 6",
    events: [
      { time: "7:30 AM", title: "Breakfast", location: "Lakeside Dining Room" },
      { time: "9:00 AM", title: "Morning assembly, group picture, & announcements", location: "AC Room 207" },
      { time: "10:00 AM", title: "Dad's session", location: "AC Room 207", note: "Free time for everyone else; black-light activities & nine square" },
      { time: "12:00 PM", title: "Lunch", location: "Lakeside Dining Room" },
      { time: "1:30 PM", title: "Kickball", location: "Rec Field" },
      { time: "2:30 PM", title: "Scrabble Tournament", location: "AC Room 205/206" },
      { time: "2:30 PM", title: "Gaga Ball Tournament", location: "Outdoor" },
      { time: "3:30 PM", title: "Kids' movie & craft (Painting rocks)", location: "AC Room 207" },
      { time: "3:30 PM", title: "Disc golf", location: "Begins behind Activity Center" },
      { time: "5:30 PM", title: "Dinner", location: "Lakeside Dining Room" },
      { time: "7:00 PM", title: "Evening assembly & announcements", location: "AC Room 207" },
      { time: "8:00 PM", title: "Main gym time & table games", location: "Activity Center" },
      { time: "8:00 – 10:00 PM", title: "Indoor pool time for males", location: "Pool", note: "Male lifeguard – bring your own towel" },
    ],
  },
  {
    day: "Thursday",
    date: "May 7",
    events: [
      { time: "7:30 AM", title: "Breakfast", location: "Lakeside Dining Room" },
      { time: "9:00 AM", title: "Morning assembly & announcements", location: "AC Room 207" },
      { time: "10:00 AM", title: "Bible bowl", location: "AC Room 207", note: "Everyone is encouraged to participate" },
      { time: "10:20 AM", title: "Ping Pong tournament", location: "Activity Center" },
      { time: "12:00 PM", title: "Lunch", location: "Lakeside Dining Room" },
      { time: "1:30 – 3:30 PM", title: "Paddle boats & canoes", location: "Beachfront" },
      { time: "3:30 PM", title: "Kids' movie", location: "AC Room 207" },
      { time: "3:30 PM", title: "Billiards & air hockey tournaments", location: "Activity Center", note: "Finish up any other tourneys if needed" },
      { time: "5:30 PM", title: "Cookout by the lake", location: "Lakeside", note: "Weather permitting" },
      { time: "6:30 PM", title: "Hayrides", location: "Starting by the lake" },
      { time: "7:00 PM", title: "Evening assembly & announcements", location: "Bonfire", note: "No song books or projector" },
      { time: "8:00 PM", title: "Glow-in-the-Dark Capture the Flag", location: "Rec Field", note: "2 simultaneous games" },
      { time: "9:00 PM", title: "Adult/Teen Volleyball", location: "Activity Center" },
    ],
  },
  {
    day: "Friday",
    date: "May 8",
    events: [
      { time: "7:30 AM", title: "Breakfast", location: "Lakeside Dining Room" },
      { time: "9:00 AM", title: "Morning assembly, Bible bowl awards, & brainstorming for next year", location: "AC Room 207" },
      { time: "10:30 AM", title: "Pack up & clean up lodging areas", note: "Return motel keys to meeting room by 11:30 AM" },
      { time: "12:00 PM", title: "Lunch & depart for home", location: "Lakeside Dining Room" },
    ],
  },
]

export async function GET() {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 15
  const contentWidth = pageWidth - margin * 2
  let yPos = 20

  // Helper to add new page if needed
  const checkPageBreak = (neededSpace: number) => {
    if (yPos + neededSpace > 270) {
      doc.addPage()
      yPos = 20
    }
  }

  // Header
  doc.setFontSize(22)
  doc.setFont("helvetica", "bold")
  doc.text("Rendezvous 2026 Schedule", pageWidth / 2, yPos, { align: "center" })
  yPos += 8

  doc.setFontSize(12)
  doc.setFont("helvetica", "normal")
  doc.text("May 4-8, 2026", pageWidth / 2, yPos, { align: "center" })
  yPos += 6

  doc.setFontSize(10)
  doc.setTextColor(100)
  doc.text("Lake Williamson Christian Center, Carlinville, IL", pageWidth / 2, yPos, { align: "center" })
  doc.setTextColor(0)
  yPos += 12

  // Line under header
  doc.setLineWidth(0.5)
  doc.line(margin, yPos, pageWidth - margin, yPos)
  yPos += 10

  // Schedule by day
  scheduleData.forEach((day) => {
    checkPageBreak(30)

    // Day header
    doc.setFontSize(14)
    doc.setFont("helvetica", "bold")
    doc.text(`${day.date} (${day.day})`, margin, yPos)
    yPos += 2
    doc.setLineWidth(0.2)
    doc.line(margin, yPos, pageWidth - margin, yPos)
    yPos += 8

    // Events
    day.events.forEach((event) => {
      const eventLines = doc.splitTextToSize(event.title, contentWidth - 45)
      const locationLines = event.location ? doc.splitTextToSize(event.location, contentWidth - 45) : []
      const noteLines = event.note ? doc.splitTextToSize(event.note, contentWidth - 45) : []
      const totalLines = eventLines.length + locationLines.length + noteLines.length
      const neededSpace = totalLines * 5 + 6

      checkPageBreak(neededSpace)

      // Time
      doc.setFontSize(9)
      doc.setFont("helvetica", "bold")
      doc.text(event.time, margin, yPos)

      // Event title
      doc.setFont("helvetica", "normal")
      doc.text(eventLines, margin + 40, yPos)
      yPos += eventLines.length * 4

      // Location
      if (event.location) {
        doc.setFontSize(8)
        doc.setTextColor(80)
        doc.text(locationLines, margin + 40, yPos)
        yPos += locationLines.length * 3.5
      }

      // Note
      if (event.note) {
        doc.setFontSize(8)
        doc.setTextColor(120)
        doc.setFont("helvetica", "italic")
        doc.text(noteLines, margin + 40, yPos)
        doc.setFont("helvetica", "normal")
        yPos += noteLines.length * 3.5
      }

      doc.setTextColor(0)
      yPos += 4
    })

    yPos += 6
  })

  // Footer
  checkPageBreak(20)
  doc.setFontSize(8)
  doc.setTextColor(100)
  doc.text("Rendezvous 2026 - Lake Williamson Christian Center - Carlinville, IL", pageWidth / 2, 285, { align: "center" })

  // Generate PDF as array buffer
  const pdfBuffer = doc.output("arraybuffer")

  return new Response(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": "attachment; filename=rendezvous-2026-schedule.pdf",
    },
  })
}
