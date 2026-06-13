"use client"

import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react"
import MuxPlayer from "@mux/mux-player-react"
import type MuxPlayerElement from "@mux/mux-player-react"
import { Play } from "lucide-react"

type MuxVideoPlayerProps = {
  playbackId: string
  title: string
  thumbnailWidth?: number
  thumbnailHeight?: number
  playButtonSize?: "md" | "lg"
  /** When this flips from true to false, playback stops (e.g. another FAQ video selected). */
  isActive?: boolean
  onActivate?: () => void
}

function muxThumbnail(playbackId: string, width: number, height: number) {
  return `https://image.mux.com/${playbackId}/thumbnail.jpg?width=${width}&height=${height}&fit_mode=smartcrop`
}

export function MuxVideoPlayer({
  playbackId,
  title,
  thumbnailWidth = 640,
  thumbnailHeight = 360,
  playButtonSize = "md",
  isActive = true,
  onActivate,
}: MuxVideoPlayerProps) {
  const playerRef = useRef<MuxPlayerElement>(null)
  const wasActiveRef = useRef(isActive)
  const [started, setStarted] = useState(false)

  // Only stop when another video takes over — not on the first tap while isActive is still false.
  useEffect(() => {
    if (wasActiveRef.current && !isActive && started) {
      playerRef.current?.pause()
      setStarted(false)
    }
    wasActiveRef.current = isActive
  }, [isActive, started])

  const startPlayback = () => {
    onActivate?.()
    const player = playerRef.current
    if (player) {
      // Must run synchronously inside the pointer/touch handler for iOS Safari.
      void player.play().catch(() => {
        setStarted(false)
      })
    }
    setStarted(true)
  }

  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return
    event.preventDefault()
    startPlayback()
  }

  const showPoster = !started
  const playBtnClass = playButtonSize === "lg" ? "h-16 w-16 md:h-20 md:w-20" : "h-14 w-14"
  const playIconClass = playButtonSize === "lg" ? "h-7 w-7 md:h-8 md:w-8" : "h-6 w-6"

  return (
    <div className="relative aspect-video w-full touch-manipulation bg-muted">
      <MuxPlayer
        ref={playerRef}
        playbackId={playbackId}
        streamType="on-demand"
        metadata={{ video_title: title }}
        poster={muxThumbnail(playbackId, thumbnailWidth, thumbnailHeight)}
        preload="metadata"
        playsInline
        onPlaying={() => setStarted(true)}
        onPause={() => {
          if (playerRef.current?.paused) setStarted(false)
        }}
        className="absolute inset-0 h-full w-full"
        style={
          {
            "--media-object-fit": "cover",
            "--controls": showPoster ? "none" : undefined,
          } as CSSProperties
        }
      />
      {showPoster && (
        <button
          type="button"
          onPointerDown={handlePointerDown}
          className="focus-ring group absolute inset-0 z-10 flex cursor-pointer items-center justify-center touch-manipulation"
          aria-label={`Play video: ${title}`}
        >
          <img
            src={muxThumbnail(playbackId, thumbnailWidth, thumbnailHeight)}
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 h-full w-full object-cover"
            loading="lazy"
            decoding="async"
          />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-foreground/25 transition-colors group-hover:bg-foreground/35 group-active:bg-foreground/35">
            <div
              className={`flex ${playBtnClass} items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md transition-transform duration-200 ease-out group-hover:scale-[1.03] group-active:scale-[1.03]`}
            >
              <Play className={`${playIconClass} ml-0.5`} fill="currentColor" aria-hidden="true" />
            </div>
          </div>
        </button>
      )}
    </div>
  )
}
