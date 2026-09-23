import { sql } from "@/lib/db"
import type { Family, FamilyMember } from "@/lib/family-auth"
import { getFamilyMembers } from "@/lib/family-auth"
import { ensureCheckinQrCode } from "@/lib/checkin-qr"
import { getFamilyCheckIn } from "@/lib/family-check-in"
import {
  getFamilyVolunteering,
  hasVolunteeringContent,
  type FamilyVolunteeringPayload,
} from "@/lib/family-volunteering"
import {
  DEFAULT_REGISTRATION_EVENT_YEAR,
  parseRegistrationEventYear,
  type RegistrationEventYear,
} from "@/lib/registration-event-years"

const SITE_ORIGIN = process.env.NEXT_PUBLIC_SITE_URL || "https://rendezvousil.com"

/** Registration opens Jan 1, 2027 midnight CST (06:00 UTC). */
export const REGISTRATION_OPEN_UTC_MS = Date.UTC(2027, 0, 1, 6, 0, 0)

/** Chicago-date bounds for retreat week (inclusive start, exclusive end). Matches iOS AppConfig. */
export const RETREAT_WEEK_START_ISO = "2027-05-03"
export const RETREAT_WEEK_END_ISO = "2027-05-08"

export function isRegistrationOpen(now = Date.now()): boolean {
  return now >= REGISTRATION_OPEN_UTC_MS
}

/** True when local Chicago calendar date is during the retreat week. */
export function isRetreatWeek(now = new Date()): boolean {
  const chicago = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now)
  return chicago >= RETREAT_WEEK_START_ISO && chicago < RETREAT_WEEK_END_ISO
}

export type YearHubPaymentStatus = "paid_in_full" | "deposit_paid" | "payment_due" | null

/** Chirp-style “who’s up next” for the season hub volunteering block. */
export type YearHubNextUp = {
  kind: "worship" | "special"
  personName: string
  /** e.g. "Leading prayer (Opening Prayer)" or activity name */
  eventLabel: string
  /** e.g. "Tue May 5 · Morning Devotion" */
  whenLabel: string
  startsAt: string | null
}

export type YearHubMember = {
  id: number
  firstName: string
  lastName: string
}

export type YearHubRegistrationSummary = {
  id: number
  familyLastName: string
  lodgingType: string | null
  attendeeCount: number | null
  checkedIn: boolean
  lodgingTotal: number
  tshirtTotal: number
  climbingTowerTotal: number
  registrationFee: number
  totalCost: number
  paymentStatus: YearHubPaymentStatus
  registrationFeePaid: boolean
  fullPaymentPaid: boolean
  /** Family check-in code — rendered as a stealth watermark on Home. */
  checkinQrCode: string | null
}

export type YearHubPayload = {
  eventYear: RegistrationEventYear
  hasFamily: boolean
  hasRegistration: boolean
  registrationOpen: boolean
  isRetreatWeek: boolean
  /** Prefer season hub UI; during retreat week apps keep the live day board primary. */
  preferSeasonHub: boolean
  message: string | null
  registerUrl: string
  family: {
    id: number
    lastName: string
    email: string | null
    city: string | null
    state: string | null
    homeCongregation: string | null
    members: YearHubMember[]
  } | null
  registration: YearHubRegistrationSummary | null
  volunteering: {
    hasContent: boolean
    summary: FamilyVolunteeringPayload["summary"]
    volunteers: Array<{
      id: number
      volunteerName: string
      volunteerType: string
      roleLabel: string | null
    }>
    specialAssignmentCount: number
    /** Next upcoming assignment — chirp-style Home highlight. */
    nextUp: YearHubNextUp | null
  } | null
  links: {
    profile: string
    account: string
    chat: string
    registration: string
    about: string
    schedule: string
  }
}

function paymentStatus(
  registrationFeePaid: boolean,
  fullPaymentPaid: boolean,
): YearHubPaymentStatus {
  if (fullPaymentPaid) return "paid_in_full"
  if (registrationFeePaid) return "deposit_paid"
  return "payment_due"
}

type RegDetailRow = {
  id: number
  family_last_name: string
  lodging_type: string | null
  lodging_total: unknown
  tshirt_total: unknown
  climbing_tower_total: unknown
  registration_fee: unknown
  registration_fee_paid: unknown
  full_payment_paid: unknown
  checked_in: unknown
  attendee_count: unknown
  checkin_qr_code: unknown
}

