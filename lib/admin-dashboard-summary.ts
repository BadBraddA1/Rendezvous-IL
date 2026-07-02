import { sql } from "@/lib/db"

export type AdminDashboardSummary = {
  eventYear: number
  registrationGoal: number
  registrations: number
  registeredAttendees: number
  checkedIn: number
  totalFamilies: number
  totalMembers: number
  expressRegistrations: number
  pendingChanges: number
  activeAnnouncements: number
  feedbackCount: number
  avgRating: number
  returningFamilies: number
  newFamilies: number
  totalRevenue: number
  depositsPaid: number
  fullyPaid: number
  balanceDue: number
  lodgingBreakdown: {
    motel: number
    rv: number
    tent: number
    drivein: number
  }
}

/** Shared stats for web admin dashboard and native admin hub. */
export async function getAdminDashboardSummary(eventYear = 2027): Promise<AdminDashboardSummary> {
  const registrationGoal = 100

  const [regStats] = await sql`
    SELECT 
      COUNT(DISTINCT r.id)::int as total_registrations,
      COUNT(DISTINCT CASE WHEN r.checked_in = true THEN r.id END)::int as checked_in,
      COALESCE(SUM(r.total_cost), 0)::numeric as total_revenue,
      COALESCE(SUM(r.deposit_paid), 0)::numeric as deposits_paid,
      COUNT(DISTINCT CASE WHEN r.payment_status = 'paid' THEN r.id END)::int as fully_paid,
      COALESCE(SUM(r.balance_due), 0)::numeric as balance_due,
      COUNT(DISTINCT CASE WHEN r.lodging_type = 'motel' THEN r.id END)::int as motel,
      COUNT(DISTINCT CASE WHEN r.lodging_type = 'rv' THEN r.id END)::int as rv,
      COUNT(DISTINCT CASE WHEN r.lodging_type = 'tent' THEN r.id END)::int as tent,
      COUNT(DISTINCT CASE WHEN r.lodging_type = 'drivein' THEN r.id END)::int as drivein
    FROM registrations_v2 r
    WHERE r.event_year = ${eventYear}
  `

  const [attendeeStats] = await sql`
    SELECT COUNT(ra.id)::int as total_attendees
    FROM registration_attendees ra
    JOIN registrations_v2 r ON ra.registration_id = r.id
    WHERE r.event_year = ${eventYear}
  `

  const [familyStats] = await sql`
    SELECT 
      COUNT(DISTINCT f.id)::int as total_families,
      COUNT(fm.id)::int as total_members
    FROM families f
    LEFT JOIN family_members_v2 fm ON f.id = fm.family_id
  `

  const [expressStats] = await sql`
    SELECT COUNT(*) as count FROM registrations
    WHERE payment_notes = 'EXPRESS_TEST' AND event_year = 2027
  `

  const [pendingStats] = await sql`
    SELECT COUNT(*)::int as count FROM pending_family_changes WHERE status = 'pending'
  `

  const [annStats] = await sql`
    SELECT COUNT(*)::int as count FROM announcements WHERE is_active = true
  `

  const [fbStats] = await sql`
    SELECT 
      COUNT(*)::int as count,
      COALESCE(AVG(
        CASE overall_experience 
          WHEN 'excellent' THEN 5 
          WHEN 'good' THEN 4 
          WHEN 'average' THEN 3 
          WHEN 'poor' THEN 2 
          ELSE NULL 
        END
      ), 0)::numeric as avg_rating
    FROM event_feedback
    WHERE event_year = ${eventYear}
  `

  const [returningStats] = await sql`
    SELECT 
      COUNT(DISTINCT r2027.family_id)::int as returning_families
    FROM registrations_v2 r2027
    JOIN families f ON r2027.family_id = f.id
    WHERE r2027.event_year = ${eventYear}
    AND EXISTS (
      SELECT 1 FROM registrations r2026 
      WHERE LOWER(r2026.email) = LOWER(f.email)
    )
  `

  const registrations = regStats.total_registrations
  const returningFamilies = returningStats.returning_families

  return {
    eventYear,
    registrationGoal,
    registrations,
    registeredAttendees: attendeeStats.total_attendees,
    checkedIn: regStats.checked_in,
    totalFamilies: familyStats.total_families,
    totalMembers: familyStats.total_members,
    expressRegistrations: expressStats.count,
    pendingChanges: pendingStats.count,
    activeAnnouncements: annStats.count,
    feedbackCount: fbStats.count,
    avgRating: Number(fbStats.avg_rating),
    returningFamilies,
    newFamilies: Math.max(0, registrations - returningFamilies),
    totalRevenue: Number(regStats.total_revenue),
    depositsPaid: Number(regStats.deposits_paid),
    fullyPaid: regStats.fully_paid,
    balanceDue: Number(regStats.balance_due),
    lodgingBreakdown: {
      motel: regStats.motel,
      rv: regStats.rv,
      tent: regStats.tent,
      drivein: regStats.drivein,
    },
  }
}
