import { sql, type SqlRow } from "@/lib/db"
import {
  computeAdminCalculatorCost,
  type CalculatorMember,
} from "@/lib/admin-calculator-cost"
import type { MemberAttendance } from "@/lib/calculator-schedule"
import type { RateRow } from "@/lib/rate-lookup"
import {
  ageAtEventDate,
  matchRegistrationMember,
  normalizeRegistrationLodgingType,
  registrationMemberToAttendance,
  registrationPaidTotal,
  siteNightsFromAttendance,
  type RegistrationMemberRow,
} from "@/lib/registration-to-calculator"

export type CalculatorFamilySeed = {
  sourceYear: number
  sourceRegistrationId: number
  familyLastName: string
  members: CalculatorMember[]
  attendance: Record<string, MemberAttendance>
  lodgingType: ReturnType<typeof normalizeRegistrationLodgingType>
  numNights: number
  sameScheduleForAll: boolean
  comparison: {
    priorYearPaid: number
    priorYearCalculated: number | null
    priorYearLodgingOnly: number
  }
}

export async function getRatesGroupedByYear(year: number): Promise<Record<string, RateRow[]> | null> {
  const charts = await sql`
    SELECT * FROM rate_charts WHERE year = ${year} LIMIT 1
  `
  if (charts.length === 0) return null

  const rates = await sql`
    SELECT * FROM rates
    WHERE rate_chart_id = ${charts[0].id}
    ORDER BY category, sort_order
  `

  const grouped: Record<string, RateRow[]> = {}
  for (const rate of rates) {
    const category = String(rate.category)
    if (!grouped[category]) grouped[category] = []
    grouped[category].push({
      name: String(rate.name),
      amount: String(rate.amount),
    })
  }
  return grouped
}

async function getPriorRegistrationFromLegacy(
  familyEmail: string,
  beforeYear: number,
): Promise<{ registration: SqlRow; members: RegistrationMemberRow[] } | null> {
  let rows: SqlRow[] = []
  try {
    rows = await sql`
      SELECT r.*
      FROM registrations r
      WHERE LOWER(r.email) = LOWER(${familyEmail})
        AND COALESCE(r.event_year, 2026) < ${beforeYear}
      ORDER BY COALESCE(r.event_year, 0) DESC, r.created_at DESC
      LIMIT 1
    `
  } catch {
    rows = await sql`
      SELECT r.*
      FROM registrations r
      WHERE LOWER(r.email) = LOWER(${familyEmail})
      ORDER BY r.created_at DESC
      LIMIT 1
    `
  }

  const registration = rows[0]
  if (!registration) return null

  const members = await sql`
    SELECT *
    FROM family_members
    WHERE registration_id = ${registration.id}
    ORDER BY age DESC NULLS LAST, id ASC
  `

  if (members.length === 0) return null

  return {
    registration,
    members: members as RegistrationMemberRow[],
  }
}

async function getPriorRegistrationFromV2(
  input: { familyEmail: string; familyId?: number },
  beforeYear: number,
): Promise<{ registration: SqlRow; members: RegistrationMemberRow[] } | null> {
  let rows: SqlRow[] = []

  if (input.familyId) {
    rows = await sql`
      SELECT rv.*, f.family_last_name, f.email
      FROM registrations_v2 rv
      JOIN families f ON f.id = rv.family_id
      WHERE rv.family_id = ${input.familyId}
        AND rv.event_year < ${beforeYear}
      ORDER BY rv.event_year DESC, rv.created_at DESC
      LIMIT 1
    `
  }

  if (rows.length === 0) {
    rows = await sql`
      SELECT rv.*, f.family_last_name, f.email
      FROM registrations_v2 rv
      JOIN families f ON f.id = rv.family_id
      WHERE LOWER(f.email) = LOWER(${input.familyEmail})
        AND rv.event_year < ${beforeYear}
      ORDER BY rv.event_year DESC, rv.created_at DESC
      LIMIT 1
    `
  }

  const registration = rows[0]
  if (!registration) return null

  const members = await sql`
    SELECT
      fm.id,
      fm.first_name,
      fm.last_name,
      fm.date_of_birth,
      ra.age_at_event AS age
    FROM registration_attendees ra
    JOIN family_members_v2 fm ON fm.id = ra.family_member_id
    WHERE ra.registration_id = ${registration.id}
    ORDER BY ra.age_at_event DESC NULLS LAST, fm.id ASC
  `

  if (members.length === 0) return null

  return {
    registration,
    members: members as RegistrationMemberRow[],
  }
}

