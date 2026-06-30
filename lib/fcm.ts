import { importPKCS8, SignJWT } from "jose"

export interface FcmAlertPayload {
  title: string
  body: string
  url?: string
}

export interface FcmSendResult {
  deviceToken: string
  success: boolean
  status?: number
  reason?: string
}

interface ServiceAccountCreds {
  clientEmail: string
  privateKeyPem: string
}

function hasServiceAccountCreds(): boolean {
  if (process.env.FCM_SERVICE_ACCOUNT_JSON) return true
  return Boolean(process.env.FCM_CLIENT_EMAIL && process.env.FCM_PRIVATE_KEY)
}

export function isFcmConfigured(): boolean {
  return Boolean(process.env.FCM_PROJECT_ID && hasServiceAccountCreds())
}

function loadServiceAccount(): ServiceAccountCreds | null {
  const jsonRaw = process.env.FCM_SERVICE_ACCOUNT_JSON
  if (jsonRaw) {
    try {
      const parsed = JSON.parse(jsonRaw) as { client_email?: string; private_key?: string }
      if (parsed.client_email && parsed.private_key) {
        return {
          clientEmail: parsed.client_email,
          privateKeyPem: parsed.private_key.replace(/\\n/g, "\n"),
        }
      }
    } catch (error) {
      console.error("[fcm] Failed to parse FCM_SERVICE_ACCOUNT_JSON:", error)
      return null
    }
  }

  const clientEmail = process.env.FCM_CLIENT_EMAIL
  const privateKey = process.env.FCM_PRIVATE_KEY
  if (!clientEmail || !privateKey) return null

  return {
    clientEmail,
    privateKeyPem: privateKey.replace(/\\n/g, "\n"),
  }
}

let cachedAccessToken: { token: string; expiresAt: number } | null = null

async function fcmAccessToken(): Promise<string | null> {
  const creds = loadServiceAccount()
  if (!creds) return null

  const now = Math.floor(Date.now() / 1000)
  if (cachedAccessToken && cachedAccessToken.expiresAt > now + 60) {
    return cachedAccessToken.token
  }

  try {
    const privateKey = await importPKCS8(creds.privateKeyPem, "RS256")
    const assertion = await new SignJWT({
      scope: "https://www.googleapis.com/auth/firebase.messaging",
    })
      .setProtectedHeader({ alg: "RS256", typ: "JWT" })
      .setIssuer(creds.clientEmail)
      .setSubject(creds.clientEmail)
      .setAudience("https://oauth2.googleapis.com/token")
      .setIssuedAt(now)
      .setExpirationTime(now + 3600)
      .sign(privateKey)

    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion,
      }),
    })

    if (!response.ok) {
      const body = await response.text()
      console.error("[fcm] OAuth token error:", response.status, body)
      return null
    }

    const data = (await response.json()) as { access_token?: string; expires_in?: number }
    if (!data.access_token) return null

    cachedAccessToken = {
      token: data.access_token,
      expiresAt: now + (data.expires_in ?? 3600),
    }
    return data.access_token
  } catch (error) {
    console.error("[fcm] Failed to obtain access token:", error)
    return null
  }
}

export function isPermanentFcmTokenFailure(reason?: string): boolean {
  if (!reason) return false
  const upper = reason.toUpperCase()
  return (
    upper.includes("UNREGISTERED") ||
    upper.includes("NOT_FOUND") ||
    (upper.includes("INVALID_ARGUMENT") &&
      (upper.includes("REGISTRATION") || upper.includes("TOKEN")))
  )
}

async function sendOne(
  deviceToken: string,
  accessToken: string,
  projectId: string,
  payload: FcmAlertPayload,
): Promise<FcmSendResult> {
  const message: Record<string, unknown> = {
    token: deviceToken,
    notification: {
      title: payload.title,
      body: payload.body,
    },
    android: {
      priority: "HIGH",
    },
  }

  if (payload.url) {
    message.data = { url: payload.url }
  }

  try {
    const response = await fetch(
      `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message }),
      },
    )

    if (response.ok) {
      return { deviceToken, success: true, status: response.status }
    }

    const body = await response.text()
    let reason = body
    try {
      const parsed = JSON.parse(body) as {
        error?: { message?: string; status?: string }
      }
      reason = parsed.error?.status ?? parsed.error?.message ?? body
    } catch {
      // keep raw body
    }

    return { deviceToken, success: false, status: response.status, reason }
  } catch (error) {
    return { deviceToken, success: false, reason: String(error) }
  }
}

/** Send an FCM alert to many device tokens (best-effort per token). */
export async function sendFcmAlerts(
  deviceTokens: string[],
  payload: FcmAlertPayload,
): Promise<FcmSendResult[]> {
  const projectId = process.env.FCM_PROJECT_ID
  if (!projectId) {
    return deviceTokens.map((deviceToken) => ({
      deviceToken,
      success: false,
      reason: "FCM not configured",
    }))
  }

  const accessToken = await fcmAccessToken()
  if (!accessToken) {
    return deviceTokens.map((deviceToken) => ({
      deviceToken,
      success: false,
      reason: "FCM not configured",
    }))
  }

  const results: FcmSendResult[] = []
  for (const token of deviceTokens) {
    results.push(await sendOne(token, accessToken, projectId, payload))
  }
  return results
}
