/**
 * Worker-backed R2 client for Rendezvous IL media (see worker/media.ts).
 *
 * Uploads go through the Worker rather than an S3 client so nothing here holds
 * R2 credentials — only the shared upload secret.
 *
 * App code should import lib/r2-media.ts instead, which adds the `server-only`
 * guard. This module stays guard-free so Node scripts can use it too.
 */
import { mediaKeyFromUrl, r2PublicUrl } from "./media-keys"

function workerUrl(): string | null {
  return process.env.R2_UPLOAD_WORKER_URL?.trim().replace(/\/$/, "") || null
}

function uploadSecret(): string | null {
  return process.env.R2_UPLOAD_SECRET?.trim() || null
}

export function isR2MediaConfigured(): boolean {
  return Boolean(workerUrl() && uploadSecret())
}

async function call(method: "PUT" | "DELETE", key: string, init?: RequestInit) {
  const base = workerUrl()
  const secret = uploadSecret()
  if (!base || !secret) throw new Error("R2 media upload is not configured")

  const response = await fetch(`${base}/object?key=${encodeURIComponent(key)}`, {
    ...init,
    method,
    headers: { ...(init?.headers ?? {}), "x-upload-secret": secret },
    cache: "no-store",
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => "")
    throw new Error(`R2 ${method} failed for ${key}: ${response.status} ${detail.slice(0, 200)}`)
  }
  return response
}

export async function putMediaObject(
  key: string,
  bytes: Uint8Array | ArrayBuffer,
  contentType: string,
): Promise<{ key: string; url: string }> {
  await call("PUT", key, {
    body: bytes instanceof Uint8Array ? new Uint8Array(bytes) : bytes,
    headers: { "content-type": contentType },
  })
  return { key, url: r2PublicUrl(key) }
}

export async function deleteMediaObject(key: string): Promise<void> {
  await call("DELETE", key)
}

export async function deleteMediaUrl(url: string | null | undefined): Promise<void> {
  const key = mediaKeyFromUrl(url)
  if (!key) return
  try {
    await deleteMediaObject(key)
  } catch (error) {
    console.error("[media] Failed to delete R2 object:", error)
  }
}
