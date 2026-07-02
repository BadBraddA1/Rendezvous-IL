import { getPublicSchedule } from "@/lib/event-schedule"
import { ScheduleClient } from "./schedule-client"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Schedule | Rendezvous IL",
  description: "Daily schedule for Rendezvous at Lake Williamson Christian Center.",
}

const EVENT_YEAR = 2027

function dateRangeLabel(days: { dateLabel: string }[], year: number): string {
  if (days.length === 0) return String(year)
  const first = days[0].dateLabel
  const last = days[days.length - 1].dateLabel
  const [firstMonth] = first.split(" ")
  const [lastMonth, lastDay] = last.split(" ")
  if (firstMonth === lastMonth) return `${first}–${lastDay}, ${year}`
  return `${first} – ${last}, ${year}`
}

export default async function SchedulePage() {
  const { days } = await getPublicSchedule(EVENT_YEAR)

  return (
    <ScheduleClient
      year={EVENT_YEAR}
      dateRangeLabel={dateRangeLabel(days, EVENT_YEAR)}
      days={days}
    />
  )
}
