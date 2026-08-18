/**
 * Pure key/URL helpers for Rendezvous IL media in R2.
 *
 * Free of `server-only` and of any network access so Node scripts can reuse it.
 */
export const MEDIA_PREFIXES = [
  "family-photos/",
  "chat-photos/",
  "photoshow/",
  "song-packs/",
  "site/",
  "Tshirts/",
] as const

const LEGACY_BLOB_HOST = "blob.vercel-storage.com"

export function publicBaseUrl(): string {
  return (
    process.env.R2_PUBLIC_BASE_URL?.trim().replace(/\/$/, "") ||
    "https://cdn.rendezvousil.com"
  )
}

export function r2PublicUrl(key: string): string {
  return `${publicBaseUrl()}/${key.split("/").map(encodeURIComponent).join("/")}`
}

/**
 * Recover the object key from a stored media URL.
 *
 * Handles both R2 URLs and legacy `*.public.blob.vercel-storage.com` URLs: the
 * two stores share identical keys because the migration preserved them.
 */
export function mediaKeyFromUrl(url: string | null | undefined): string | null {
  if (!url) return null
  let path: string
  try {
    path = decodeURIComponent(new URL(url).pathname).replace(/^\/+/, "")
  } catch {
    return null
  }
  if (!MEDIA_PREFIXES.some((prefix) => path.startsWith(prefix))) return null
  return path
}

export function isManagedMediaUrl(url: string | null | undefined): boolean {
  if (!url) return false
  try {
    const host = new URL(url).hostname
    if (host === "cdn.rendezvousil.com" || host.endsWith(`.${LEGACY_BLOB_HOST}`)) {
      return mediaKeyFromUrl(url) != null || host.endsWith(`.${LEGACY_BLOB_HOST}`)
    }
  } catch {
    return false
  }
  return false
}

/**
 * Point a stored media URL at R2. The site should never emit Blob URLs after
 * the migration; this also rewrites rows that haven't been backfilled yet.
 */
export function toPublicMediaUrl(url: string | null | undefined): string | null {
  if (!url) return null
  if (!url.includes(LEGACY_BLOB_HOST)) return url
  const key = mediaKeyFromUrl(url)
  if (!key) return url
  return r2PublicUrl(key)
}
