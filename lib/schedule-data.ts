// Canonical schedule data - imported by both the printable HTML page and the PDF API route.
// Update this file ONLY (not the print page or PDF route) so the two outputs never drift.
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
