import { sql, type SqlRow } from "@/lib/db"
import { calculateLodgingCost, type LodgingRatesByCategory } from "@/lib/lodging-cost"
import { fetchRatesByYear } from "@/lib/calculator-rates-db"
import { normalizeDateOfBirth } from "@/lib/date-of-birth"
import type { FamilyMember, HealthInfo, LodgingType, RegistrationData } from "@/types/registration"
import { DEFAULT_ARRIVAL_DEPARTURE } from "@/lib/registration-arrival-departure"

export const EXPRESS_TARGET_YEAR = 2027

export type ExpressPrefill = {
  sourceYear: number
  sourceRegistrationId: number
  data: RegistrationData
}

const VALID_LODGING: LodgingType[] = ["motel-2queen-bunk", "motel-1queen-2bunk", "rv", "tent"]

function normalizeLodging(raw: unknown): LodgingType {
  const value = String(raw ?? "")
  if (VALID_LODGING.includes(value as LodgingType)) return value as LodgingType
  if (value === "rv" || value.includes("rv")) return "rv"
  if (value.includes("tent")) return "tent"
  return "motel-2queen-bunk"
}

function ageOnEventDate(dateOfBirth: string, eventYear = EXPRESS_TARGET_YEAR): number | null {
  const birth = new Date(dateOfBirth)
  if (Number.isNaN(birth.getTime())) return null
  const eventDate = new Date(`${eventYear}-05-03T12:00:00`)
  let age = eventDate.getFullYear() - birth.getFullYear()
  const monthDiff = eventDate.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && eventDate.getDate() < birth.getDate())) {
    age--
  }
  return Math.max(0, age)
}

/**
 * Age for express prefill: youth/children age forward to the target year;
 * anyone already 18+ last year stays an adult (no year bump).
 */
function ageForExpressPrefill(
  dateOfBirth: string,
  storedAge: number | null,
  sourceYear: number,
  yearGap: number,
): number {
  const priorAge = dateOfBirth
    ? ageOnEventDate(dateOfBirth, sourceYear)
    : storedAge
  if (priorAge != null && priorAge >= 18) {
    return priorAge
  }
  if (dateOfBirth) {
    return ageOnEventDate(dateOfBirth) ?? 0
  }
  if (storedAge != null) {
    return Math.max(0, storedAge + yearGap)
  }
  return 0
}

/**
 * Load the family's most recent prior registration and map it into the
 * registration form's data shape, with ages recomputed for the target event
 * year (youth/children only — adults stay Adult). This powers the express
 * "review & confirm" flow for returning families.
 */