async function loadRegistrationDetail(
  registrationId: number,
  eventYear: number,
): Promise<RegDetailRow | null> {
  const [row] = await sql`
    SELECT
      r.id,
      r.family_last_name,
      r.lodging_type,
      r.lodging_total,
      r.tshirt_total,
      r.climbing_tower_total,
      r.registration_fee,
      r.registration_fee_paid,
      r.full_payment_paid,
      r.checked_in,
      r.checkin_qr_code,
      (
        SELECT COUNT(*)
        FROM family_members fm
        WHERE fm.registration_id = r.id
      ) AS attendee_count
    FROM registrations r
    WHERE r.id = ${registrationId}
      AND COALESCE(r.event_year, 2026) = ${eventYear}
    LIMIT 1
  `
  return (row as RegDetailRow | undefined) ?? null
}

async function findRegistrationIdForFamily(
  family: Family,
  eventYear: number,
): Promise<number | null> {
  try {
    const [row] = await sql`
      SELECT rv.id
      FROM registrations_v2 rv
      WHERE rv.family_id = ${family.id}
        AND rv.event_year = ${eventYear}
      ORDER BY rv.id DESC
      LIMIT 1
    `
    if (row?.id != null) return Number(row.id)
  } catch {
    // registrations_v2 may be missing
  }

  const email = family.email?.trim()
  if (!email) return null

  const [legacy] = await sql`
    SELECT id
    FROM registrations
    WHERE LOWER(email) = LOWER(${email})
      AND COALESCE(event_year, 2026) = ${eventYear}
    ORDER BY created_at DESC
    LIMIT 1
  `
  return legacy?.id != null ? Number(legacy.id) : null
}

function mapMembers(members: FamilyMember[]): YearHubMember[] {
  return members.map((m) => ({
    id: m.id,
    firstName: m.first_name,
    lastName: m.last_name,
  }))
}

function mapRegistration(row: RegDetailRow): YearHubRegistrationSummary {
  const lodgingTotal = Number(row.lodging_total) || 0
  const tshirtTotal = Number(row.tshirt_total) || 0
  const climbingTowerTotal = Number(row.climbing_tower_total) || 0
  const registrationFee = Number(row.registration_fee) || 0
  const registrationFeePaid = Boolean(row.registration_fee_paid)
  const fullPaymentPaid = Boolean(row.full_payment_paid)
  return {
    id: Number(row.id),
    familyLastName: String(row.family_last_name),
    lodgingType: row.lodging_type ? String(row.lodging_type) : null,
    attendeeCount:
      row.attendee_count != null && Number.isFinite(Number(row.attendee_count))
        ? Number(row.attendee_count)
        : null,
    checkedIn: Boolean(row.checked_in),
    lodgingTotal,
    tshirtTotal,
    climbingTowerTotal,
    registrationFee,
    totalCost: lodgingTotal + tshirtTotal + climbingTowerTotal + registrationFee,
    paymentStatus: paymentStatus(registrationFeePaid, fullPaymentPaid),
    registrationFeePaid,
    fullPaymentPaid,
    checkinQrCode: (() => {
      if (row.checkin_qr_code == null) return null
      const code = String(row.checkin_qr_code).trim().toUpperCase()
      return code || null
    })(),
  }
}

/**
 * Season hub payload for the default (or requested) event year.
 * No cross-year fallback — unregistered years return hasRegistration: false.
 */
