import { getPublicSchedule } from "@/lib/event-schedule"
import { getScheduleMeta } from "@/lib/schedule-meta"
import { ScheduleClient } from "./schedule-client"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Schedule | Rendezvous IL",
  description: "Daily schedule for Rendezvous at Lake Williamson Christian Center.",
}

const EVENT_YEAR = 2027

export default async function SchedulePage() {
  const [{ days }, meta] = await Promise.all([
    getPublicSchedule(EVENT_YEAR),
    getScheduleMeta(EVENT_YEAR),
  ])

  return (
    <ScheduleClient
      year={EVENT_YEAR}
      dateRangeLabel={meta.dateRange}
      location={meta.location}
      draftNotice={meta.draftNotice}
      days={days}
    />
  )
}
