import { sql } from "@/lib/db"

export type SpecialAssignment = {
  id: number
  activity_name: string
  assigned_name: string
  assigned_date: string | null
  time_slot: string | null
  notes: string | null
  event_year: number
}

export type SpecialAssignmentInput = {
  activityName: string
  /** Empty string = slot exists but nobody is booked yet. */
  assignedName: string
  assignedDate: string | null
  timeSlot: string | null
  notes: string | null
}

const DEFAULT_YEAR = 2027
/** Rows from the old dash have no event_year — they belong to last year. */
const LEGACY_YEAR = 2026

let ensured = false

/** Lazily create/heal the table (production may have it from the old dash). */
export async function ensureSpecialAssignmentsTable(): Promise<void> {
  if (ensured) return
  await sql.query(`
    CREATE TABLE IF NOT EXISTS special_assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      activity_name TEXT NOT NULL,
      assigned_name TEXT NOT NULL,
      assigned_date TEXT,
      time_slot TEXT,
      notes TEXT,
      registration_id INTEGER,
      family_member_id INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      event_year INTEGER
    )
  `)
  const cols = await sql.query("PRAGMA table_info(special_assignments)")
  if (!cols.some((c) => c.name === "event_year")) {
    await sql.query("ALTER TABLE special_assignments ADD COLUMN event_year INTEGER")
  }
  ensured = true
}

export async function listSpecialAssignments(
  year: number = DEFAULT_YEAR,
): Promise<SpecialAssignment[]> {
  await ensureSpecialAssignmentsTable()
  const rows = await sql`
    SELECT id, activity_name, assigned_name, assigned_date, time_slot, notes,
      COALESCE(event_year, ${LEGACY_YEAR}) as event_year
    FROM special_assignments
    WHERE COALESCE(event_year, ${LEGACY_YEAR}) = ${year}
    ORDER BY COALESCE(assigned_date, '9999'), time_slot, activity_name
  `
  return rows as unknown as SpecialAssignment[]
}

export async function createSpecialAssignment(
  input: SpecialAssignmentInput,
  year: number = DEFAULT_YEAR,
): Promise<void> {
  await ensureSpecialAssignmentsTable()
  await sql`
    INSERT INTO special_assignments (activity_name, assigned_name, assigned_date, time_slot, notes, event_year)
    VALUES (${input.activityName}, ${input.assignedName}, ${input.assignedDate}, ${input.timeSlot}, ${input.notes}, ${year})
  `
}

export async function updateSpecialAssignment(
  id: number,
  input: SpecialAssignmentInput,
): Promise<void> {
  await ensureSpecialAssignmentsTable()
  await sql`
    UPDATE special_assignments
    SET activity_name = ${input.activityName}, assigned_name = ${input.assignedName},
        assigned_date = ${input.assignedDate}, time_slot = ${input.timeSlot},
        notes = ${input.notes}, updated_at = CURRENT_TIMESTAMP
    WHERE id = ${id}
  `
}

export async function deleteSpecialAssignment(id: number): Promise<void> {
  await ensureSpecialAssignmentsTable()
  await sql`DELETE FROM special_assignments WHERE id = ${id}`
}

/**
 * Last year's activity list, used as a starter template. Day offsets are from
 * the event Monday (0 = Mon); null = "prepare ahead" jobs with no date.
 */
