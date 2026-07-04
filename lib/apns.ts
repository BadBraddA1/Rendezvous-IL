import http2 from "node:http2"
import { importPKCS8, SignJWT } from "jose"
import { readFileSync } from "node:fs"

export type ApnsEnvironment = "sandbox" | "production"

export interface ApnsAlertPayload {
  title: string
  body: string
  url?: string
  badge?: number
  threadId?: string
}

export interface ApnsSendResult {
  deviceToken: string
  success: boolean
  status?: number
  reason?: string
}

function apnsHost(environment: ApnsEnvironment): string {
  return environment === "sandbox" ? "api.sandbox.push.apple.com" : "api.push.apple.com"
}

async function loadPrivateKey(): Promise<CryptoKey | null> {
  const inline = process.env.APNS_AUTH_KEY
  const path = process.env.APNS_KEY_PATH

  try {
    const pem = inline
      ? inline.replace(/\\n/g, "\n")
      : path
        ? readFileSync(path, "utf8")
        : null
    if (!pem) return null
    return await importPKCS8(pem, "ES256")
  } catch (error) {
    console.error("[apns] Failed to load auth key:", error)
    return null
  }
}

let cachedJwt: { token: string; expiresAt: number } | null = null

async function apnsJwt(): Promise<string | null> {
  const keyId = process.env.APNS_KEY_ID
  const teamId = process.env.APNS_TEAM_ID
  if (!keyId || !teamId) return null

  const now = Math.floor(Date.now() / 1000)
  if (cachedJwt && cachedJwt.expiresAt > now + 60) {
    return cachedJwt.token
  }

  const privateKey = await loadPrivateKey()
  if (!privateKey) return null

  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: keyId })
    .setIssuer(teamId)
    .setIssuedAt(now)
    .sign(privateKey)

  cachedJwt = { token, expiresAt: now + 3000 }
  return token
}

export function isApnsConfigured(): boolean {
  return Boolean(
    process.env.APNS_KEY_ID &&
      process.env.APNS_TEAM_ID &&
      (process.env.APNS_AUTH_KEY || process.env.APNS_KEY_PATH),
  )
}

export function defaultApnsTopic(): string {
  // Must match the iOS app PRODUCT_BUNDLE_IDENTIFIER (TestFlight / App Store).
  return process.env.APNS_BUNDLE_ID || "com.rendezvousil.braddcorp.app"
}

export function defaultApnsEnvironment(): ApnsEnvironment {
  return process.env.APNS_ENVIRONMENT === "sandbox" ? "sandbox" : "production"
}

function sendOne(
  host: string,
  deviceToken: string,
  jwt: string,
  topic: string,
  payload: ApnsAlertPayload,
  pushType: "alert" | "background" = "alert",
): Promise<ApnsSendResult> {
  return new Promise((resolve) => {
    const client = http2.connect(`https://${host}`)

    const body = JSON.stringify({
      aps: {
        alert: { title: payload.title, body: payload.body },
        sound: "default",
        ...(payload.badge !== undefined ? { badge: payload.badge } : {}),
        ...(payload.threadId ? { "thread-id": payload.threadId } : {}),
      },
      ...(payload.url ? { url: payload.url } : {}),
    })

    const req = client.request({
      ":method": "POST",
      ":path": `/3/device/${deviceToken}`,
      authorization: `bearer ${jwt}`,
      "apns-topic": topic,
      "apns-push-type": pushType,
      "apns-priority": pushType === "alert" ? "10" : "5",
      "content-type": "application/json",
    })

    req.setEncoding("utf8")
    let responseBody = ""

    req.on("response", (headers) => {
      const status = headers[":status"] as number
      req.on("data", (chunk) => {
        responseBody += chunk
      })
      req.on("end", () => {
        client.close()
        if (status === 200) {
          resolve({ deviceToken, success: true, status })
        } else {
          let reason = responseBody
          try {
            reason = JSON.parse(responseBody)?.reason ?? responseBody
          } catch {
            // keep raw body
          }
          resolve({ deviceToken, success: false, status, reason })
        }
      })
    })

    req.on("error", (error) => {
      client.close()
      resolve({ deviceToken, success: false, reason: String(error) })
    })

    req.write(body)
    req.end()
  })
}

/** Send an APNs alert to many device tokens (best-effort per token). */
export async function sendApnsAlerts(
  deviceTokens: string[],
  payload: ApnsAlertPayload,
  options?: { topic?: string; environment?: ApnsEnvironment },
): Promise<ApnsSendResult[]> {
  const jwt = await apnsJwt()
  if (!jwt) {
    return deviceTokens.map((deviceToken) => ({
      deviceToken,
      success: false,
      reason: "APNs not configured",
    }))
  }

  const host = apnsHost(options?.environment ?? defaultApnsEnvironment())
  const topic = options?.topic ?? defaultApnsTopic()

  // Send in parallel — sequential HTTP/2 connects made chat pushes feel slow.
  return Promise.all(
    deviceTokens.map((token) => sendOne(host, token, jwt, topic, payload)),
  )
}

/** Live Activity update via ActivityKit push (apns-push-type: liveactivity). */
export async function sendApnsLiveActivity(
  activityToken: string,
  contentState: Record<string, unknown>,
  options?: { topic?: string; environment?: ApnsEnvironment; event?: "update" | "end" },
): Promise<ApnsSendResult> {
  const jwt = await apnsJwt()
  if (!jwt) {
    return { deviceToken: activityToken, success: false, reason: "APNs not configured" }
  }

  const host = apnsHost(options?.environment ?? defaultApnsEnvironment())
  const topic = `${options?.topic ?? defaultApnsTopic()}.push-type.liveactivity`
  const event = options?.event ?? "update"

  return new Promise((resolve) => {
    const client = http2.connect(`https://${host}`)
    const body = JSON.stringify({
      aps: {
        timestamp: Math.floor(Date.now() / 1000),
        event,
        "content-state": contentState,
      },
    })

    const req = client.request({
      ":method": "POST",
      ":path": `/3/device/${activityToken}`,
      authorization: `bearer ${jwt}`,
      "apns-topic": topic,
      "apns-push-type": "liveactivity",
      "apns-priority": "10",
      "content-type": "application/json",
    })

    req.setEncoding("utf8")
    let responseBody = ""

    req.on("response", (headers) => {
      const status = headers[":status"] as number
      req.on("data", (chunk) => {
        responseBody += chunk
      })
      req.on("end", () => {
        client.close()
        resolve({
          deviceToken: activityToken,
          success: status === 200,
          status,
          reason: status === 200 ? undefined : responseBody,
        })
      })
    })

    req.on("error", (error) => {
      client.close()
      resolve({ deviceToken: activityToken, success: false, reason: String(error) })
    })

    req.write(body)
    req.end()
  })
}
