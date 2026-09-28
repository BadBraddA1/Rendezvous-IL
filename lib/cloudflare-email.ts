/**
 * Cloudflare Email Sending REST client.
 * Same call shape as lib/sendkit.ts so mail routing can swap providers.
 *
 * Auth: CLOUDFLARE_EMAIL_API_TOKEN only (Account → Email Sending → Write).
 * Do NOT reuse the laptop/DNS god key. Needs CLOUDFLARE_ACCOUNT_ID
 * and an onboarded sending domain (rendezvousil.com).
 */

const CF_ACCOUNT =
  process.env.CLOUDFLARE_ACCOUNT_ID?.trim() ||
  "3b39955f13b1fc5364775d978622d3e1"

export type CloudflareAttachment = {
  filename: string
  content: Buffer | Uint8Array | string
  contentType?: string
}

export type CloudflareSendParams = {
  from?: string
  to: string | string[]
  subject: string
  html?: string
  text?: string
  cc?: string | string[]
  bcc?: string | string[]
  replyTo?: string | string[]
  headers?: Record<string, string>
  attachments?: CloudflareAttachment[]
}

export type CloudflareSendResult = {
  data: { id: string } | null
  error: { name: string; message: string; statusCode?: number } | null
}

export const CLOUDFLARE_EMAIL_MAX_RECIPIENTS = 50

export function cloudflareEmailToken(): string | undefined {
  return process.env.CLOUDFLARE_EMAIL_API_TOKEN?.trim() || undefined
}

export function cloudflareEmailConfigured(): boolean {
  return Boolean(cloudflareEmailToken() && CF_ACCOUNT)
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

/** Parse `Name <addr@host>` or bare address into CF REST `{ address, name? }`. */
export function parseMailbox(raw: string): { address: string; name?: string } {
  const s = raw.trim()
  const m = s.match(/^(?:"?([^"]*)"?\s*)?<([^>]+)>$/)
  if (m) {
    const name = m[1]?.trim()
    return name ? { address: m[2].trim(), name } : { address: m[2].trim() }
  }
  return { address: s }
}

async function send(params: CloudflareSendParams): Promise<CloudflareSendResult> {
  const token = cloudflareEmailToken()
  if (!token) {
    const error = {
      name: "not_configured",
      message: "CLOUDFLARE_EMAIL_API_TOKEN is not set",
    }
    console.error("[cloudflare-email] not configured — skipped:", params.subject)
    return { data: null, error }
  }

  const recipients = toArray(params.to)
  if (!recipients) {
    return {
      data: null,
      error: { name: "validation_error", message: "No recipients" },
    }
  }
  if (recipients.length > CLOUDFLARE_EMAIL_MAX_RECIPIENTS) {
    return {
      data: null,
      error: {
        name: "validation_error",
        message: `Too many recipients (${recipients.length}); max ${CLOUDFLARE_EMAIL_MAX_RECIPIENTS}`,
      },
    }
  }

  if (!params.from?.trim()) {
    return {
      data: null,
      error: { name: "validation_error", message: "from is required" },
    }
  }

  const body: Record<string, unknown> = {
    from: parseMailbox(params.from),
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
  if (replyTo?.length) {
    body.reply_to = parseMailbox(replyTo[0])
  }

  if (params.headers) body.headers = params.headers

  if (params.attachments?.length) {
    body.attachments = params.attachments.map((a) => ({
      content: toBase64(a.content),
      filename: a.filename,
      type: a.contentType || "application/octet-stream",
      disposition: "attachment",
    }))
  }

  const url = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT}/email/sending/send`

  let res: Response
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Network error"
    console.error("[cloudflare-email] request failed:", message)
    return { data: null, error: { name: "network_error", message } }
  }

  const raw = await res.text()
  let parsed: {
    success?: boolean
    errors?: Array<{ code?: number; message?: string }>
    result?: {
      delivered?: string[]
      queued?: string[]
      permanent_bounces?: string[]
    }
  } = {}
  try {
    parsed = raw ? JSON.parse(raw) : {}
  } catch {
    // fall through
  }

  if (!res.ok || parsed.success === false) {
    const msg =
      parsed.errors?.[0]?.message ||
      (raw.trim() ? raw.slice(0, 240) : `HTTP ${res.status}`)
    const error = {
      name: "send_failed",
      message: msg,
      statusCode: res.status,
    }
    console.error("[cloudflare-email] send failed:", res.status, error.message)
    return { data: null, error }
  }

  const id =
    parsed.result?.delivered?.[0] ||
    parsed.result?.queued?.[0] ||
    "cf-ok"
  return { data: { id }, error: null }
}

export const cloudflareEmail = { emails: { send } }
