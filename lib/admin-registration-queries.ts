import { sql, type SqlRow } from "@/lib/db"
import type { RegistrationEventYear } from "@/lib/registration-event-years"

export type AdminRegistrationListRow = {
  id: string
  family_last_name: string
  email: string
  attendee_count: number
  lodging_type: string
  total_cost: number
  registration_fee_paid?: boolean | number
  full_payment_paid?: boolean | number
  created_at: string
  source: "legacy" | "v2"
  event_year: RegistrationEventYear
  /** Emailed parent signatures still outstanding (0 when feature unused). */
  signatures_pending?: number
  signatures_total?: number
}

type ListFilters = {
  year: RegistrationEventYear
  search?: string
  lodging?: string | null
}

function mapLegacyRow(row: SqlRow, year: RegistrationEventYear): AdminRegistrationListRow {
  return {
    id: String(row.id),
    family_last_name: String(row.family_last_name ?? ""),
    email: String(row.email ?? ""),
    attendee_count: Number(row.attendee_count ?? 0),
    lodging_type: String(row.lodging_type ?? ""),
    total_cost: Number(row.total_cost ?? 0),
    registration_fee_paid: row.registration_fee_paid,
    full_payment_paid: row.full_payment_paid,
    created_at: String(row.created_at ?? ""),
    source: "legacy",
    event_year: year,
  }
}

function mapV2Row(row: SqlRow, year: RegistrationEventYear): AdminRegistrationListRow {
  const depositPaid = Number(row.deposit_paid ?? 0)
  const paymentStatus = String(row.payment_status ?? "")

  return {
    id: `v2:${row.id}`,
    family_last_name: String(row.family_last_name ?? ""),
    email: String(row.email ?? ""),
    attendee_count: Number(row.attendee_count ?? 0),
    lodging_type: String(row.lodging_type ?? ""),
    total_cost: Number(row.total_cost ?? 0),
    registration_fee_paid: depositPaid > 0 ? 1 : 0,
    full_payment_paid: paymentStatus === "paid" ? 1 : 0,
    created_at: String(row.created_at ?? ""),
    source: "v2",
    event_year: year,
  }
}

function isMissingEventYearColumn(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  return /no such column:\s*event_year/i.test(message)
}

async function fetchLegacyRegistrations(filters: ListFilters): Promise<AdminRegistrationListRow[]> {
  try {
    return await fetchLegacyRegistrationsForYear(filters)
  } catch (error) {
    if (filters.year !== 2026 || !isMissingEventYearColumn(error)) {
      throw error
    }
    return fetchLegacyRegistrationsForYear({ ...filters, year: 2026 }, { ignoreEventYear: true })
  }
}

