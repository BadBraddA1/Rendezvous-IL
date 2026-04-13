// Location data for interactive map markers
// Coordinates are percentages (0-100) relative to the map image dimensions

export interface MapLocation {
  id: string
  name: string
  description: string
  x: number // percentage from left
  y: number // percentage from top
  category: "lodging" | "dining" | "activities" | "recreation" | "meeting"
}

export interface ScheduleEvent {
  id: string
  time: string
  title: string
  locationId: string
  day: string // "monday" | "tuesday" | "wednesday" | "thursday" | "friday"
  date: string // e.g., "May 4"
}

export const mapLocations: MapLocation[] = [
  // Lodging
  { id: "parkside-lodge", name: "Parkside Lodge", description: "Guest lodging", x: 35, y: 12, category: "lodging" },
  { id: "williamson-lodge", name: "Williamson Lodge", description: "Guest lodging", x: 52, y: 24, category: "lodging" },
  { id: "parkside-cottage", name: "Parkside Cottage", description: "Guest lodging", x: 42, y: 35, category: "lodging" },
  { id: "clark-hall", name: "Clark Hall", description: "Guest lodging", x: 65, y: 32, category: "lodging" },
  { id: "schneider-center", name: "Schneider Center", description: "The Lewis Room & The Clark Room", x: 82, y: 16, category: "lodging" },
  { id: "cottonwood-cabin", name: "Cottonwood Cabin", description: "Guest lodging", x: 88, y: 22, category: "lodging" },
  { id: "new-life-center", name: "New Life Center", description: "Guest lodging", x: 95, y: 14, category: "lodging" },
  { id: "lakeside-center", name: "Lakeside Center", description: "Guest lodging", x: 78, y: 72, category: "lodging" },
  { id: "hatchet-house", name: "Hatchet House", description: "Guest lodging near Eagle Crest Adventures", x: 62, y: 78, category: "lodging" },
  
  // Dining
  { id: "lakeside-dining", name: "Lakeside Dining Room", description: "Main dining facility", x: 52, y: 58, category: "dining" },
  { id: "connections-cafe", name: "Connections Cafe", description: "Cafe at Activities Center", x: 68, y: 16, category: "dining" },
  
  // Meeting Spaces
  { id: "activities-center", name: "Activities Center", description: "Guest Check-In, Front Desk, Meeting Rooms (Room 207)", x: 68, y: 20, category: "meeting" },
  { id: "auditorium", name: "Auditorium", description: "Main auditorium (A7)", x: 75, y: 32, category: "meeting" },
  { id: "chapel", name: "Chapel", description: "Chapel for worship services", x: 72, y: 55, category: "meeting" },
  { id: "cottonwood-pavilion", name: "Cottonwood Pavilion", description: "Covered outdoor meeting space", x: 58, y: 18, category: "meeting" },
  { id: "pavilion", name: "Pavilion", description: "Outdoor pavilion", x: 72, y: 10, category: "meeting" },
  
  // Recreation & Activities
  { id: "beachfront", name: "Beachfront", description: "Lake beach area", x: 12, y: 32, category: "recreation" },
  { id: "outdoor-pool", name: "Outdoor Pool", description: "Swimming pool", x: 15, y: 14, category: "recreation" },
  { id: "playground", name: "Playground", description: "Children's playground", x: 22, y: 14, category: "recreation" },
  { id: "bonfire-site", name: "Pavilions & Bonfire Site", description: "Gathering area for bonfires", x: 15, y: 18, category: "recreation" },
  { id: "mini-golf", name: "Mini Golf", description: "Mini golf course", x: 52, y: 10, category: "recreation" },
  { id: "gaga-ball", name: "GaGa Ball / 9 Square", description: "GaGa ball pit and 9 square", x: 55, y: 12, category: "recreation" },
  { id: "softball-diamond", name: "Softball Diamond", description: "Softball field", x: 45, y: 18, category: "recreation" },
  { id: "bocce-ball", name: "Bocce Ball", description: "Bocce ball courts", x: 38, y: 16, category: "recreation" },
  { id: "human-foosball", name: "Human Foosball", description: "Life-size foosball court", x: 38, y: 20, category: "recreation" },
  { id: "disc-golf", name: "Disc Golf Course", description: "Disc golf course start", x: 85, y: 10, category: "recreation" },
  { id: "archery", name: "Archery", description: "Archery range", x: 68, y: 6, category: "recreation" },
  { id: "outdoor-recreation", name: "Outdoor Recreation", description: "Various outdoor activities", x: 78, y: 10, category: "recreation" },
  
  // Activity Areas
  { id: "eagle-crest", name: "Eagle Crest Adventures", description: "High Ropes, Climbing Gym, Escape Rooms, Zipline", x: 55, y: 78, category: "activities" },
  { id: "amphitheater", name: "Amphitheater & Hiking Trails", description: "Outdoor amphitheater and trail access", x: 8, y: 6, category: "activities" },
  { id: "group-initiatives", name: "Group Initiatives", description: "Team building activities", x: 6, y: 14, category: "activities" },
  
  // Recreation Fields
  { id: "rec-field-1", name: "Recreation Field #1", description: "Open recreation field", x: 82, y: 42, category: "recreation" },
  { id: "rec-field-2", name: "Recreation Field #2", description: "Open recreation field", x: 95, y: 8, category: "recreation" },
  { id: "rec-field-3", name: "Recreation Field #3", description: "Open recreation field", x: 88, y: 8, category: "recreation" },
  { id: "rec-field-4", name: "Recreation Field #4", description: "Open recreation field", x: 42, y: 12, category: "recreation" },
  { id: "rec-field-5", name: "Recreation Field #5", description: "Open recreation field", x: 45, y: 24, category: "recreation" },
  
  // Other
  { id: "rv-park", name: "RV Park", description: "RV camping area", x: 25, y: 4, category: "lodging" },
  { id: "bus-stop", name: "Bus Stop Barn", description: "Transportation pickup", x: 62, y: 42, category: "activities" },
]

