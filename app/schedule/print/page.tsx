import { Download } from "lucide-react"
import { scheduleData } from "@/lib/schedule-data"
import { MainContent } from "@/components/main-content"

export default function PrintableSchedulePage() {
  return (
    <MainContent className="min-h-screen bg-background text-foreground">
      {/* Print button - hidden when printing */}
      <div className="fixed top-4 right-4 z-50 print:hidden">
        <a
          href="/api/schedule/pdf"
          download="rendezvous-2027-schedule.pdf"
          className="focus-ring flex min-h-11 items-center gap-2 rounded-lg bg-primary px-4 py-2 text-primary-foreground shadow-lg transition-colors hover:bg-primary/90"
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          Download PDF
        </a>
      </div>

      {/* Back link - hidden when printing */}
      <div className="fixed top-4 left-4 z-50 print:hidden">
        <a
          href="/schedule"
          className="focus-ring flex min-h-11 items-center gap-2 rounded-lg bg-muted px-4 py-2 text-muted-foreground shadow-lg transition-colors hover:bg-muted/80"
        >
          &larr; Back to Schedule
        </a>
      </div>

      {/* Printable content */}
      <div className="mx-auto max-w-4xl p-8 print:max-w-none print:p-4">
        <header className="mb-8 border-b-2 border-foreground pb-4 text-center print:mb-6">
          <h1 className="text-3xl font-bold print:text-2xl">Rendezvous 2027 Schedule</h1>
          <p className="mt-1 text-lg text-muted-foreground print:text-base">May 3-7, 2027</p>
          <p className="text-sm text-muted-foreground print:text-sm">
            Lake Williamson Christian Center, Carlinville, IL
          </p>
        </header>

        <div className="space-y-8 print:space-y-4">
          {scheduleData.map((day) => (
            <section key={day.day} className="print:break-inside-avoid-page">
              <div className="mb-4 flex items-center gap-3 border-b border-border pb-2 print:mb-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-foreground text-lg font-bold text-background print:h-8 print:w-8 print:text-base">
                  {day.day.charAt(0)}
                </div>
                <div>
                  <h2 className="text-xl font-bold print:text-lg">
                    {day.date} ({day.day})
                  </h2>
                </div>
              </div>

              <table className="w-full text-sm print:text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="w-32 py-2 pr-4 text-left font-semibold text-foreground print:w-24">Time</th>
                    <th className="py-2 pr-4 text-left font-semibold text-foreground">Event</th>
                    <th className="w-40 py-2 text-left font-semibold text-foreground print:w-32">Location</th>
                  </tr>
                </thead>
                <tbody>
                  {day.events.map((event, index) => (
                    <tr key={index} className="border-b border-border/60 print:break-inside-avoid">
                      <td className="whitespace-nowrap py-2 pr-4 align-top text-muted-foreground">{event.time}</td>
                      <td className="py-2 pr-4 align-top">
                        <span className="font-medium text-foreground">{event.title}</span>
                        {event.note && (
                          <span className="mt-0.5 block text-xs italic text-muted-foreground">{event.note}</span>
                        )}
                      </td>
                      <td className="py-2 align-top text-muted-foreground">{event.location}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ))}
        </div>

        <footer className="mt-8 border-t border-border pt-4 text-center text-xs text-muted-foreground print:mt-4">
          <p>Rendezvous 2027 &bull; Lake Williamson Christian Center &bull; Carlinville, IL</p>
          <p className="mt-1">Visit rendezvousil.com for live updates and announcements</p>
        </footer>
      </div>
    </MainContent>
  )
}
