// Canonical schedule data - imported by:
//   - /schedule/print (printable HTML page)
//   - /api/schedule/pdf (PDF generator)
//   - /live-updates (the TV "Live Updates" page, via LU_SCHEDULE_ITEMS below)
// Update this file ONLY so the four outputs never drift.
// Source of truth must match the onscreen copy on /schedule (app/schedule/page.tsx).

export type ScheduleEvent = {
  time: string
  title: string
  location?: string
  note?: string
}

export type ScheduleDay = {
  day: string
  date: string
  /** Tailwind/theme color name used for the day badge on the print page */
  color: "secondary" | "primary" | "foreground"
  events: ScheduleEvent[]
}

export const scheduleData: ScheduleDay[] = [
  {
    day: "Monday",
    date: "May 4",
    color: "secondary",
    events: [
      {
        time: "1:00 – 5:15 PM",
        title: "Check-in",
        location: "Activity Center (AC) [upstairs outside Room 207]",
        note: "Mini-fridge available in AC Room 205. Use this time for setting up RVs & tents, settling into motel rooms, and for visiting.",
      },
      { time: "4:00 – 5:00 PM", title: "Ice Breaker", location: "AC Room 205/206" },
      {
        time: "5:30 PM",
        title: "Dinner",
        location: "Lakeside Dining Room",
        note: "Please gather outside for a prayer prior to each designated meal time",
      },
      {
        time: "7:00 PM",
        title: "Evening assembly, welcome, family introductions, & announcements",
        location: "AC Room 207",
      },
      {
        time: "8:00 PM",
        title: "Black-light Dodgeball, Bombardment, & Steal the Bacon",
        location: "Activity Center",
        note: "Recommended: small children (under 10) wear light colored clothing",
      },
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
      {
        time: "10:00 – 11:30 AM",
        title: "Young Adult session",
        location: "AC Ping Pong Room",
        note: "Non-parent graduates",
      },
      {
        time: "10:00 – 11:30 AM",
        title: "Mom's session",
        location: "AC Room 207",
        note: "Free time for everyone else; black-light activities & nine square",
      },
      {
        time: "10:00 – 11:30 AM",
        title: "Miniature Painting",
        location: "Activity Center",
        note: "Pre-registration required",
      },
      { time: "12:00 PM", title: "Lunch", location: "Lakeside Dining Room" },
      {
        time: "1:30 PM",
        title: "Archery, Obstacle course, & rope games",
        location: "Outdoor",
        note: "Tug of War / Kajabe Cancan / Hoosker Doosker",
      },
      { time: "3:30 PM", title: "Kids' movie", location: "AC Room 207" },
      { time: "3:30 PM", title: "Human Foosball", location: "Human Foosball Court" },
      { time: "5:30 PM", title: "Dinner", location: "Lakeside Dining Room" },
      { time: "7:00 PM", title: "Evening assembly & announcements", location: "AC Room 207" },
      { time: "8:00 PM", title: "Main gym time & table games", location: "Activity Center" },
      {
        time: "8:00 – 10:00 PM",
        title: "Indoor pool time for females",
        location: "Pool",
        note: "Female lifeguard – bring your own towel",
      },
    ],
  },
  {
    day: "Wednesday",
    date: "May 6",
    color: "foreground",
    events: [
      { time: "7:30 AM", title: "Breakfast", location: "Lakeside Dining Room" },
      {
        time: "9:00 AM",
        title: "Morning assembly, group picture, & announcements",
        location: "AC Room 207",
      },
      {
        time: "10:00 AM",
        title: "Dad's session",
        location: "AC Room 207",
        note: "Free time for everyone else; black-light activities & nine square",
      },
      { time: "12:00 PM", title: "Lunch", location: "Lakeside Dining Room" },
      { time: "1:30 PM", title: "Kickball", location: "Rec Field" },
      { time: "2:30 PM", title: "Gaga Ball Tournament", location: "Outdoor" },
      { time: "3:30 PM", title: "Kids' movie & craft (Painting rocks)", location: "AC Room 207" },
      { time: "3:30 PM", title: "Disc golf", location: "Begins behind Activity Center" },
      { time: "5:30 PM", title: "Dinner", location: "Lakeside Dining Room" },
      {
        time: "7:00 PM",
        title: "Evening assembly & announcements",
        location: "Room 207 at the Activity Center",
      },
      { time: "8:00 PM", title: "Main gym time & table games", location: "Activity Center" },
      {
        time: "8:00 – 10:00 PM",
        title: "Indoor pool time for males",
        location: "Pool",
        note: "Male lifeguard – bring your own towel",
      },
    ],
  },
  {
    day: "Thursday",
    date: "May 7",
    color: "primary",
    events: [
      { time: "7:30 AM", title: "Breakfast", location: "Lakeside Dining Room" },
      { time: "9:00 AM", title: "Morning assembly & announcements", location: "AC Room 207" },
      {
        time: "10:00 AM",
        title: "Bible bowl",
        location: "AC Room 207",
        note: "Everyone is encouraged to participate",
      },
      { time: "10:20 AM", title: "Ping Pong tournament", location: "Activity Center" },
      { time: "12:00 PM", title: "Lunch", location: "Lakeside Dining Room" },
      { time: "1:30 – 3:30 PM", title: "Paddle boats & canoes", location: "Beachfront" },
      {
        time: "3:00 – 5:00 PM",
        title: "Miniature Painting",
        location: "Activity Center",
        note: "Pre-registration required",
      },
      { time: "3:30 PM", title: "Kids' movie", location: "AC Room 207" },
      {
        time: "3:30 PM",
        title: "Billiards & air hockey tournaments",
        location: "Activity Center",
        note: "Finish up any other tourneys if needed",
      },
      {
        time: "5:30 PM",
        title: "Cookout by the lake",
        location: "Lakeside",
        note: "Weather permitting",
      },
      { time: "6:30 PM", title: "Hayrides", location: "Starting by the lake" },
      {
        time: "7:00 PM",
        title: "Evening assembly & announcements",
        location: "Bonfire",
        note: "No song books or projector",
      },
      {
        time: "8:00 PM",
        title: "Glow-in-the-Dark Capture the Flag",
        location: "Rec Field",
        note: "2 simultaneous games",
      },
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
      {
        time: "9:00 AM",
        title: "Morning assembly, Bible bowl awards, & brainstorming for next year",
        location: "AC Room 207",
      },
      {
        time: "10:30 AM",
        title: "Pack up & clean up lodging areas",
        note: "Return motel keys to meeting room by 11:30 AM",
      },
      {
        time: "12:00 PM",
        title: "Lunch & depart for home",
        location: "Lakeside Dining Room",
      },
    ],
  },
]

