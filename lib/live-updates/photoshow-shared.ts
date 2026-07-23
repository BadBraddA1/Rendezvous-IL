import { LIVE_UPDATES_ROTATION_EPOCH_MS } from "@/lib/live-updates/display-state"

/** Seconds each photo stays on screen (all TVs stay in sync via epoch). */
export const PHOTOSHOW_INTERVAL_MS = 5_000

export interface PhotoshowPhoto {
  id: string
  image_url: string
  /** Optional message text / admin caption. */
  caption: string | null
  /** Who posted it (chat display name). */
  submitted_by: string | null
  sort_order: number
  is_active: boolean
  created_at: string
  /** Chat channel id when this slide came from chat. */
  channel_id?: string | null
}

function photoshowElapsedMs(serverNowMs: number, epochMs: number): number {
  // Future epochs freeze every screen on photo 0 — fall back if misconfigured.
  const epoch = epochMs > serverNowMs ? new Date("2020-01-01T00:00:00Z").getTime() : epochMs
  return Math.max(0, serverNowMs - epoch)
}

/** Epoch-aligned index so every room TV shows the same photo. */
export function computePhotoshowIndex(
  photoCount: number,
  serverNowMs: number = Date.now(),
  epochMs: number = LIVE_UPDATES_ROTATION_EPOCH_MS,
  intervalMs: number = PHOTOSHOW_INTERVAL_MS,
): number {
  if (photoCount <= 0) return 0
  const elapsed = photoshowElapsedMs(serverNowMs, epochMs)
  return Math.floor(elapsed / intervalMs) % photoCount
}
