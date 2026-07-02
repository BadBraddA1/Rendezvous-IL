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
