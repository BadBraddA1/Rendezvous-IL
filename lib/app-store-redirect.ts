import {
  ANDROID_APP_LIVE,
  ANDROID_PLAY_STORE_URL,
  IOS_APP_STORE_URL,
} from "@/lib/native-app-store"

export type StorePlatform = "ios" | "android" | "other"

export function detectStorePlatform(userAgent: string | null | undefined): StorePlatform {
  const ua = (userAgent || "").toLowerCase()
  if (/iphone|ipad|ipod/.test(ua)) return "ios"
  // iPadOS 13+ desktop UA still includes Macintosh + touch
  if (/macintosh/.test(ua) && /mobile|touch/.test(ua)) return "ios"
  if (/android/.test(ua)) return "android"
  return "other"
}

/** Absolute store URL, or null when the visitor should see the landing page. */
export function resolveStoreRedirectUrl(
  userAgent: string | null | undefined,
): string | null {
  const platform = detectStorePlatform(userAgent)
  if (platform === "ios") return IOS_APP_STORE_URL
  if (platform === "android" && ANDROID_APP_LIVE && ANDROID_PLAY_STORE_URL) {
    return ANDROID_PLAY_STORE_URL
  }
  return null
}