// ---------------------------------------------------------------------------
// LU (Live Updates) schedule
// ---------------------------------------------------------------------------
// The TV "Live Updates" page needs each event broken down with a concrete date,
// numeric start/end hour & minute, and an isMeal flag. Rather than maintain a
// second hand-written copy, we derive it from `scheduleData` above so changes
// to the printable / PDF schedule automatically flow to the LU page.
//
// We also append per-night "Good Night!" entries so that after the last real
// event of the evening the LU's "Up Next" gracefully shows a warm sign-off
// instead of jumping straight to tomorrow morning's breakfast.

export interface LUScheduleItem {
  date: string // YYYY-MM-DD in America/Chicago
  day: string
  time: string
  startHour: number
  startMinute: number
  endHour?: number
  endMinute?: number
  title: string
  location?: string
  isMeal?: boolean
}

const DAY_TO_DATE: Record<string, string> = {
  Monday: "2026-05-04",
  Tuesday: "2026-05-05",
  Wednesday: "2026-05-06",
  Thursday: "2026-05-07",
  Friday: "2026-05-08",
}

/** Parse a single time chunk like "5:30 PM", "10", "10:00 AM". */
function parseClockChunk(
  raw: string,
  fallbackAmPm?: "AM" | "PM",
): { hour: number; minute: number; amPm: "AM" | "PM" } {
  const m = raw.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/i)
  if (!m) throw new Error(`Cannot parse time chunk: "${raw}"`)
  let hour = parseInt(m[1], 10)
  const minute = m[2] ? parseInt(m[2], 10) : 0
  const amPm = ((m[3] || fallbackAmPm || "PM").toUpperCase()) as "AM" | "PM"
  if (amPm === "PM" && hour < 12) hour += 12
  if (amPm === "AM" && hour === 12) hour = 0
  return { hour, minute, amPm }
}

