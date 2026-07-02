import { sql } from "@/lib/db"

export type CalculatorPrefillMember = {
  firstName: string
  /** YYYY-MM-DD; empty when the member is marked 18+. */
  dateOfBirth: string
  isOver18: boolean
}

export type CalculatorPrefill = {
  members: CalculatorPrefillMember[]
  /** Calculator lodging: motel | rv | tent | drivein. */
  lodgingType: string
}

let tableEnsured = false

async function ensureCalculatorPrefillTable(): Promise<void> {
  if (tableEnsured) return
  await sql.query(`
    CREATE TABLE IF NOT EXISTS calculator_prefill (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      clerk_user_id TEXT NOT NULL,
      event_year INTEGER NOT NULL,
      data TEXT NOT NULL,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (clerk_user_id, event_year)
    )
  `)
  tableEnsured = true
}

function sanitizePrefill(input: unknown): CalculatorPrefill | null {
  if (!input || typeof input !== "object") return null
  const raw = input as Record<string, unknown>
  const members = Array.isArray(raw.members)
    ? raw.members
        .map((m): CalculatorPrefillMember | null => {
          if (!m || typeof m !== "object") return null
          const member = m as Record<string, unknown>
          const firstName = typeof member.firstName === "string" ? member.firstName.trim().slice(0, 80) : ""
          const dateOfBirth =
            typeof member.dateOfBirth === "string" && /^\d{4}-\d{2}-\d{2}$/.test(member.dateOfBirth)
              ? member.dateOfBirth
              : ""
          const isOver18 = member.isOver18 === true
          if (!firstName && !dateOfBirth && !isOver18) return null
          return { firstName, dateOfBirth, isOver18 }
        })
        .filter((m): m is CalculatorPrefillMember => m !== null)
        .slice(0, 20)
    : []
  if (members.length === 0) return null
  const lodgingType =
    typeof raw.lodgingType === "string" && ["motel", "rv", "tent", "drivein"].includes(raw.lodgingType)
      ? raw.lodgingType
      : "motel"
  return { members, lodgingType }
}

export async function saveCalculatorPrefill(
  clerkUserId: string,
  eventYear: number,
  input: unknown,
): Promise<CalculatorPrefill | null> {
  const prefill = sanitizePrefill(input)
  if (!prefill) return null

  await ensureCalculatorPrefillTable()
  await sql`
    INSERT INTO calculator_prefill (clerk_user_id, event_year, data, updated_at)
    VALUES (${clerkUserId}, ${eventYear}, ${JSON.stringify(prefill)}, CURRENT_TIMESTAMP)
    ON CONFLICT (clerk_user_id, event_year) DO UPDATE SET
      data = ${JSON.stringify(prefill)},
      updated_at = CURRENT_TIMESTAMP
  `
  return prefill
}

export async function getCalculatorPrefill(
  clerkUserId: string,
  eventYear: number,
): Promise<CalculatorPrefill | null> {
  await ensureCalculatorPrefillTable()
  const [row] = await sql`
    SELECT data FROM calculator_prefill
    WHERE clerk_user_id = ${clerkUserId} AND event_year = ${eventYear}
  `
  if (!row?.data) return null
  try {
    return sanitizePrefill(JSON.parse(String(row.data)))
  } catch {
    return null
  }
}
