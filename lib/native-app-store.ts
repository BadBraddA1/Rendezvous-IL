/** Public App Store / Play Store links for the website. */

export const IOS_APP_STORE_URL =
  "https://apps.apple.com/us/app/rendezvous-il/id6786831744"

/** Apple App Store numeric id (for reference / deep links). */
export const IOS_APP_STORE_ID = "6786831744"

/**
 * Android Play Store listing — not live yet.
 * Set `ANDROID_PLAY_STORE_URL` when published and flip `ANDROID_APP_LIVE`.
 */
export const ANDROID_APP_LIVE = false

export const ANDROID_PACKAGE = "com.rendezvousil.app"

export const ANDROID_PLAY_STORE_URL: string | null = ANDROID_APP_LIVE
  ? `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}`
  : null
