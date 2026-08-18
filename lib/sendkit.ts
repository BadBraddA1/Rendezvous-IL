// SendKit transactional email client.
//
// Exposes the same `sendkit.emails.send({ ... })` call shape the codebase used
// with Resend, so call sites only change their import and sender address.
// SendKit differs from Resend in two ways this module normalises:
//   - `reply_to` is an array, not a string
//   - attachment content must be base64, not a Buffer

const SENDKIT_API = "https://api.sendkit.dev"

export type SendkitAttachment = {
  filename: string
  content: Buffer | Uint8Array | string
  contentType?: string
}

export type SendEmailParams = {
  /** Defaults to EMAIL_FROM when omitted. Must be on a SendKit-verified domain. */
  from?: string
  to: string | string[]
  subject: string
  html?: string
  text?: string
  cc?: string | string[]
  bcc?: string | string[]
  replyTo?: string | string[]
  headers?: Record<string, string>
  attachments?: SendkitAttachment[]
}

export type SendEmailResult = {
  data: { id: string } | null
  error: { name: string; message: string; statusCode?: number } | null
}

/** SendKit rejects more than 50 recipients in a single request. */
export const SENDKIT_MAX_RECIPIENTS = 50

export function emailFrom(): string {
  return (
    process.env.EMAIL_FROM?.trim() ||
    "Rendezvous IL <noreply@rendezvousil.com>"
  )
}

/** Registration/signature mail sends from the Registration@ sender. */
export function registrationEmailFrom(): string {
  return (
    process.env.EMAIL_FROM_REGISTRATION?.trim() ||
    "Rendezvous Registration <Registration@rendezvousil.com>"
  )
}

export function emailConfigured(): boolean {
  return Boolean(process.env.SENDKIT_API_KEY?.trim())
}

function toBase64(content: Buffer | Uint8Array | string): string {
  if (typeof content === "string") return Buffer.from(content).toString("base64")
  return Buffer.from(content).toString("base64")
}

function toArray(value: string | string[] | undefined): string[] | undefined {
  if (value == null) return undefined
  const list = (Array.isArray(value) ? value : [value])
    .map((v) => v.trim())
    .filter(Boolean)
  return list.length > 0 ? list : undefined
}

async function send(params: SendEmailParams): Promise<SendEmailResult> {
  const apiKey = process.env.SENDKIT_API_KEY?.trim()
  if (!apiKey) {
    const error = {
      name: "not_configured",
      message: "SENDKIT_API_KEY is not set",
    }
    console.error("[sendkit] not configured — skipped:", params.subject)
    return { data: null, error }
  }

  const recipients = toArray(params.to)
  if (!recipients) {
    return {
      data: null,
      error: { name: "validation_error", message: "No recipients" },
    }
  }
  if (recipients.length > SENDKIT_MAX_RECIPIENTS) {
    return {
      data: null,
      error: {
        name: "validation_error",
        message: `Too many recipients (${recipients.length}); SendKit allows ${SENDKIT_MAX_RECIPIENTS} per request`,
      },
    }
  }

  const body: Record<string, unknown> = {
    from: params.from?.trim() || emailFrom(),
    to: recipients.length === 1 ? recipients[0] : recipients,
    subject: params.subject,
  }
  if (params.html) body.html = params.html
  if (params.text) body.text = params.text

  const cc = toArray(params.cc)
  if (cc) body.cc = cc
  const bcc = toArray(params.bcc)
  if (bcc) body.bcc = bcc
  const replyTo = toArray(params.replyTo)
  if (replyTo) body.reply_to = replyTo
  if (params.headers) body.headers = params.headers

  if (params.attachments?.length) {
    body.attachments = params.attachments.map((a) => ({
      filename: a.filename,
      content: toBase64(a.content),
      ...(a.contentType ? { content_type: a.contentType } : {}),
    }))
  }

  let res: Response
  try {
    res = await fetch(`${SENDKIT_API}/emails`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Network error"
    console.error("[sendkit] request failed:", message)
    return { data: null, error: { name: "network_error", message } }
  }

  const raw = await res.text()
  let parsed: {
    id?: string
    data?: Array<{ id?: string }>
    name?: string
    message?: string
  } = {}
  try {
    parsed = raw ? JSON.parse(raw) : {}
  } catch {
    // non-JSON body — fall through to status-based error below
  }

  if (!res.ok) {
    const error = {
      name: parsed.name || "send_failed",
      message:
        parsed.message || (raw.trim() ? raw.slice(0, 240) : `HTTP ${res.status}`),
      statusCode: res.status,
    }
    console.error("[sendkit] send failed:", res.status, error.message)
    return { data: null, error }
  }

  const id = parsed.id || parsed.data?.[0]?.id
  return { data: id ? { id } : null, error: null }
}

export const sendkit = { emails: { send } }
