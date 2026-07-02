import { randomBytes } from "node:crypto"
import { sql, type SqlRow } from "@/lib/db"
import { resend } from "@/lib/resend"
import { generateLessonBidEmail } from "@/lib/email-templates"

export type LessonTopic = {
  id: number
  title: string
  description: string | null
  sort_order: number
  event_year: number
  claimed_by_volunteer_id: number | null
  claimed_at: string | null
  /** Presenter name, denormalized for display. */
  assigned_presenter_name: string | null
}

export const DEFAULT_LESSON_EVENT_YEAR = 2027

export type LessonBid = {
  id: number
  registration_id: number | null
  invitee_name: string
  invitee_email: string
  token: string
  pick_1: number | null
  pick_2: number | null
  pick_3: number | null
  submitted_at: string | null
  email_sent_at: string | null
  claimed_topic_id: number | null
}

let tablesEnsured = false

/** Lazily create lesson tables (production DB may already have them from the old dash). */
export async function ensureLessonTables(): Promise<void> {
  if (tablesEnsured) return
  await sql.query(`
    CREATE TABLE IF NOT EXISTS lesson_topics (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      assigned_presenter_name TEXT,
      assigned_registration_id INTEGER,
      assigned_day TEXT,
      assigned_session TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      claimed_by_bid_id INTEGER,
      claimed_at TEXT,
      claimed_by_volunteer_id INTEGER,
      event_year INTEGER
    )
  `)
  // Production may have the table from the old dash without event_year.
  const topicCols = await sql.query("PRAGMA table_info(lesson_topics)")
  if (!topicCols.some((c) => c.name === "event_year")) {
    await sql.query("ALTER TABLE lesson_topics ADD COLUMN event_year INTEGER")
  }
  await sql.query(`
    CREATE TABLE IF NOT EXISTS lesson_bids (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      registration_id INTEGER,
      invitee_name TEXT NOT NULL,
      invitee_email TEXT NOT NULL,
      token TEXT NOT NULL,
      pick_1 INTEGER,
      pick_2 INTEGER,
      pick_3 INTEGER,
      submitted_at TEXT,
      email_sent_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      claimed_topic_id INTEGER
    )
  `)
  tablesEnsured = true
}

// ---------- Topics ----------

export async function listTopics(
  year: number = DEFAULT_LESSON_EVENT_YEAR,
): Promise<LessonTopic[]> {
  await ensureLessonTables()
  const rows = await sql`
    SELECT id, title, description, sort_order,
      COALESCE(event_year, ${DEFAULT_LESSON_EVENT_YEAR}) as event_year,
      claimed_by_volunteer_id, claimed_at, assigned_presenter_name
    FROM lesson_topics
    WHERE COALESCE(event_year, ${DEFAULT_LESSON_EVENT_YEAR}) = ${year}
    ORDER BY sort_order, id
  `
  return rows as unknown as LessonTopic[]
}

export async function createTopic(
  title: string,
  description: string | null,
  year: number = DEFAULT_LESSON_EVENT_YEAR,
): Promise<void> {
  await ensureLessonTables()
  await sql`
    INSERT INTO lesson_topics (title, description, event_year, sort_order)
    VALUES (
      ${title},
      ${description},
      ${year},
      (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM lesson_topics)
    )
  `
}

export async function updateTopic(
  id: number,
  title: string,
  description: string | null,
): Promise<void> {
  await ensureLessonTables()
  await sql`
    UPDATE lesson_topics
    SET title = ${title}, description = ${description}, updated_at = CURRENT_TIMESTAMP
    WHERE id = ${id}
  `
}

/** Returns false when the topic is claimed (must un-award first). */
export async function deleteTopic(id: number): Promise<boolean> {
  await ensureLessonTables()
  const [topic] = await sql`SELECT claimed_by_volunteer_id FROM lesson_topics WHERE id = ${id}`
  if (!topic) return true
  if (topic.claimed_by_volunteer_id) return false
  await sql`DELETE FROM lesson_topics WHERE id = ${id}`
  return true
}

// ---------- Invites ----------

/**
 * Best contact for a volunteer: the family member with the same first name
 * who has an email (collected on the registration form), falling back to the
 * registration's primary email.
 */
