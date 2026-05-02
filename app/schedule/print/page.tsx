import { Download } from "lucide-react"

// Schedule data structure
const scheduleData = [
  {
    day: "Monday",
    date: "May 4",
    color: "secondary",
    events: [
      { time: "1:00 – 5:15 PM", title: "Check-in", location: "Activity Center (AC) [upstairs outside Room 207]", note: "Mini-fridge available in AC Room 205. Use this time for setting up RVs & tents, settling into motel rooms, and for visiting." },
      { time: "4:00 – 5:00 PM", title: "Ice Breaker", location: "AC Room 205/206" },
      { time: "5:30 PM", title: "Dinner", location: "Lakeside Dining Room", note: "Please gather outside for a prayer prior to each designated meal time" },
      { time: "7:00 PM", title: "Evening assembly, welcome, family introductions, & announcements", location: "AC Room 207" },
      { time: "8:00 PM", title: "Black-light Dodgeball, Bombardment, & Steal the Bacon", location: "Activity Center", note: "Recommended: small children (under 10) wear light colored clothing" },
      { time: "9:00 PM", title: "Nine Square & Knockout", location: "Activity Center" },
    ],
  },
  {
    day: "Tuesday",
    date: "May 5",
    color: "primary",
    events: [
      { time: "7:30 AM", title: "Breakfast", location: "Lakeside Dining Room" },
      { time: "9:00 AM", title: "Morning assembly & announcements", location: "AC Room 207" },
      { time: "10:00 – 11:30 AM", title: "Young Adult session", location: "AC Ping Pong Room", note: "Non-parent graduates" },
      { time: "10:00 – 11:30 AM", title: "Mom's session", location: "AC Room 207", note: "Free time for everyone else; black-light activities & nine square" },
      { time: "10:00 – 11:30 AM", title: "Miniature Painting", location: "Activity Center", note: "Pre-registration required" },
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
    color: "foreground",
    events: [
      { time: "7:30 AM", title: "Breakfast", location: "Lakeside Dining Room" },
      { time: "9:00 AM", title: "Morning assembly, group picture, & announcements", location: "AC Room 207" },
      { time: "10:00 AM", title: "Dad's session", location: "AC Room 207", note: "Free time for everyone else; black-light activities & nine square" },
      { time: "12:00 PM", title: "Lunch", location: "Lakeside Dining Room" },
      { time: "1:30 PM", title: "Kickball", location: "Rec Field" },
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
    color: "primary",
    events: [
      { time: "7:30 AM", title: "Breakfast", location: "Lakeside Dining Room" },
      { time: "9:00 AM", title: "Morning assembly & announcements", location: "AC Room 207" },
      { time: "10:00 AM", title: "Bible bowl", location: "AC Room 207", note: "Everyone is encouraged to participate" },
      { time: "10:20 AM", title: "Ping Pong tournament", location: "Activity Center" },
      { time: "12:00 PM", title: "Lunch", location: "Lakeside Dining Room" },
      { time: "1:30 – 3:30 PM", title: "Paddle boats & canoes", location: "Beachfront" },
      { time: "3:00 – 5:00 PM", title: "Miniature Painting", location: "Activity Center", note: "Pre-registration required" },
      { time: "3:30 PM", title: "Kids' movie", location: "AC Room 207" },
      { time: "3:30 PM", title: "Billiards & air hockey tournaments", location: "Activity Center", note: "Finish up any other tourneys if needed" },
      { time: "5:30 PM", title: "Cookout by the lake", location: "Lakeside", note: "Weather permitting" },
      { time: "6:30 PM", title: "Hayrides", location: "Starting by the lake" },
      { time: "7:00 PM", title: "Evening assembly & announcements", location: "Bonfire", note: "No song books or projector" },
      { time: "8:00 PM", title: "Glow-in-the-Dark Capture the Flag", location: "Rec Field", note: "2 simultaneous games" },
      { time: "9:00 PM", title: "Adult/Teen Volleyball", location: "Activity Center" },
      { time: "10:00 PM", title: "Racquetball Court Singing", location: "Activity Center" },
    ],
  },
  {
    day: "Friday",
    date: "May 8",
    color: "secondary",
    events: [
      { time: "7:30 AM", title: "Breakfast", location: "Lakeside Dining Room" },
      { time: "9:00 AM", title: "Morning assembly, Bible bowl awards, & brainstorming for next year", location: "AC Room 207" },
      { time: "10:30 AM", title: "Pack up & clean up lodging areas", note: "Return motel keys to meeting room by 11:30 AM" },
      { time: "12:00 PM", title: "Lunch & depart for home", location: "Lakeside Dining Room" },
    ],
  },
]

export default function PrintableSchedulePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Print button - hidden when printing */}
      <div className="fixed top-4 right-4 z-50">
        <a
          href="/api/schedule/pdf"
          download="rendezvous-2026-schedule.pdf"
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors shadow-lg"
        >
          <Download className="h-4 w-4" />
          Download PDF
        </a>
      </div>

      {/* Back link - hidden when printing */}
      <div className="print:hidden fixed top-4 left-4 z-50">
        <a
          href="/schedule"
          className="flex items-center gap-2 bg-muted text-muted-foreground px-4 py-2 rounded-lg hover:bg-muted/80 transition-colors shadow-lg"
        >
          &larr; Back to Schedule
        </a>
      </div>

      {/* Printable content */}
      <div className="max-w-4xl mx-auto p-8 print:p-4 print:max-w-none">
        {/* Header */}
        <header className="text-center mb-8 print:mb-6 border-b-2 border-gray-900 pb-4">
          <h1 className="text-3xl font-bold text-gray-900 print:text-2xl">Rendezvous 2026 Schedule</h1>
          <p className="text-lg text-gray-600 mt-1 print:text-base">May 4-8, 2026</p>
          <p className="text-gray-500 print:text-sm">Lake Williamson Christian Center, Carlinville, IL</p>
        </header>

        {/* Schedule by day */}
        <div className="space-y-8 print:space-y-4">
          {scheduleData.map((day) => (
            <section key={day.day} className="print:break-inside-avoid-page">
              {/* Day header */}
              <div className="flex items-center gap-3 mb-4 print:mb-2 border-b border-gray-300 pb-2">
                <div className="flex items-center justify-center w-10 h-10 print:w-8 print:h-8 rounded-full bg-gray-900 text-white font-bold text-lg print:text-base">
                  {day.day.charAt(0)}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 print:text-lg">{day.date} ({day.day})</h2>
                </div>
              </div>

              {/* Events table */}
              <table className="w-full text-sm print:text-xs">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 pr-4 font-semibold text-gray-700 w-32 print:w-24">Time</th>
                    <th className="text-left py-2 pr-4 font-semibold text-gray-700">Event</th>
                    <th className="text-left py-2 font-semibold text-gray-700 w-40 print:w-32">Location</th>
                  </tr>
                </thead>
                <tbody>
                  {day.events.map((event, index) => (
                    <tr key={index} className="border-b border-gray-100 print:break-inside-avoid">
                      <td className="py-2 pr-4 align-top text-gray-600 whitespace-nowrap">{event.time}</td>
                      <td className="py-2 pr-4 align-top">
                        <span className="font-medium text-gray-900">{event.title}</span>
                        {event.note && (
                          <span className="block text-gray-500 text-xs mt-0.5 italic">{event.note}</span>
                        )}
                      </td>
                      <td className="py-2 align-top text-gray-600">{event.location}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ))}
        </div>

        {/* Footer */}
        <footer className="mt-8 pt-4 border-t border-gray-300 text-center text-xs text-gray-500 print:mt-4">
          <p>Rendezvous 2026 &bull; Lake Williamson Christian Center &bull; Carlinville, IL</p>
          <p className="mt-1">Visit rendezvous-il.vercel.app for live updates and announcements</p>
        </footer>
      </div>
    </div>
  )
}
