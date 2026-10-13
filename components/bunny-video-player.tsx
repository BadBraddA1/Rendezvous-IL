"use client"

import { useEffect, useRef, useState, type PointerEvent } from "react"
import { Play } from "lucide-react"
import { bunnyEmbedUrl, bunnyThumbnailUrl } from "@/lib/ren-videos"

type BunnyVideoPlayerProps = {
  videoId: string
  title: string
  playButtonSize?: "md" | "lg"
  /** When true, the iframe mounts only after the first tap (FAQ grid). */
  deferPlayer?: boolean
  /** When this flips from true to false, playback stops (e.g. another FAQ video selected). */
  isActive?: boolean
  onActivate?: () => void
}

export function BunnyVideoPlayer({
  videoId,
  title,
  playButtonSize = "md",
  deferPlayer = false,
  isActive = true,
  onActivate,
}: BunnyVideoPlayerProps) {
  const wasActiveRef = useRef(isActive)
  const [playerMounted, setPlayerMounted] = useState(!deferPlayer)
  const [revealed, setRevealed] = useState(false)
  const [launching, setLaunching] = useState(false)
  const poster = bunnyThumbnailUrl(videoId)

  const resetToPoster = () => {
    setRevealed(false)
    setLaunching(false)
    if (deferPlayer) setPlayerMounted(false)
  }

  // Only stop when another video takes over — not on the first tap while isActive is still false.
  useEffect(() => {
    if (wasActiveRef.current && !isActive && (revealed || playerMounted)) {
      resetToPoster()
    }
    wasActiveRef.current = isActive
  }, [isActive, revealed, playerMounted, deferPlayer])

  const startPlayback = (event: PointerEvent<HTMLButtonElement>) => {
    onActivate?.()
    setLaunching(true)
    event.currentTarget.setPointerCapture(event.pointerId)
    setPlayerMounted(true)
    setRevealed(true)
    setLaunching(false)
  }

  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return
    event.preventDefault()
    startPlayback(event)
  }

  const handlePointerUp = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  const showPoster = !revealed
  const playBtnClass = playButtonSize === "lg" ? "h-16 w-16 md:h-20 md:w-20" : "h-14 w-14"
  const playIconClass = playButtonSize === "lg" ? "h-7 w-7 md:h-8 md:w-8" : "h-6 w-6"

  return (
    <div className="relative aspect-video w-full touch-manipulation bg-muted">
      {playerMounted && (
        <iframe
          key={videoId}
          src={bunnyEmbedUrl(videoId, { autoplay: revealed })}
          title={title}
          allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
          loading="lazy"
          className={`absolute inset-0 h-full w-full border-0 ${showPoster ? "pointer-events-none opacity-0" : ""}`}
        />
      )}
      {showPoster && (
        <button
          type="button"
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="focus-ring group absolute inset-0 z-10 flex cursor-pointer items-center justify-center touch-manipulation"
          aria-label={`Play video: ${title}`}
          aria-busy={launching}
        >
          <img
            src={poster}
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 h-full w-full object-cover"
            loading="lazy"
            decoding="async"
          />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-foreground/25 transition-colors group-hover:bg-foreground/35 group-active:bg-foreground/35">
            <div
              className={`flex ${playBtnClass} items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md transition-transform duration-200 ease-out group-hover:scale-[1.03] group-active:scale-[1.03] ${launching ? "scale-95 opacity-90" : ""}`}
            >
              <Play className={`${playIconClass} ml-0.5`} fill="currentColor" aria-hidden="true" />
            </div>
          </div>
        </button>
      )}
    </div>
  )
}