async function fetchLegacyRegistrationsForYear(
  filters: ListFilters,
  options?: { ignoreEventYear?: boolean },
): Promise<AdminRegistrationListRow[]> {
  const { year, search = "", lodging } = filters
  const hasSearch = search.length > 0
  const hasLodging = lodging && lodging !== "all"
  const searchPattern = `%${search}%`
  const ignoreEventYear = options?.ignoreEventYear ?? false

  let rows: SqlRow[] = []

  if (ignoreEventYear) {
    if (hasSearch && hasLodging) {
      rows = await sql`
        SELECT 
          r.*,
          COUNT(fm.id) as attendee_count,
          (COALESCE(r.lodging_total, 0) + COALESCE(r.tshirt_total, 0) + COALESCE(r.climbing_tower_total, 0) + COALESCE(r.registration_fee, 0)) as total_cost
        FROM registrations r
        LEFT JOIN family_members fm ON r.id = fm.registration_id
        WHERE (r.family_last_name LIKE ${searchPattern} OR r.email LIKE ${searchPattern})
          AND r.lodging_type = ${lodging}
        GROUP BY r.id
        ORDER BY r.created_at DESC
      `
    } else if (hasSearch) {
      rows = await sql`
        SELECT 
          r.*,
          COUNT(fm.id) as attendee_count,
          (COALESCE(r.lodging_total, 0) + COALESCE(r.tshirt_total, 0) + COALESCE(r.climbing_tower_total, 0) + COALESCE(r.registration_fee, 0)) as total_cost
        FROM registrations r
        LEFT JOIN family_members fm ON r.id = fm.registration_id
        WHERE (r.family_last_name LIKE ${searchPattern} OR r.email LIKE ${searchPattern})
        GROUP BY r.id
        ORDER BY r.created_at DESC
      `
    } else if (hasLodging) {
      rows = await sql`
        SELECT 
          r.*,
          COUNT(fm.id) as attendee_count,
          (COALESCE(r.lodging_total, 0) + COALESCE(r.tshirt_total, 0) + COALESCE(r.climbing_tower_total, 0) + COALESCE(r.registration_fee, 0)) as total_cost
        FROM registrations r
        LEFT JOIN family_members fm ON r.id = fm.registration_id
        WHERE r.lodging_type = ${lodging}
        GROUP BY r.id
        ORDER BY r.created_at DESC
      `
    } else {
      rows = await sql`
        SELECT 
          r.*,
          COUNT(fm.id) as attendee_count,
          (COALESCE(r.lodging_total, 0) + COALESCE(r.tshirt_total, 0) + COALESCE(r.climbing_tower_total, 0) + COALESCE(r.registration_fee, 0)) as total_cost
        FROM registrations r
        LEFT JOIN family_members fm ON r.id = fm.registration_id
        GROUP BY r.id
        ORDER BY r.created_at DESC
      `
    }
  } else if (hasSearch && hasLodging) {
    rows = await sql`
      SELECT 
        r.*,
        COUNT(fm.id) as attendee_count,
        (COALESCE(r.lodging_total, 0) + COALESCE(r.tshirt_total, 0) + COALESCE(r.climbing_tower_total, 0) + COALESCE(r.registration_fee, 0)) as total_cost
      FROM registrations r
      LEFT JOIN family_members fm ON r.id = fm.registration_id
      WHERE COALESCE(r.event_year, 2026) = ${year}
        AND (r.family_last_name LIKE ${searchPattern} OR r.email LIKE ${searchPattern})
        AND r.lodging_type = ${lodging}
      GROUP BY r.id
      ORDER BY r.created_at DESC
    `
  } else if (hasSearch) {
    rows = await sql`
      SELECT 
        r.*,
        COUNT(fm.id) as attendee_count,
        (COALESCE(r.lodging_total, 0) + COALESCE(r.tshirt_total, 0) + COALESCE(r.climbing_tower_total, 0) + COALESCE(r.registration_fee, 0)) as total_cost
      FROM registrations r
      LEFT JOIN family_members fm ON r.id = fm.registration_id
      WHERE COALESCE(r.event_year, 2026) = ${year}
        AND (r.family_last_name LIKE ${searchPattern} OR r.email LIKE ${searchPattern})
      GROUP BY r.id
      ORDER BY r.created_at DESC
    `
  } else if (hasLodging) {
    rows = await sql`
      SELECT 
        r.*,
        COUNT(fm.id) as attendee_count,
        (COALESCE(r.lodging_total, 0) + COALESCE(r.tshirt_total, 0) + COALESCE(r.climbing_tower_total, 0) + COALESCE(r.registration_fee, 0)) as total_cost
      FROM registrations r
      LEFT JOIN family_members fm ON r.id = fm.registration_id
      WHERE COALESCE(r.event_year, 2026) = ${year}
        AND r.lodging_type = ${lodging}
      GROUP BY r.id
      ORDER BY r.created_at DESC
    `
  } else {
    rows = await sql`
      SELECT 
        r.*,
        COUNT(fm.id) as attendee_count,
        (COALESCE(r.lodging_total, 0) + COALESCE(r.tshirt_total, 0) + COALESCE(r.climbing_tower_total, 0) + COALESCE(r.registration_fee, 0)) as total_cost
      FROM registrations r
      LEFT JOIN family_members fm ON r.id = fm.registration_id
      WHERE COALESCE(r.event_year, 2026) = ${year}
      GROUP BY r.id
      ORDER BY r.created_at DESC
    `
  }

  return rows.map((row) => mapLegacyRow(row, year))
}