const STARTER_ACTIVITIES: { activity: string; day: number | null; time: string; count?: number }[] = [
  { activity: "Check-in (distribute keys, collect money, help newbies)", day: 0, time: "1 - 5 PM" },
  { activity: "Take-A-Hike Ice Breaker Game in Room 205/206", day: 0, time: "4:00 - 5:00 PM" },
  { activity: "Small Gym: Black-light dodgeball, Bombardment, Steal the Bacon", day: 0, time: "8 - 9 PM" },
  { activity: "Small Gym: Black-light dodgeball, Bombardment, Steal the Bacon", day: 1, time: "10 - 11 AM" },
  { activity: "Small Gym: Black-light dodgeball, Bombardment, Steal the Bacon", day: 2, time: "10 - 11 AM" },
  { activity: "Main Gym: 9 Square & Knockout", day: 0, time: "9 - 10 PM" },
  { activity: "Main Gym: 9 Square & Knockout", day: 1, time: "11 - 11:55 AM" },
  { activity: "Main Gym: 9 Square & Knockout", day: 2, time: "11 - 11:55 AM" },
  { activity: "Bring laptop for Power Point loaded with digital songbook", day: 0, time: "Before 5 PM" },
  { activity: "Miniature Painting Session #1", day: 1, time: "10 - 11:30 AM" },
  { activity: "Mom's Session", day: 1, time: "10 - 11:55 AM" },
  { activity: "Young Adult Session (non-parent graduates)", day: 1, time: "10 - 11:55 AM" },
  { activity: "Obstacle course & rope games", day: 1, time: "1:30 - 2:30 PM" },
  { activity: "Archery", day: 1, time: "1:30 - 3:30 PM" },
  { activity: "Human Foosball", day: 1, time: "3:30 - 4:30 PM" },
  { activity: "Play childrens' movie in meeting room", day: 1, time: "3:30 PM" },
  { activity: "Play childrens' movie in meeting room", day: 2, time: "3:30 PM" },
  { activity: "Play childrens' movie in meeting room", day: 3, time: "3:30 PM" },
  { activity: "Female lifeguard", day: 1, time: "8 - 10 PM" },
  { activity: "Dad's Session", day: 2, time: "10 - 11:55 AM" },
  { activity: "Kickball", day: 2, time: "1:30 - 2:30 PM" },
  { activity: "Gaga Ball Tournament", day: 2, time: "2:30 - 3:30 PM" },
  { activity: "Scrabble Tournament", day: 2, time: "2:30 - 5:00 PM" },
  { activity: "Disc Golf", day: 2, time: "3:30 - 4:30 PM" },
  { activity: "Craft in Activity Room", day: 2, time: "3:30 - 5:00 PM", count: 2 },
  { activity: "Male lifeguard", day: 2, time: "8 - 10 PM" },
  { activity: "Bible Bowl", day: 3, time: "10 - 10:30 AM" },
  { activity: "Ping Pong Tourney", day: 3, time: "10:20 - 11:55 AM" },
  { activity: "Paddle boats & canoes at beachfront", day: 3, time: "1:30 - 3:30 PM" },
  { activity: "Miniature Painting Session #2", day: 3, time: "3 - 5 PM" },
  { activity: "Billiards & Air Hockey Tournaments", day: 3, time: "3:30 - 5 PM" },
  { activity: "Glow-in-the-Dark Capture the Flag", day: 3, time: "8 - 9 PM" },
  { activity: "Adult/Teen Volleyball", day: 3, time: "9 - 10 PM" },
  { activity: "Meal Prayer Organizer", day: null, time: "All 12 meals" },
  { activity: "A/V & digital song book for assemblies", day: null, time: "Each 9 AM & 7 PM assembly" },
  { activity: "Assembly organizer (speaking & other worship assignments)", day: null, time: "Prepare ahead of time" },
  { activity: "Prepare Check-In Packets & Double-check Packing List", day: null, time: "Prepare ahead of time" },
]

const EVENT_MONDAY: Record<number, string> = {
  2027: "2027-05-03",
  2026: "2026-05-04",
}

function dateForDay(year: number, dayOffset: number): string {
  const monday = EVENT_MONDAY[year] ?? EVENT_MONDAY[2027]
  const [y, m, d] = monday.split("-").map(Number)
  const date = new Date(Date.UTC(y, m - 1, d + dayOffset))
  return date.toISOString().slice(0, 10)
}

/**
 * Seed a year with last year's activity list (nobody booked). No-op if the
 * year already has rows, so it can't duplicate. Returns rows inserted.
 */
export async function seedSpecialAssignments(year: number = DEFAULT_YEAR): Promise<number> {
  await ensureSpecialAssignmentsTable()
  const existing = await listSpecialAssignments(year)
  if (existing.length > 0) return 0

  let inserted = 0
  for (const item of STARTER_ACTIVITIES) {
    const assignedDate = item.day === null ? null : dateForDay(year, item.day)
    for (let i = 0; i < (item.count ?? 1); i++) {
      await createSpecialAssignment(
        { activityName: item.activity, assignedName: "", assignedDate, timeSlot: item.time, notes: null },
        year,
      )
      inserted++
    }
  }
  return inserted
}