export async function getYearHub(
  family: Family | null,
  yearInput?: string | number | null,
): Promise<YearHubPayload> {
  const eventYear = parseRegistrationEventYear(yearInput ?? DEFAULT_REGISTRATION_EVENT_YEAR)
  const registrationOpen = isRegistrationOpen()
  const retreat = isRetreatWeek()
  const registerPath = registrationOpen ? "/registration" : "/registration"
  const links = {
    profile: `${SITE_ORIGIN}/account/profile`,
    account: `${SITE_ORIGIN}/account`,
    chat: `${SITE_ORIGIN}/chat`,
    registration: `${SITE_ORIGIN}${registerPath}`,
    about: `${SITE_ORIGIN}/about`,
    schedule: `${SITE_ORIGIN}/schedule`,
  }

  const base = {
    eventYear,
    registrationOpen,
    isRetreatWeek: retreat,
    preferSeasonHub: !retreat,
    registerUrl: links.registration,
    links,
  }

  if (!family) {
    return {
      ...base,
      hasFamily: false,
      hasRegistration: false,
      message: "No family profile linked to this account yet.",
      family: null,
      registration: null,
      volunteering: null,
    }
  }

  const checkIn = await getFamilyCheckIn(family, String(eventYear))
  const members = await getFamilyMembers(family.id)
  const familyBlock = {
    id: family.id,
    lastName: family.family_last_name,
    email: family.email,
    city: family.city,
    state: family.state,
    homeCongregation: family.home_congregation,
    members: mapMembers(members),
  }

  if (!checkIn.hasRegistration) {
    return {
      ...base,
      hasFamily: true,
      hasRegistration: false,
      message: checkIn.message ?? `No registration for ${eventYear} yet.`,
      family: familyBlock,
      registration: null,
      volunteering: null,
    }
  }

  const registrationId =
    (await findRegistrationIdForFamily(family, eventYear)) ??
    null

  let registration: YearHubRegistrationSummary | null = null
  if (registrationId != null) {
    const detail = await loadRegistrationDetail(registrationId, eventYear)
    if (detail) registration = mapRegistration(detail)
  }

  if (!registration) {
    // Fallback from check-in fields when detail query fails
    registration = {
      id: 0,
      familyLastName: checkIn.familyLastName || family.family_last_name,
      lodgingType: checkIn.lodgingType,
      attendeeCount: checkIn.attendeeCount,
      checkedIn: checkIn.checkedIn,
      lodgingTotal: 0,
      tshirtTotal: 0,
      climbingTowerTotal: 0,
      registrationFee: 0,
      totalCost: 0,
      paymentStatus: null,
      registrationFeePaid: false,
      fullPaymentPaid: false,
      checkinQrCode: null,
    }
  }

  if (registration.id > 0) {
    const code = await ensureCheckinQrCode(registration.id)
    registration = { ...registration, checkinQrCode: code }
  }

  const volunteeringPayload = await getFamilyVolunteering(family, String(eventYear))
  const volunteering = {
    hasContent: hasVolunteeringContent(volunteeringPayload),
    summary: volunteeringPayload.summary,
    volunteers: volunteeringPayload.volunteers.map((v) => ({
      id: v.id,
      volunteerName: v.volunteerName,
      volunteerType: v.volunteerType,
      roleLabel: v.worshipAssignment?.roleLabel ?? null,
    })),
    specialAssignmentCount: volunteeringPayload.specialAssignments.length,
    nextUp: pickNextUp(volunteeringPayload),
  }

  return {
    ...base,
    hasFamily: true,
    hasRegistration: true,
    message: null,
    family: familyBlock,
    registration,
    volunteering,
  }
}

function formatWhenLabel(startsAt: string | null, assignedDate: string | null, timeSlot: string | null): string {
  if (startsAt) {
    try {
      const d = new Date(startsAt)
      if (!Number.isNaN(d.getTime())) {
        const weekday = new Intl.DateTimeFormat("en-US", {
          timeZone: "America/Chicago",
          weekday: "short",
        }).format(d)
        const monthDay = new Intl.DateTimeFormat("en-US", {
          timeZone: "America/Chicago",
          month: "short",
          day: "numeric",
        }).format(d)
        const slot = (timeSlot || "").trim()
        return slot ? `${weekday} ${monthDay} · ${slot}` : `${weekday} ${monthDay}`
      }
    } catch {
      /* fall through */
    }
  }
  const datePart = assignedDate?.slice(0, 10) || ""
  const slot = (timeSlot || "").trim()
  if (datePart && slot) return `${datePart} · ${slot}`
  return datePart || slot || "Soon"
}

/** Soonest upcoming worship or special assignment (Chicago “now”). */
export function pickNextUp(payload: FamilyVolunteeringPayload, now = new Date()): YearHubNextUp | null {
  const nowMs = now.getTime()
  type Candidate = YearHubNextUp & { sortMs: number }
  const candidates: Candidate[] = []

  for (const v of payload.volunteers) {
    const wa = v.worshipAssignment
    if (!wa) continue
    const startsAt = wa.startsAt
    const sortMs = startsAt ? Date.parse(startsAt) : Number.POSITIVE_INFINITY
    if (Number.isFinite(sortMs) && sortMs < nowMs - 60 * 60 * 1000) continue // skip >1h past
    candidates.push({
      kind: "worship",
      personName: v.volunteerName,
      eventLabel: wa.roleLabel || v.volunteerType,
      whenLabel: formatWhenLabel(startsAt, wa.assignedDate, wa.timeSlot),
      startsAt,
      sortMs: Number.isFinite(sortMs) ? sortMs : Number.MAX_SAFE_INTEGER,
    })
  }

  for (const s of payload.specialAssignments) {
    const startsAt = s.startsAt
    const sortMs = startsAt ? Date.parse(startsAt) : Number.POSITIVE_INFINITY
    if (Number.isFinite(sortMs) && sortMs < nowMs - 60 * 60 * 1000) continue
    candidates.push({
      kind: "special",
      personName: s.matchedName,
      eventLabel: s.activityName,
      whenLabel: formatWhenLabel(startsAt, s.assignedDate, s.timeSlot),
      startsAt,
      sortMs: Number.isFinite(sortMs) ? sortMs : Number.MAX_SAFE_INTEGER,
    })
  }

  if (candidates.length === 0) return null
  candidates.sort((a, b) => a.sortMs - b.sortMs)
  const { sortMs: _s, ...next } = candidates[0]
  return next
}