async function resolveVolunteerEmail(volunteer: SqlRow): Promise<string | null> {
  const firstName = String(volunteer.volunteer_name ?? "").trim().split(/\s+/)[0]?.toLowerCase()
  if (volunteer.registration_id && firstName) {
    const [member] = await sql`
      SELECT email FROM family_members
      WHERE registration_id = ${volunteer.registration_id}
        AND email IS NOT NULL AND email != ''
        AND LOWER(first_name) = ${firstName}
      LIMIT 1
    `
    if (member?.email) return String(member.email)
  }
  if (volunteer.registration_id) {
    const [reg] = await sql`SELECT email FROM registrations WHERE id = ${volunteer.registration_id}`
    if (reg?.email) return String(reg.email)
  }
  return null
}

export type InviteResult =
  | { ok: true; email: string }
  | { ok: false; reason: string }

/** Send (or resend) a bid invite email to a "Presenting a lesson" volunteer. */
export async function sendBidInvite(volunteerId: number, baseUrl: string): Promise<InviteResult> {
  await ensureLessonTables()

  const [volunteer] = await sql`
    SELECT vs.*, r.family_last_name, COALESCE(r.event_year, 2026) as event_year
    FROM volunteer_signups vs
    LEFT JOIN registrations r ON vs.registration_id = r.id
    WHERE vs.id = ${volunteerId}
  `
  if (!volunteer) return { ok: false, reason: "Volunteer not found" }
  const eventYear = volunteer.event_year ? Number(volunteer.event_year) : DEFAULT_LESSON_EVENT_YEAR

  const email = await resolveVolunteerEmail(volunteer)
  if (!email) {
    return { ok: false, reason: "No email on file for this volunteer's family" }
  }

  let token = volunteer.lesson_bid_token ? String(volunteer.lesson_bid_token) : null
  if (token) {
    await sql`
      UPDATE lesson_bids SET invitee_email = ${email}, email_sent_at = CURRENT_TIMESTAMP
      WHERE token = ${token}
    `
  } else {
    token = randomBytes(32).toString("hex")
    await sql`
      INSERT INTO lesson_bids (registration_id, invitee_name, invitee_email, token, email_sent_at)
      VALUES (${volunteer.registration_id}, ${volunteer.volunteer_name}, ${email}, ${token}, CURRENT_TIMESTAMP)
    `
    await sql`
      UPDATE volunteer_signups SET lesson_bid_token = ${token} WHERE id = ${volunteerId}
    `
  }

  const openTopics = (await listTopics(eventYear)).filter((t) => !t.claimed_by_volunteer_id)

  try {
    await resend.emails.send({
      from: "Rendezvous IL <noreply@rendezvousil.com>",
      to: email,
      subject: "Pick your lesson topics — Rendezvous 2027",
      html: generateLessonBidEmail({
        presenterName: String(volunteer.volunteer_name ?? ""),
        familyLastName: String(volunteer.family_last_name ?? ""),
        bidUrl: `${baseUrl}/lesson-bid/${token}`,
        openTopicCount: openTopics.length,
      }),
    })
  } catch (error) {
    console.error(`[lesson-bids] Failed to email ${email}:`, error)
    return { ok: false, reason: "Email failed to send — try again" }
  }

  await sql`
    UPDATE volunteer_signups SET lesson_bid_sent_at = CURRENT_TIMESTAMP WHERE id = ${volunteerId}
  `
  return { ok: true, email }
}

// ---------- Public bid page ----------

export type BidContext = {
  bid: LessonBid
  volunteer: { id: number; volunteer_name: string; claimed_lesson_id: number | null } | null
  familyLastName: string
  topics: LessonTopic[]
  claimedTopic: LessonTopic | null
}

export async function getBidByToken(token: string): Promise<BidContext | null> {
  await ensureLessonTables()
  const [bid] = await sql`SELECT * FROM lesson_bids WHERE token = ${token}`
  if (!bid) return null

  const [volunteer] = await sql`
    SELECT vs.id, vs.volunteer_name, vs.claimed_lesson_id, r.family_last_name,
      COALESCE(r.event_year, 2026) as event_year
    FROM volunteer_signups vs
    LEFT JOIN registrations r ON vs.registration_id = r.id
    WHERE vs.lesson_bid_token = ${token}
  `

  const eventYear = volunteer?.event_year
    ? Number(volunteer.event_year)
    : DEFAULT_LESSON_EVENT_YEAR
  const topics = await listTopics(eventYear)
  const claimedTopic = volunteer?.claimed_lesson_id
    ? (topics.find((t) => t.id === Number(volunteer.claimed_lesson_id)) ?? null)
    : null

  return {
    bid: bid as unknown as LessonBid,
    volunteer: volunteer
      ? {
          id: Number(volunteer.id),
          volunteer_name: String(volunteer.volunteer_name ?? ""),
          claimed_lesson_id: volunteer.claimed_lesson_id
            ? Number(volunteer.claimed_lesson_id)
            : null,
        }
      : null,
    familyLastName: String(volunteer?.family_last_name ?? ""),
    topics,
    claimedTopic,
  }
}

