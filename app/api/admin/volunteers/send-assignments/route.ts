import { type NextRequest, NextResponse } from "next/server"
import { checkAdminAuth, getAdminPermissions, logAuditAction } from "@/lib/admin-auth"
import { getRequestAuditMeta } from "@/lib/audit-log"
import { sql, type SqlRow } from "@/lib/db"
import { resend } from "@/lib/resend"
import { generateVolunteerAssignmentEmail } from "@/lib/email-templates"
import { ensureVolunteerEmailColumn, resolveVolunteerEmail } from "@/lib/volunteer-scheduling"
import { ensureLessonTables } from "@/lib/lesson-bids"
import { parseRegistrationEventYear } from "@/lib/registration-event-years"

export const dynamic = "force-dynamic"

const FROM_ADDRESS = "Rendezvous IL <noreply@rendezvousil.com>"

function formatServiceLabel(date: string, timeSlot: string): string {
  const [y, m, d] = date.split("-").map(Number)
  const parsed = new Date(y, (m ?? 1) - 1, d ?? 1)
  const dayLabel = Number.isNaN(parsed.getTime())
    ? date
    : parsed.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
  return `${dayLabel} — ${timeSlot}`
}

function roleLabel(volunteer: SqlRow): string {
  const prayerType = String(volunteer.prayer_type ?? "")
  if (prayerType === "A" || prayerType === "B") {
    return `${volunteer.volunteer_type} (Group ${prayerType})`
  }
  return prayerType || String(volunteer.volunteer_type ?? "")
}

/** Email every assigned volunteer their worship-service assignments for the year. */
export async function POST(req: NextRequest) {
  const admin = await checkAdminAuth()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!getAdminPermissions(admin.role).canEdit) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    await ensureLessonTables()
    await ensureVolunteerEmailColumn()
    const body = await req.json().catch(() => ({}))
    const year = parseRegistrationEventYear(body.year)

    const assigned = await sql`
      SELECT vs.*, r.family_last_name,
        COALESCE(NULLIF(vs.lesson_title, ''), lt.lesson_title, lt.title) as effective_lesson_title,
        COALESCE(NULLIF(vs.scripture_reading, ''), lt.scripture) as effective_scripture
      FROM volunteer_signups vs
      LEFT JOIN registrations r ON vs.registration_id = r.id
      LEFT JOIN lesson_topics lt ON vs.claimed_lesson_id = lt.id
      WHERE vs.assigned_date IS NOT NULL
        AND COALESCE(r.event_year, 2026) = ${year}
      ORDER BY vs.assigned_date, vs.time_slot
    `

    // One email per person, listing all of their assignments.
    const byPerson = new Map<string, SqlRow[]>()
    for (const row of assigned) {
      const key = `${row.registration_id ?? "x"}|${String(row.volunteer_name ?? "").trim().toLowerCase()}`
      const bucket = byPerson.get(key) ?? []
      bucket.push(row)
      byPerson.set(key, bucket)
    }

    let sent = 0
    const noEmail: string[] = []

    for (const rows of byPerson.values()) {
      const first = rows[0]
      const email = await resolveVolunteerEmail(first)
      if (!email) {
        noEmail.push(String(first.volunteer_name ?? "Unknown"))
        continue
      }

      try {
        await resend.emails.send({
          from: FROM_ADDRESS,
          to: email,
          subject: "Your worship service assignments — Rendezvous",
          html: generateVolunteerAssignmentEmail({
            volunteerName: String(first.volunteer_name ?? ""),
            familyLastName: String(first.family_last_name ?? ""),
            assignments: rows.map((row) => ({
              serviceLabel: formatServiceLabel(String(row.assigned_date), String(row.time_slot ?? "")),
              role: roleLabel(row),
              lessonTitle: row.effective_lesson_title ? String(row.effective_lesson_title) : null,
              scripture: row.effective_scripture ? String(row.effective_scripture) : null,
            })),
          }),
        })
      } catch (error) {
        console.error(`[send-assignments] Failed to email ${email}:`, error)
        noEmail.push(String(first.volunteer_name ?? "Unknown"))
        continue
      }

      for (const row of rows) {
        await sql`
          UPDATE volunteer_signups SET schedule_email_sent_at = CURRENT_TIMESTAMP WHERE id = ${row.id}
        `
      }
      sent += 1
    }

    const { ipAddress, userAgent } = getRequestAuditMeta(req)
    await logAuditAction(
      admin.email,
      "send_volunteer_assignments",
      "volunteer_signup",
      undefined,
      { event_year: year, emails_sent: sent, no_email: noEmail },
      ipAddress,
      userAgent,
    )

    return NextResponse.json({ success: true, sent, noEmail })
  } catch (error) {
    console.error("[admin/volunteers] send-assignments error:", error)
    return NextResponse.json({ error: "Failed to send assignment emails" }, { status: 500 })
  }
}
