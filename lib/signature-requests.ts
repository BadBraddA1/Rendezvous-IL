import { randomBytes } from "node:crypto"
import { sql } from "@/lib/db"
import { resend } from "@/lib/resend"
import { generateSignatureRequestEmail } from "@/lib/email-templates"
import type { RegistrationData } from "@/types/registration"

export type SignatureRequestRow = {
  id: number
  registration_id: number
  role: "father" | "mother" | "primary"
  parent_name: string
  email: string
  token: string
  signed_name: string | null
  signed_at: string | null
  sent_at: string | null
}

let tableEnsured = false

/** Lazily create the table (mirrors scripts/create-signature-requests-table.sql). */
export async function ensureSignatureRequestsTable(): Promise<void> {
  if (tableEnsured) return
  await sql.query(`
    CREATE TABLE IF NOT EXISTS signature_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      registration_id INTEGER NOT NULL,
      role TEXT NOT NULL,
      parent_name TEXT NOT NULL,
      email TEXT NOT NULL,
      token TEXT NOT NULL UNIQUE,
      signed_name TEXT,
      signed_at TEXT,
      sent_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `)
  await sql.query(
    "CREATE INDEX IF NOT EXISTS idx_signature_requests_token ON signature_requests(token)",
  )
  await sql.query(
    "CREATE INDEX IF NOT EXISTS idx_signature_requests_registration ON signature_requests(registration_id)",
  )
  tableEnsured = true
}

function generateToken(): string {
  return randomBytes(32).toString("hex")
}

const FROM_ADDRESS = "Rendezvous IL <noreply@rendezvousil.com>"

async function sendRequestEmail(
  request: Pick<SignatureRequestRow, "id" | "parent_name" | "email" | "token">,
  familyLastName: string,
  baseUrl: string,
): Promise<boolean> {
  try {
    await resend.emails.send({
      from: FROM_ADDRESS,
      to: request.email,
      subject: "Signature needed — Rendezvous 2027 registration",
      html: generateSignatureRequestEmail({
        parentName: request.parent_name,
        familyLastName,
        signUrl: `${baseUrl}/sign/${request.token}`,
      }),
    })
    await sql`
      UPDATE signature_requests SET sent_at = CURRENT_TIMESTAMP WHERE id = ${request.id}
    `
    return true
  } catch (error) {
    console.error(`[signatures] Failed to send signing email to ${request.email}:`, error)
    return false
  }
}

/**
 * Create one signing request per parent (father/mother roles) and email each
 * a personal signing link. Falls back to a single request to the primary
 * registration email when no parent roles were selected, so every family
 * signs at least once. Email failures don't block registration — admins can
 * resend from the dashboard.
 */
export async function createSignatureRequests(
  registrationId: number,
  data: RegistrationData,
  baseUrl: string,
): Promise<void> {
  await ensureSignatureRequestsTable()

  const parents = data.familyMembers
    .filter((m) => m.parentRole && m.email?.trim())
    .map((m) => ({
      role: m.parentRole as "father" | "mother",
      name: `${m.firstName} ${m.useCustomLastName && m.lastName ? m.lastName : data.familyLastName}`.trim(),
      email: m.email!.trim(),
    }))

  const targets =
    parents.length > 0
      ? parents
      : [
          {
            role: "primary" as const,
            name: `${data.familyLastName} Family`.trim(),
            email: data.email.trim(),
          },
        ]

  for (const target of targets) {
    if (!target.email) continue
    const token = generateToken()
    const [row] = await sql`
      INSERT INTO signature_requests (registration_id, role, parent_name, email, token)
      VALUES (${registrationId}, ${target.role}, ${target.name}, ${target.email}, ${token})
      RETURNING id
    `
    await sendRequestEmail(
      { id: Number(row.id), parent_name: target.name, email: target.email, token },
      data.familyLastName,
      baseUrl,
    )
  }
}

export type SignatureRequestWithContext = {
  request: SignatureRequestRow
  familyLastName: string
  others: Array<Pick<SignatureRequestRow, "parent_name" | "role" | "signed_at">>
}

export async function getSignatureRequestByToken(
  token: string,
): Promise<SignatureRequestWithContext | null> {
  await ensureSignatureRequestsTable()
  const [row] = await sql`
    SELECT sr.*, r.family_last_name
    FROM signature_requests sr
    JOIN registrations r ON r.id = sr.registration_id
    WHERE sr.token = ${token}
  `
  if (!row) return null

  const others = await sql`
    SELECT parent_name, role, signed_at
    FROM signature_requests
    WHERE registration_id = ${row.registration_id} AND token != ${token}
    ORDER BY role
  `
  return {
    request: row as unknown as SignatureRequestRow,
    familyLastName: String(row.family_last_name ?? ""),
    others: others as unknown as SignatureRequestWithContext["others"],
  }
}

/** Stamp the signature. Returns false if the token is unknown. Idempotent. */
export async function signSignatureRequest(token: string, signedName: string): Promise<boolean> {
  await ensureSignatureRequestsTable()
  const [row] = await sql`
    SELECT id, signed_at FROM signature_requests WHERE token = ${token}
  `
  if (!row) return false
  if (row.signed_at) return true

  await sql`
    UPDATE signature_requests
    SET signed_name = ${signedName}, signed_at = CURRENT_TIMESTAMP
    WHERE token = ${token}
  `
  return true
}

export type RegistrationSignatureStatus = {
  total: number
  signed: number
  pendingNames: string[]
}

export async function getSignatureStatus(
  registrationId: number,
): Promise<RegistrationSignatureStatus> {
  await ensureSignatureRequestsTable()
  const rows = await sql`
    SELECT parent_name, signed_at FROM signature_requests
    WHERE registration_id = ${registrationId}
  `
  const pendingNames = rows.filter((r) => !r.signed_at).map((r) => String(r.parent_name))
  return { total: rows.length, signed: rows.length - pendingNames.length, pendingNames }
}

/** Re-send the signing email for one request (admin action). */
export async function resendSignatureEmail(requestId: number, baseUrl: string): Promise<boolean> {
  await ensureSignatureRequestsTable()
  const [row] = await sql`
    SELECT sr.id, sr.parent_name, sr.email, sr.token, r.family_last_name
    FROM signature_requests sr
    JOIN registrations r ON r.id = sr.registration_id
    WHERE sr.id = ${requestId}
  `
  if (!row) return false
  return sendRequestEmail(
    {
      id: Number(row.id),
      parent_name: String(row.parent_name),
      email: String(row.email),
      token: String(row.token),
    },
    String(row.family_last_name ?? ""),
    baseUrl,
  )
}

/** Admin override: mark one request signed without the email flow. */
export async function markSignatureRequestSigned(
  requestId: number,
  adminEmail: string,
): Promise<boolean> {
  await ensureSignatureRequestsTable()
  const [row] = await sql`
    SELECT id, signed_at FROM signature_requests WHERE id = ${requestId}
  `
  if (!row) return false
  if (row.signed_at) return true
  await sql`
    UPDATE signature_requests
    SET signed_name = ${`Marked signed by admin (${adminEmail})`}, signed_at = CURRENT_TIMESTAMP
    WHERE id = ${requestId}
  `
  return true
}

export async function getSignatureRequestsForRegistration(
  registrationId: number,
): Promise<SignatureRequestRow[]> {
  await ensureSignatureRequestsTable()
  const rows = await sql`
    SELECT * FROM signature_requests
    WHERE registration_id = ${registrationId}
    ORDER BY role
  `
  return rows as unknown as SignatureRequestRow[]
}
