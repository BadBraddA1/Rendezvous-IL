// Location data for interactive map markers
// Coordinates are percentages (0-100) relative to the map image dimensions
// Only includes locations from the Rendezvous 2026 schedule

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

// Only locations referenced in the actual schedule
export const mapLocations: MapLocation[] = [
  // Main venue locations used in schedule
  { 
    id: "activities-center", 
    name: "Activities Center (Room 207)", 
    description: "Check-In, Room 207, Room 205/206, Main Gym, Indoor Pool, Ping Pong Room", 
    x: 70.7, 
    y: 24.8, 
    category: "meeting" 
  },
  { 
    id: "lakeside-dining", 
    name: "Lakeside Dining Room", 
    description: "All meals - Breakfast, Lunch, Dinner", 
    x: 65.3, 
    y: 57.6, 
    category: "dining" 
  },
  { 
    id: "bonfire-site", 
    name: "Pavilions & Bonfire Site", 
    description: "Thursday evening assembly location", 
    x: 16, 
    y: 19.1, 
    category: "recreation" 
  },
  
  // Outdoor activity locations
  { 
    id: "archery", 
    name: "Archery", 
    description: "Tuesday afternoon activity", 
    x: 72.8, 
    y: 3.7, 
    category: "recreation" 
  },
  { 
    id: "human-foosball", 
    name: "Human Foosball", 
    description: "Tuesday afternoon activity", 
    x: 37.8, 
    y: 23, 
    category: "recreation" 
  },
  { 
    id: "gaga-ball", 
    name: "GaGa Ball / 9 Square", 
    description: "Wednesday Gaga Ball Tournament", 
    x: 58.3, 
    y: 12.9, 
    category: "recreation" 
  },
  { 
    id: "disc-golf", 
    name: "Disc Golf", 
    description: "Wednesday afternoon - begins behind Activity Center", 
    x: 82.5, 
    y: 13.5, 
    category: "recreation" 
  },
  { 
    id: "rec-field-kickball", 
    name: "Recreation Field #5", 
    description: "Kickball, Capture the Flag, and rope games", 
    x: 46.6, 
    y: 26.6, 
    category: "recreation" 
  },
  { 
    id: "beachfront", 
    name: "Beachfront", 
    description: "Lake beach area for free time", 
    x: 15.5, 
    y: 30.4, 
    category: "recreation" 
  },
]