export type SubmitPicksResult = { ok: true } | { ok: false; reason: string }

/** Save ranked topic picks. Allowed to resubmit until a topic is awarded. */
export async function submitBidPicks(token: string, picks: number[]): Promise<SubmitPicksResult> {
  await ensureLessonTables()
  const context = await getBidByToken(token)
  if (!context) return { ok: false, reason: "Invalid link" }
  if (context.volunteer?.claimed_lesson_id) {
    return { ok: false, reason: "A topic has already been assigned to you" }
  }

  const validIds = new Set(context.topics.map((t) => t.id))
  const unique = [...new Set(picks)].filter((id) => validIds.has(id)).slice(0, 3)
  if (unique.length === 0) {
    return { ok: false, reason: "Pick at least one topic" }
  }

  await sql`
    UPDATE lesson_bids
    SET
      pick_1 = ${unique[0] ?? null},
      pick_2 = ${unique[1] ?? null},
      pick_3 = ${unique[2] ?? null},
      submitted_at = CURRENT_TIMESTAMP
    WHERE token = ${token}
  `
  return { ok: true }
}

// ---------- Awarding ----------

export type AwardResult = { ok: true } | { ok: false; reason: string }

export async function awardTopic(volunteerId: number, topicId: number): Promise<AwardResult> {
  await ensureLessonTables()

  const [volunteer] = await sql`SELECT * FROM volunteer_signups WHERE id = ${volunteerId}`
  if (!volunteer) return { ok: false, reason: "Volunteer not found" }

  const [topic] = await sql`SELECT * FROM lesson_topics WHERE id = ${topicId}`
  if (!topic) return { ok: false, reason: "Topic not found" }
  if (topic.claimed_by_volunteer_id && Number(topic.claimed_by_volunteer_id) !== volunteerId) {
    return { ok: false, reason: "That topic is already claimed by someone else" }
  }

  // Release any topic this volunteer previously held.
  await sql`
    UPDATE lesson_topics
    SET claimed_by_volunteer_id = NULL, claimed_at = NULL, claimed_by_bid_id = NULL,
        assigned_presenter_name = NULL, updated_at = CURRENT_TIMESTAMP
    WHERE claimed_by_volunteer_id = ${volunteerId}
  `

  const [bid] = volunteer.lesson_bid_token
    ? await sql`SELECT id FROM lesson_bids WHERE token = ${volunteer.lesson_bid_token}`
    : [undefined]

  await sql`
    UPDATE lesson_topics
    SET
      claimed_by_volunteer_id = ${volunteerId},
      claimed_by_bid_id = ${bid?.id ?? null},
      claimed_at = CURRENT_TIMESTAMP,
      assigned_presenter_name = ${volunteer.volunteer_name},
      assigned_registration_id = ${volunteer.registration_id},
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ${topicId}
  `
  await sql`
    UPDATE volunteer_signups
    SET claimed_lesson_id = ${topicId}, claimed_lesson_at = CURRENT_TIMESTAMP
    WHERE id = ${volunteerId}
  `
  if (bid?.id) {
    await sql`UPDATE lesson_bids SET claimed_topic_id = ${topicId} WHERE id = ${bid.id}`
  }
  return { ok: true }
}

export async function unawardTopic(volunteerId: number): Promise<void> {
  await ensureLessonTables()
  const [volunteer] = await sql`SELECT * FROM volunteer_signups WHERE id = ${volunteerId}`
  if (!volunteer) return

  await sql`
    UPDATE lesson_topics
    SET claimed_by_volunteer_id = NULL, claimed_at = NULL, claimed_by_bid_id = NULL,
        assigned_presenter_name = NULL, updated_at = CURRENT_TIMESTAMP
    WHERE claimed_by_volunteer_id = ${volunteerId}
  `
  await sql`
    UPDATE volunteer_signups
    SET claimed_lesson_id = NULL, claimed_lesson_at = NULL
    WHERE id = ${volunteerId}
  `
  if (volunteer.lesson_bid_token) {
    await sql`
      UPDATE lesson_bids SET claimed_topic_id = NULL WHERE token = ${volunteer.lesson_bid_token}
    `
  }
}
