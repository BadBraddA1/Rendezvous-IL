/**
 * Rendezvous Bunny Stream library (dedicated — not BraddCorp / H&M).
 * Public IDs only; Stream API keys live in ~/.config/bunny/agent.env
 * as BUNNY_REN_*.
 */

export const BUNNY_REN_LIBRARY_ID =
  process.env.NEXT_PUBLIC_BUNNY_LIBRARY_ID ?? "778739"

export const BUNNY_REN_CDN_HOST =
  process.env.NEXT_PUBLIC_BUNNY_CDN_HOST ?? "vz-784d2bf0-2ee.b-cdn.net"

export type RenFaqVideo = {
  /** Stable slug for React keys / active-video state */
  id: string
  title: string
  /** Bunny Stream video GUID */
  videoId: string
}

/** FAQ page interview clips (migrated from Mux 2026-10-13). */
export const REN_FAQ_VIDEOS: RenFaqVideo[] = [
  {
    id: "history",
    title: "Rendezvous history",
    videoId: "04850323-1cb0-4dc8-99dd-7dc48e33bb22",
  },
  {
    id: "considering",
    title: "What would you say to someone considering Rendezvous?",
    videoId: "7e6be6a2-2206-4ae8-880e-ea1c1620d726",
  },
  {
    id: "first",
    title: "What was the first Rendezvous like?",
    videoId: "823c19b1-6a20-4a64-a55c-ede8bd0dd3ca",
  },
  {
    id: "impact",
    title: "What impact do you hope Rendezvous has on families?",
    videoId: "37ff799b-75a3-4a5a-858f-f22070c3099a",
  },
  {
    id: "vision",
    title: "What is your vision for the future?",
    videoId: "361bb802-1e44-46a0-aca8-5e3892f13d8a",
  },
  {
    id: "mean",
    title: "What does Rendezvous mean to you?",
    videoId: "6f51f5f5-0a69-48e1-add0-a72cf27c013a",
  },
]

export function bunnyThumbnailUrl(videoId: string) {
  return `https://${BUNNY_REN_CDN_HOST}/${videoId}/thumbnail.jpg`
}

export function bunnyEmbedUrl(
  videoId: string,
  opts: {
    autoplay?: boolean
    muted?: boolean
    preload?: boolean
    captions?: boolean
  } = {},
) {
  const params = new URLSearchParams({
    autoplay: opts.autoplay === false ? "false" : "true",
    muted: opts.muted ? "true" : "false",
    preload: opts.preload === false ? "false" : "true",
    responsive: "true",
    playsinline: "true",
    // Captions off by default (matches prior Mux FAQ behavior).
    captions: opts.captions ? "true" : "false",
  })
  return `https://iframe.mediadelivery.net/embed/${BUNNY_REN_LIBRARY_ID}/${videoId}?${params}`
}
