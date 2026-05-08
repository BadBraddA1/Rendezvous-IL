// Location data for interactive map markers
// Coordinates are percentages (0-100) relative to the map image dimensions
// Only includes locations from the Rendezvous 2027 schedule

export interface MapLocation {
  id: string
  name: string
  description: string
  x: number // percentage from left
  y: number // percentage from top
  category: "lodging" | "dining" | "activities" | "recreation" | "meeting"
  color?: "red" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink"
}

export interface PathPoint {
  x: number
  y: number
  pinId?: string
  isWaypoint?: boolean
}

export interface MapPath {
  id: string
  points: PathPoint[]
  color: string
  label: string
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
  {
    id: "activities-center",
    name: "Activities Center",
    description: "Check-In, Room 207, Room 205/206, Main Gym, Indoor Pool, Ping Pong Room, 9 Square",
    x: 70.8,
    y: 23,
    category: "meeting",
    color: "red"
  },
  {
    id: "lakeside-dining",
    name: "Lakeside Dining Room",
    description: "All meals - Breakfast, Lunch, Dinner",
    x: 66,
    y: 63,
    category: "dining",
    color: "orange"
  },
  {
    id: "bonfire-site",
    name: "Pavilions & Bonfire Site",
    description: "Thursday evening assembly location",
    x: 16.9,
    y: 19.6,
    category: "recreation",
    color: "purple"
  },
  {
    id: "archery",
    name: "Archery",
    description: "Tuesday afternoon activity",
    x: 73.7,
    y: 5.1,
    category: "recreation",
    color: "purple"
  },
  {
    id: "human-foosball",
    name: "Human Foosball",
    description: "Tuesday afternoon activity",
    x: 37.8,
    y: 23,
    category: "recreation",
    color: "purple"
  },
  {
    id: "disc-golf",
    name: "Disc Golf",
    description: "Wednesday afternoon - begins behind Activity Center",
    x: 82.5,
    y: 15.1,
    category: "recreation",
    color: "purple"
  },
  {
    id: "rec-field-kickball",
    name: "Recreation Field",
    description: "Kickball, Capture the Flag, and rope games",
    x: 75.8,
    y: 10.5,
    category: "recreation",
    color: "purple"
  },
  {
    id: "location-1776272179875",
    name: "Motel",
    description: "Ice Machine",
    x: 63.3,
    y: 28.5,
    category: "lodging",
    color: "blue"
  },
  {
    id: "location-1776272356027",
    name: "RV & Tent Sites",
    description: "RV & Tent Sites",
    x: 58.2,
    y: 3.1,
    category: "lodging",
    color: "blue"
  },
  {
    id: "location-1776272406151",
    name: "Ice Machine",
    description: "",
    x: 56.3,
    y: 28.7,
    category: "lodging",
    color: "blue"
  },
  {
    id: "location-1776347433668",
    name: "Kickball",
    description: "Kickball Damond",
    x: 53.3,
    y: 19.9,
    category: "activities",
    color: "purple"
  },
]

// Paths between locations
export const mapPaths: MapPath[] = [
  {
    id: "path-1776276034606",
    points: [
      { x: 70.8, y: 23, pinId: "activities-center" },
      { x: 69.3, y: 25.7, isWaypoint: true },
      { x: 69.2, y: 28.3, isWaypoint: true },
      { x: 68.8, y: 31, isWaypoint: true },
      { x: 67.6, y: 34.6, isWaypoint: true },
      { x: 65.3, y: 41.8, isWaypoint: true },
      { x: 69.8, y: 45.4, isWaypoint: true },
      { x: 73.6, y: 48.2, isWaypoint: true },
      { x: 68.8, y: 56.8, isWaypoint: true },
      { x: 66, y: 63, pinId: "lakeside-dining" }
    ],
    color: "orange",
    label: "To Lakeside Dining Room"
  },
  {
    id: "path-1776276109262",
    points: [
      { x: 70.8, y: 23, pinId: "activities-center" },
      { x: 68, y: 26.6, isWaypoint: true },
      { x: 65.4, y: 26.2, isWaypoint: true },
      { x: 64.6, y: 24.1, isWaypoint: true },
      { x: 52.7, y: 23.2, isWaypoint: true },
      { x: 40.4, y: 19.8, isWaypoint: true },
      { x: 34.9, y: 14.4, isWaypoint: true },
      { x: 34, y: 11.4, isWaypoint: true },
      { x: 31.4, y: 9.8, isWaypoint: true },
      { x: 27.3, y: 8.6, isWaypoint: true },
      { x: 23, y: 8, isWaypoint: true },
      { x: 21.7, y: 8.2, isWaypoint: true },
      { x: 20.8, y: 17.2, isWaypoint: true },
      { x: 19.5, y: 22.9, isWaypoint: true },
      { x: 16.6, y: 23.4, isWaypoint: true },
      { x: 16.9, y: 19.6, pinId: "bonfire-site" }
    ],
    color: "purple",
    label: "To Pavilions & Bonfire Site"
  }
]

// Schedule events matching the actual Rendezvous 2027 schedule
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
  { id: "wed-6", time: "2:30 PM", title: "Gaga Ball Tournament", locationId: "activities-center", day: "wednesday", date: "May 6" },
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

export const pinColors: Record<string, string> = {
  red: "bg-red-500",
  orange: "bg-orange-500",
  yellow: "bg-yellow-500",
  green: "bg-green-500",
  blue: "bg-blue-500",
  purple: "bg-purple-500",
  pink: "bg-pink-500",
}

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