// Schedule events for each day - these will highlight locations when selected
export const scheduleEvents: ScheduleEvent[] = [
  // Monday, May 4
  { id: "mon-1", time: "4:00 – 6:00 PM", title: "Check-in & settle into rooms", locationId: "activities-center", day: "monday", date: "May 4" },
  { id: "mon-2", time: "6:00 PM", title: "Dinner", locationId: "lakeside-dining", day: "monday", date: "May 4" },
  { id: "mon-3", time: "7:00 PM", title: "Evening assembly & announcements", locationId: "activities-center", day: "monday", date: "May 4" },
  { id: "mon-4", time: "8:00 PM", title: "Main gym time & table games", locationId: "activities-center", day: "monday", date: "May 4" },
  { id: "mon-5", time: "8:00 – 10:00 PM", title: "Indoor pool time (females)", locationId: "activities-center", day: "monday", date: "May 4" },
  
  // Tuesday, May 5
  { id: "tue-1", time: "8:00 AM", title: "Breakfast", locationId: "lakeside-dining", day: "tuesday", date: "May 5" },
  { id: "tue-2", time: "9:00 AM", title: "Morning assembly & announcements", locationId: "activities-center", day: "tuesday", date: "May 5" },
  { id: "tue-3", time: "10:00 AM", title: "Young Adult session", locationId: "activities-center", day: "tuesday", date: "May 5" },
  { id: "tue-4", time: "12:00 PM", title: "Lunch", locationId: "lakeside-dining", day: "tuesday", date: "May 5" },
  { id: "tue-5", time: "1:00 – 5:00 PM", title: "Free time & activities", locationId: "beachfront", day: "tuesday", date: "May 5" },
  { id: "tue-6", time: "6:00 PM", title: "Dinner", locationId: "lakeside-dining", day: "tuesday", date: "May 5" },
  { id: "tue-7", time: "7:00 PM", title: "Evening assembly & announcements", locationId: "activities-center", day: "tuesday", date: "May 5" },
  { id: "tue-8", time: "8:00 PM", title: "Main gym time & table games", locationId: "activities-center", day: "tuesday", date: "May 5" },
  { id: "tue-9", time: "8:00 – 10:00 PM", title: "Indoor pool time (males)", locationId: "activities-center", day: "tuesday", date: "May 5" },
  
  // Wednesday, May 6
  { id: "wed-1", time: "8:00 AM", title: "Breakfast", locationId: "lakeside-dining", day: "wednesday", date: "May 6" },
  { id: "wed-2", time: "9:00 AM", title: "Morning assembly & group picture", locationId: "activities-center", day: "wednesday", date: "May 6" },
  { id: "wed-3", time: "10:00 AM", title: "Dad's session", locationId: "activities-center", day: "wednesday", date: "May 6" },
  { id: "wed-4", time: "12:00 PM", title: "Lunch", locationId: "lakeside-dining", day: "wednesday", date: "May 6" },
  { id: "wed-5", time: "1:00 – 5:00 PM", title: "Free time & activities", locationId: "eagle-crest", day: "wednesday", date: "May 6" },
  { id: "wed-6", time: "6:00 PM", title: "Dinner", locationId: "lakeside-dining", day: "wednesday", date: "May 6" },
  { id: "wed-7", time: "7:00 PM", title: "Evening assembly & announcements", locationId: "activities-center", day: "wednesday", date: "May 6" },
  { id: "wed-8", time: "8:00 PM", title: "Main gym time & table games", locationId: "activities-center", day: "wednesday", date: "May 6" },
  { id: "wed-9", time: "8:00 – 10:00 PM", title: "Indoor pool time (females)", locationId: "activities-center", day: "wednesday", date: "May 6" },
  
  // Thursday, May 7
  { id: "thu-1", time: "8:00 AM", title: "Breakfast", locationId: "lakeside-dining", day: "thursday", date: "May 7" },
  { id: "thu-2", time: "9:00 AM", title: "Morning assembly & announcements", locationId: "activities-center", day: "thursday", date: "May 7" },
  { id: "thu-3", time: "10:00 AM", title: "Bible Bowl", locationId: "activities-center", day: "thursday", date: "May 7" },
  { id: "thu-4", time: "12:00 PM", title: "Lunch", locationId: "lakeside-dining", day: "thursday", date: "May 7" },
  { id: "thu-5", time: "1:00 – 5:00 PM", title: "Free time & activities", locationId: "mini-golf", day: "thursday", date: "May 7" },
  { id: "thu-6", time: "6:00 PM", title: "Dinner", locationId: "lakeside-dining", day: "thursday", date: "May 7" },
  { id: "thu-7", time: "7:00 PM", title: "Evening assembly at bonfire", locationId: "bonfire-site", day: "thursday", date: "May 7" },
  { id: "thu-8", time: "8:00 PM", title: "Glow-in-the-Dark Capture the Flag", locationId: "rec-field-1", day: "thursday", date: "May 7" },
  { id: "thu-9", time: "8:00 – 10:00 PM", title: "Indoor pool time (males)", locationId: "activities-center", day: "thursday", date: "May 7" },
  
  // Friday, May 8
  { id: "fri-1", time: "8:00 AM", title: "Breakfast", locationId: "lakeside-dining", day: "friday", date: "May 8" },
  { id: "fri-2", time: "9:00 AM", title: "Morning assembly & Bible bowl awards", locationId: "activities-center", day: "friday", date: "May 8" },
  { id: "fri-3", time: "10:30 AM", title: "Check out & depart", locationId: "activities-center", day: "friday", date: "May 8" },
]

export const categoryColors: Record<MapLocation["category"], string> = {
  lodging: "bg-blue-500",
  dining: "bg-orange-500",
  activities: "bg-green-500",
  recreation: "bg-purple-500",
  meeting: "bg-red-500",
}

export const categoryLabels: Record<MapLocation["category"], string> = {
  lodging: "Lodging",
  dining: "Dining",
  activities: "Activities",
  recreation: "Recreation",
  meeting: "Meeting Spaces",
}
