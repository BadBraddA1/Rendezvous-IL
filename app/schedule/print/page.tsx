import { Download } from "lucide-react"
import { scheduleData } from "@/lib/schedule-data"

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