// Schedule events matching the actual Rendezvous 2026 schedule
export const scheduleEvents: ScheduleEvent[] = [
  // Monday, May 4
  { id: "mon-1", time: "1:00 - 5:15 PM", title: "Check-in", locationId: "activities-center", day: "monday", date: "May 4" },
  { id: "mon-2", time: "4:00 - 5:00 PM", title: "Ice Breaker in AC Room 205/206", locationId: "activities-center", day: "monday", date: "May 4" },
  { id: "mon-3", time: "5:30 PM", title: "Dinner", locationId: "lakeside-dining", day: "monday", date: "May 4" },
  { id: "mon-4", time: "7:00 PM", title: "Evening assembly in AC Room 207", locationId: "activities-center", day: "monday", date: "May 4" },
  { id: "mon-5", time: "8:00 PM", title: "Black-light Dodgeball & games", locationId: "activities-center", day: "monday", date: "May 4" },
  
  // Tuesday, May 5
  { id: "tue-1", time: "7:30 AM", title: "Breakfast", locationId: "lakeside-dining", day: "tuesday", date: "May 5" },
  { id: "tue-2", time: "9:00 AM", title: "Morning assembly in AC Room 207", locationId: "activities-center", day: "tuesday", date: "May 5" },
  { id: "tue-3", time: "10:00 AM", title: "Young Adult & Mom's sessions", locationId: "activities-center", day: "tuesday", date: "May 5" },
  { id: "tue-4", time: "12:00 PM", title: "Lunch", locationId: "lakeside-dining", day: "tuesday", date: "May 5" },
  { id: "tue-5", time: "1:30 PM", title: "Archery, Obstacle course, Rope games", locationId: "archery", day: "tuesday", date: "May 5" },
  { id: "tue-6", time: "3:30 PM", title: "Human Foosball", locationId: "human-foosball", day: "tuesday", date: "May 5" },
  { id: "tue-7", time: "5:30 PM", title: "Dinner", locationId: "lakeside-dining", day: "tuesday", date: "May 5" },
  { id: "tue-8", time: "7:00 PM", title: "Evening assembly in AC Room 207", locationId: "activities-center", day: "tuesday", date: "May 5" },
  { id: "tue-9", time: "8:00 - 10:00 PM", title: "Indoor pool (females)", locationId: "activities-center", day: "tuesday", date: "May 5" },
  
  // Wednesday, May 6
  { id: "wed-1", time: "7:30 AM", title: "Breakfast", locationId: "lakeside-dining", day: "wednesday", date: "May 6" },
  { id: "wed-2", time: "9:00 AM", title: "Morning assembly & group picture", locationId: "activities-center", day: "wednesday", date: "May 6" },
  { id: "wed-3", time: "10:00 AM", title: "Dad's session in AC Room 207", locationId: "activities-center", day: "wednesday", date: "May 6" },
  { id: "wed-4", time: "12:00 PM", title: "Lunch", locationId: "lakeside-dining", day: "wednesday", date: "May 6" },
  { id: "wed-5", time: "1:30 PM", title: "Kickball", locationId: "rec-field-kickball", day: "wednesday", date: "May 6" },
  { id: "wed-6", time: "2:30 PM", title: "Gaga Ball Tournament", locationId: "gaga-ball", day: "wednesday", date: "May 6" },
  { id: "wed-7", time: "2:30 PM", title: "Scrabble Tournament in AC Room 205/206", locationId: "activities-center", day: "wednesday", date: "May 6" },
  { id: "wed-8", time: "3:30 PM", title: "Disc golf", locationId: "disc-golf", day: "wednesday", date: "May 6" },
  { id: "wed-9", time: "5:30 PM", title: "Dinner", locationId: "lakeside-dining", day: "wednesday", date: "May 6" },
  { id: "wed-10", time: "7:00 PM", title: "Evening assembly in AC Room 207", locationId: "activities-center", day: "wednesday", date: "May 6" },
  { id: "wed-11", time: "8:00 - 10:00 PM", title: "Indoor pool (males)", locationId: "activities-center", day: "wednesday", date: "May 6" },
  
  // Thursday, May 7
  { id: "thu-1", time: "7:30 AM", title: "Breakfast", locationId: "lakeside-dining", day: "thursday", date: "May 7" },
  { id: "thu-2", time: "9:00 AM", title: "Morning assembly in AC Room 207", locationId: "activities-center", day: "thursday", date: "May 7" },
  { id: "thu-3", time: "10:00 AM", title: "Bible Bowl in AC Room 207", locationId: "activities-center", day: "thursday", date: "May 7" },
  { id: "thu-4", time: "12:00 PM", title: "Lunch", locationId: "lakeside-dining", day: "thursday", date: "May 7" },
  { id: "thu-5", time: "5:30 PM", title: "Dinner", locationId: "lakeside-dining", day: "thursday", date: "May 7" },
  { id: "thu-6", time: "7:00 PM", title: "Evening assembly at bonfire", locationId: "bonfire-site", day: "thursday", date: "May 7" },
  { id: "thu-7", time: "8:00 PM", title: "Glow-in-the-Dark Capture the Flag", locationId: "rec-field-kickball", day: "thursday", date: "May 7" },
  { id: "thu-8", time: "8:00 - 10:00 PM", title: "Indoor pool (males)", locationId: "activities-center", day: "thursday", date: "May 7" },
  
  // Friday, May 8
  { id: "fri-1", time: "7:30 AM", title: "Breakfast", locationId: "lakeside-dining", day: "friday", date: "May 8" },
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
