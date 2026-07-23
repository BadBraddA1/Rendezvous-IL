import { LIVE_UPDATES_ROTATION_EPOCH_MS } from "@/lib/live-updates/display-state"

/** Seconds each photo stays on screen (all TVs stay in sync via epoch). */
export const PHOTOSHOW_INTERVAL_MS = 5_000

export interface PhotoshowPhoto {
  id: string
  image_url: string
  caption: string | null
  sort_order: number
  is_active: boolean
  created_at: string
}

/** Epoch-aligned index so every room TV shows the same photo. */
export function computePhotoshowIndex(
  photoCount: number,
  serverNowMs: number = Date.now(),
  epochMs: number = LIVE_UPDATES_ROTATION_EPOCH_MS,
  intervalMs: number = PHOTOSHOW_INTERVAL_MS,
): number {
  if (photoCount <= 0) return 0
  const elapsed = Math.max(0, serverNowMs - epochMs)
  return Math.floor(elapsed / intervalMs) % photoCount
}