async function fetchV2Registrations(filters: ListFilters): Promise<AdminRegistrationListRow[]> {
  const { year, search = "", lodging } = filters
  const hasSearch = search.length > 0
  const hasLodging = lodging && lodging !== "all"
  const searchPattern = `%${search}%`

  let rows: SqlRow[] = []

  if (hasSearch && hasLodging) {
    rows = await sql`
      SELECT
        r.id,
        r.lodging_type,
        r.payment_status,
        r.total_cost,
        r.deposit_paid,
        r.created_at,
        f.family_last_name,
        f.email,
        COUNT(ra.id) as attendee_count
      FROM registrations_v2 r
      JOIN families f ON r.family_id = f.id
      LEFT JOIN registration_attendees ra ON ra.registration_id = r.id
      WHERE r.event_year = ${year}
        AND (f.family_last_name LIKE ${searchPattern} OR f.email LIKE ${searchPattern})
        AND r.lodging_type = ${lodging}
      GROUP BY r.id
      ORDER BY r.created_at DESC
    `
  } else if (hasSearch) {
    rows = await sql`
      SELECT
        r.id,
        r.lodging_type,
        r.payment_status,
        r.total_cost,
        r.deposit_paid,
        r.created_at,
        f.family_last_name,
        f.email,
        COUNT(ra.id) as attendee_count
      FROM registrations_v2 r
      JOIN families f ON r.family_id = f.id
      LEFT JOIN registration_attendees ra ON ra.registration_id = r.id
      WHERE r.event_year = ${year}
        AND (f.family_last_name LIKE ${searchPattern} OR f.email LIKE ${searchPattern})
      GROUP BY r.id
      ORDER BY r.created_at DESC
    `
  } else if (hasLodging) {
    rows = await sql`
      SELECT
        r.id,
        r.lodging_type,
        r.payment_status,
        r.total_cost,
        r.deposit_paid,
        r.created_at,
        f.family_last_name,
        f.email,
        COUNT(ra.id) as attendee_count
      FROM registrations_v2 r
      JOIN families f ON r.family_id = f.id
      LEFT JOIN registration_attendees ra ON ra.registration_id = r.id
      WHERE r.event_year = ${year}
        AND r.lodging_type = ${lodging}
      GROUP BY r.id
      ORDER BY r.created_at DESC
    `
  } else {
    rows = await sql`
      SELECT
        r.id,
        r.lodging_type,
        r.payment_status,
        r.total_cost,
        r.deposit_paid,
        r.created_at,
        f.family_last_name,
        f.email,
        COUNT(ra.id) as attendee_count
      FROM registrations_v2 r
      JOIN families f ON r.family_id = f.id
      LEFT JOIN registration_attendees ra ON ra.registration_id = r.id
      WHERE r.event_year = ${year}
      GROUP BY r.id
      ORDER BY r.created_at DESC
    `
  }

  return rows.map((row) => mapV2Row(row, year))
}

/** Attach pending/total signature-request counts to legacy rows. */
async function annotateSignatureCounts(rows: AdminRegistrationListRow[]): Promise<void> {
  if (rows.length === 0) return
  let counts: SqlRow[] = []
  try {
    counts = await sql`
      SELECT
        registration_id,
        COUNT(*) as total,
        SUM(CASE WHEN signed_at IS NULL THEN 1 ELSE 0 END) as pending
      FROM signature_requests
      GROUP BY registration_id
    `
  } catch {
    // Table doesn't exist yet (feature never enabled) — nothing to annotate.
    return
  }
  const byId = new Map(counts.map((c) => [String(c.registration_id), c]))
  for (const row of rows) {
    if (row.source !== "legacy") continue
    const count = byId.get(row.id)
    if (!count) continue
    row.signatures_total = Number(count.total ?? 0)
    row.signatures_pending = Number(count.pending ?? 0)
  }
}

export async function fetchAdminRegistrationList(
  filters: ListFilters,
): Promise<AdminRegistrationListRow[]> {
  const legacyRows = await fetchLegacyRegistrations(filters)
  await annotateSignatureCounts(legacyRows)
  if (filters.year !== 2027) {
    return legacyRows
  }

  const v2Rows = await fetchV2Registrations(filters)
  const merged = [...legacyRows, ...v2Rows]
  merged.sort((a, b) => {
    const aTime = Date.parse(a.created_at)
    const bTime = Date.parse(b.created_at)
    if (Number.isNaN(aTime) || Number.isNaN(bTime)) {
      return b.created_at.localeCompare(a.created_at)
    }
    return bTime - aTime
  })
  return merged
}

export function parseLegacyRegistrationId(id: string): string | null {
  if (id.startsWith("v2:")) return null
  return id
}