async function getPriorRegistration(
  familyEmail: string,
  beforeYear: number,
  familyId?: number,
): Promise<{ registration: SqlRow; members: RegistrationMemberRow[] } | null> {
  const legacy = await getPriorRegistrationFromLegacy(familyEmail, beforeYear)
  if (legacy) return legacy

  return getPriorRegistrationFromV2({ familyEmail, familyId }, beforeYear)
}

function schedulesMatch(a: MemberAttendance, b: MemberAttendance): boolean {
  if (a.nights.length !== b.nights.length) return false
  if (!a.nights.every((n) => b.nights.includes(n))) return false

  const days = new Set([...Object.keys(a.meals), ...Object.keys(b.meals)])
  for (const day of days) {
    const left = a.meals[day] ?? []
    const right = b.meals[day] ?? []
    if (left.length !== right.length) return false
    if (!left.every((meal) => right.includes(meal))) return false
  }
  return true
}

export async function buildCalculatorFamilySeed(input: {
  familyEmail: string
  familyId?: number
  profileMembers: {
    id: number
    first_name: string
    last_name: string
    date_of_birth: string | null
  }[]
  targetYear: number
}): Promise<CalculatorFamilySeed | null> {
  const prior = await getPriorRegistration(input.familyEmail, input.targetYear, input.familyId)
  if (!prior) return null

  const sourceYear = Number(
    prior.registration.event_year ??
      new Date(String(prior.registration.created_at)).getFullYear(),
  )
  const registrationMembers = prior.members

  const roster =
    input.profileMembers.length > 0
      ? input.profileMembers.map((member) => ({
          profileId: member.id,
          firstName: member.first_name,
          lastName: member.last_name,
          dateOfBirth: member.date_of_birth,
          registrationRow: matchRegistrationMember(
            member.first_name,
            member.last_name,
            registrationMembers,
          ),
        }))
      : registrationMembers.map((row, index) => ({
          profileId: index + 1,
          firstName: String(row.first_name ?? ""),
          lastName: String(row.last_name ?? ""),
          dateOfBirth: (row.date_of_birth as string | null) ?? null,
          registrationRow: row,
        }))

  const members: CalculatorMember[] = []
  const attendance: Record<string, MemberAttendance> = {}

  for (const person of roster) {
    if (!person.registrationRow) continue

    const id = String(person.profileId)
    const age = ageAtEventDate(
      person.dateOfBirth ?? (person.registrationRow.date_of_birth as string | null),
      person.registrationRow.age as number | null,
      input.targetYear,
      sourceYear,
    )

    const name = [person.firstName, person.lastName].filter(Boolean).join(" ").trim() || `Person ${id}`
    members.push({ id, name, age })
    attendance[id] = registrationMemberToAttendance(person.registrationRow)
  }

  if (members.length === 0) return null

  const attendingSchedules = members
    .map((member) => attendance[member.id])
    .filter((att) => att?.attending)

  const sameScheduleForAll =
    attendingSchedules.length <= 1 ||
    attendingSchedules.every((schedule) => schedulesMatch(attendingSchedules[0], schedule))

  const lodgingType = normalizeRegistrationLodgingType(String(prior.registration.lodging_type))
  const numNights = siteNightsFromAttendance(
    attendance,
    members.map((member) => member.id),
  )

  const priorRates = await getRatesGroupedByYear(sourceYear)
  let priorYearCalculated: number | null = null
  if (priorRates) {
    priorYearCalculated = computeAdminCalculatorCost({
      members,
      attendance,
      lodgingType,
      numNights,
      rates: priorRates,
    }).total
  }

  return {
    sourceYear,
    sourceRegistrationId: Number(prior.registration.id),
    familyLastName: String(prior.registration.family_last_name ?? ""),
    members,
    attendance,
    lodgingType,
    numNights,
    sameScheduleForAll,
    comparison: {
      priorYearPaid: registrationPaidTotal(prior.registration),
      priorYearCalculated,
      priorYearLodgingOnly: Number(prior.registration.lodging_total ?? 0),
    },
  }
}
