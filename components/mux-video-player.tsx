"use client"

import { flushSync, useEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react"
import MuxPlayer from "@mux/mux-player-react"
import type MuxPlayerElement from "@mux/mux-player-react"
import { Play } from "lucide-react"

type MuxVideoPlayerProps = {
  playbackId: string
  title: string
  thumbnailWidth?: number
  thumbnailHeight?: number
  playButtonSize?: "md" | "lg"
  /** When true, the player element mounts only after the first tap (FAQ grid). */
  deferPlayer?: boolean
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
  deferPlayer = false,
  isActive = true,
  onActivate,
}: MuxVideoPlayerProps) {
  const playerRef = useRef<MuxPlayerElement | null>(null)
  const wasActiveRef = useRef(isActive)
  const playingRef = useRef(false)
  const gestureCompleteRef = useRef(false)
  const ignorePauseUntilRef = useRef(0)
  const pendingPlayRef = useRef(false)
  const [playerMounted, setPlayerMounted] = useState(!deferPlayer)
  const [revealed, setRevealed] = useState(false)
  const [launching, setLaunching] = useState(false)

  const revealPlayer = () => {
    if (playingRef.current && gestureCompleteRef.current) {
      setRevealed(true)
      setLaunching(false)
    }
  }

  const resetToPoster = () => {
    playerRef.current?.pause()
    playingRef.current = false
    gestureCompleteRef.current = false
    pendingPlayRef.current = false
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

  const attachPlayerRef = (element: MuxPlayerElement | null) => {
    playerRef.current = element
    if (element && pendingPlayRef.current) {
      pendingPlayRef.current = false
      ignorePauseUntilRef.current = Date.now() + 600
      void element.play().catch(() => {
        playingRef.current = false
        gestureCompleteRef.current = false
        setLaunching(false)
        if (deferPlayer) setPlayerMounted(false)
      })
    }
  }

  const startPlayback = (event: PointerEvent<HTMLButtonElement>) => {
    onActivate?.()
    setLaunching(true)
    ignorePauseUntilRef.current = Date.now() + 600
    event.currentTarget.setPointerCapture(event.pointerId)

    const player = playerRef.current
    if (player) {
      void player.play().catch(() => {
        playingRef.current = false
        gestureCompleteRef.current = false
        setLaunching(false)
      })
      return
    }

    if (deferPlayer && !playerMounted) {
      pendingPlayRef.current = true
      flushSync(() => setPlayerMounted(true))
    }
  }

  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return
    event.preventDefault()
    startPlayback(event)
  }

  const handlePointerUp = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return
    gestureCompleteRef.current = true
    revealPlayer()
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  const handlePointerCancel = (event: PointerEvent<HTMLButtonElement>) => {
    gestureCompleteRef.current = true
    revealPlayer()
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
        <MuxPlayer
          ref={attachPlayerRef}
          playbackId={playbackId}
          streamType="on-demand"
          metadata={{ video_title: title }}
          poster={muxThumbnail(playbackId, thumbnailWidth, thumbnailHeight)}
          preload="metadata"
          playsInline
          defaultHiddenCaptions
          title={title}
          onPlaying={() => {
            playingRef.current = true
            revealPlayer()
          }}
          onPause={() => {
            if (Date.now() < ignorePauseUntilRef.current) return
            if (playerRef.current?.paused) {
              resetToPoster()
            }
          }}
          className={`absolute inset-0 h-full w-full ${showPoster ? "pointer-events-none" : ""}`}
          style={
            {
              "--media-object-fit": "cover",
              "--controls": showPoster ? "none" : undefined,
            } as CSSProperties
          }
        />
      )}
      {showPoster && (
        <button
          type="button"
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          className="focus-ring group absolute inset-0 z-10 flex cursor-pointer items-center justify-center touch-manipulation"
          aria-label={`Play video: ${title}`}
          aria-busy={launching}
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