/** Parse a schedule time string like "5:30 PM", "1:00 – 5:15 PM", "10:00 – 11:30 AM". */
function parseTimeString(time: string): {
  startHour: number
  startMinute: number
  endHour?: number
  endMinute?: number
} {
  // Normalize en/em dashes and hyphens to a single splitter
  const normalized = time.replace(/\s+/g, " ").trim()
  const parts = normalized.split(/\s*[–—-]\s*/)
  if (parts.length === 2) {
    const end = parseClockChunk(parts[1])
    // Start may omit AM/PM and inherit from end (e.g. "1:00 – 5:15 PM").
    const start = parseClockChunk(parts[0], end.amPm)
    return {
      startHour: start.hour,
      startMinute: start.minute,
      endHour: end.hour,
      endMinute: end.minute,
    }
  }
  const single = parseClockChunk(parts[0])
  return { startHour: single.hour, startMinute: single.minute }
}

function detectIsMeal(title: string): boolean {
  return /\b(breakfast|lunch|dinner|cookout)\b/i.test(title)
}

function formatTimeForDisplay(hour: number, minute: number): string {
  const ampm = hour >= 12 ? "PM" : "AM"
  const displayH = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
  const mm = String(minute).padStart(2, "0")
  return `${displayH}:${mm} ${ampm}`
}

// Synthetic end-of-day entries so the LU schedule has a graceful sign-off after
// the last real activity each evening. Friday is omitted because the event ends
// at lunch and people are heading home.
const GOOD_NIGHT_ENTRIES: Array<{ date: string; day: string; startHour: number; startMinute: number }> = [
  // Monday: last real event is 9:00 PM Nine Square (default 60-min ends 10 PM)
  { date: "2026-05-04", day: "Monday", startHour: 22, startMinute: 0 },
  // Tuesday: pool runs until 10 PM
  { date: "2026-05-05", day: "Tuesday", startHour: 22, startMinute: 15 },
  // Wednesday: pool runs until 10 PM
  { date: "2026-05-06", day: "Wednesday", startHour: 22, startMinute: 15 },
  // Thursday: Racquetball Court Singing starts at 10 PM (default 60-min ends 11 PM)
  { date: "2026-05-07", day: "Thursday", startHour: 23, startMinute: 0 },
]

export const LU_SCHEDULE_ITEMS: LUScheduleItem[] = (() => {
  const items: LUScheduleItem[] = []
  for (const day of scheduleData) {
    const dateISO = DAY_TO_DATE[day.day]
    if (!dateISO) continue
    for (const ev of day.events) {
      const parsed = parseTimeString(ev.time)
      items.push({
        date: dateISO,
        day: day.day,
        time: ev.time,
        startHour: parsed.startHour,
        startMinute: parsed.startMinute,
        endHour: parsed.endHour,
        endMinute: parsed.endMinute,
        title: ev.title,
        location: ev.location,
        isMeal: detectIsMeal(ev.title),
      })
    }
  }
  for (const gn of GOOD_NIGHT_ENTRIES) {
    items.push({
      date: gn.date,
      day: gn.day,
      time: formatTimeForDisplay(gn.startHour, gn.startMinute),
      startHour: gn.startHour,
      startMinute: gn.startMinute,
      // Run through to just before midnight so it stays the active "now" event
      endHour: 23,
      endMinute: 59,
      title: "Good Night!",
      location: "See you tomorrow!",
    })
  }
  // Sort chronologically so the LU's linear scan still works correctly
  items.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date)
    const am = a.startHour * 60 + a.startMinute
    const bm = b.startHour * 60 + b.startMinute
    return am - bm
  })
  return items
})()