export async function getExpressPrefill(familyEmail: string): Promise<ExpressPrefill | null> {
  // Prefer the newest registration from a previous year; fall back to the
  // newest overall (e.g. an earlier express/test submission for the target year).
  let rows: SqlRow[] = []
  try {
    rows = await sql`
      SELECT * FROM registrations
      WHERE LOWER(email) = LOWER(${familyEmail})
        AND COALESCE(event_year, 2026) < ${EXPRESS_TARGET_YEAR}
      ORDER BY COALESCE(event_year, 0) DESC, created_at DESC
      LIMIT 1
    `
  } catch {
    rows = []
  }
  if (rows.length === 0) {
    rows = await sql`
      SELECT * FROM registrations
      WHERE LOWER(email) = LOWER(${familyEmail})
      ORDER BY created_at DESC
      LIMIT 1
    `
  }

  const reg = rows[0]
  if (!reg) return null

  const registrationId = Number(reg.id)
  const sourceYear = Number(
    reg.event_year ?? new Date(String(reg.created_at)).getFullYear() ?? EXPRESS_TARGET_YEAR - 1,
  )
  const yearGap = Math.max(0, EXPRESS_TARGET_YEAR - sourceYear)

  // T-shirts, add-ons, scholarship, emergency contact, and volunteer signups
  // are intentionally not loaded — those must be re-entered every year.
  const [memberRows, healthRows, suggestionRows] = await Promise.all([
    sql`SELECT * FROM family_members WHERE registration_id = ${registrationId} ORDER BY id ASC`,
    sql`SELECT * FROM health_info WHERE registration_id = ${registrationId} ORDER BY id ASC`.catch(
      () => [] as SqlRow[],
    ),
    sql`SELECT * FROM session_suggestions WHERE registration_id = ${registrationId}`.catch(
      () => [] as SqlRow[],
    ),
  ])

  const familyLastName = String(reg.family_last_name ?? "")

  const familyMembers: FamilyMember[] = memberRows.map((row, index) => {
    const dob = normalizeDateOfBirth(row.date_of_birth)
    const storedAge = row.age != null ? Number(row.age) : null
    const age = ageForExpressPrefill(dob, storedAge, sourceYear, yearGap)
    const lastName = String(row.last_name ?? "") || familyLastName
    const parentRole =
      row.parent_role === "father" || row.parent_role === "mother" ? row.parent_role : null
    return {
      id: String(index + 1),
      firstName: String(row.first_name ?? ""),
      lastName,
      useCustomLastName: lastName.toLowerCase() !== familyLastName.toLowerCase(),
      dateOfBirth: dob,
      age,
      isBaptized: Boolean(row.is_baptized),
      personCost: 0,
      isOver18: age >= 18,
      parentRole,
      email: typeof row.email === "string" && row.email ? row.email : undefined,
      phone: typeof row.phone === "string" && row.phone ? row.phone : undefined,
      shareContactInDirectory: Boolean(row.share_contact_directory),
    }
  })

  const healthInfo: HealthInfo[] = healthRows
    .filter((row) => row.full_name && row.condition)
    .map((row, index) => ({
      id: String(index + 1),
      fullName: String(row.full_name),
      condition: String(row.condition),
      medicationOnHand: Boolean(row.medication_on_hand),
    }))

  const sessionSuggestions = { moms: "", dads: "" }
  for (const row of suggestionRows) {
    if (row.session_type === "moms") sessionSuggestions.moms = String(row.suggestion ?? "")
    if (row.session_type === "dads") sessionSuggestions.dads = String(row.suggestion ?? "")
  }

  const lodgingType = normalizeLodging(reg.lodging_type)
  const ratesData = await fetchRatesByYear(EXPRESS_TARGET_YEAR)
  const { total: lodgingTotal, updatedMembers } = calculateLodgingCost(
    lodgingType,
    familyMembers,
    (ratesData?.rates as LodgingRatesByCategory | undefined) ?? null,
  )

  const data: RegistrationData = {
    familyLastName,
    email: String(reg.email ?? familyEmail),
    husbandPhone: String(reg.husband_phone ?? ""),
    wifePhone: String(reg.wife_phone ?? ""),
    address: String(reg.address ?? ""),
    city: String(reg.city ?? ""),
    state: String(reg.state ?? ""),
    zip: String(reg.zip ?? ""),
    homeCongregation: String(reg.home_congregation ?? ""),
    fatherOccupation: String(reg.father_occupation ?? ""),
    timesAttended: Number(reg.times_attended ?? 0),
    yearsHomeschooling: Number(reg.years_homeschooling ?? 0),
    currentlyHomeschooling: reg.currently_homeschooling == null ? true : Boolean(reg.currently_homeschooling),
    arrivalDeparture: { ...DEFAULT_ARRIVAL_DEPARTURE },
    familyMembers: updatedMembers,
    lodgingType,
    lodgingTotal,
    // Intentionally NOT carried over — these must be re-entered every year:
    // t-shirts, add-ons, scholarship fund, emergency contact, and worship
    // service volunteers.
    tshirtOrders: [],
    tshirtTotal: 0,
    climbingTowerParticipants: 0,
    climbingTowerTotal: 0,
    scholarshipDonation: 0,
    scholarshipRequested: false,
    emergencyContactName: "",
    emergencyContactRelationship: "",
    emergencyContactPhone: "",
    healthInfo,
    volunteerSignups: [],
    volunteerEmails: {},
    sessionSuggestions,
    fatherSignature: "",
    motherSignature: "",
    registrationFee: 25,
  }

  return { sourceYear, sourceRegistrationId: registrationId, data }
}
