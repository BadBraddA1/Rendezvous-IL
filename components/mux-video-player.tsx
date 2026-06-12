"use client"

import { useEffect, useRef, useState, type CSSProperties } from "react"
import dynamic from "next/dynamic"
import { Play } from "lucide-react"
import type MuxPlayerElement from "@mux/mux-player-react"

const MuxPlayer = dynamic(() => import("@mux/mux-player-react"), { ssr: false })

type MuxVideoPlayerProps = {
  playbackId: string
  title: string
  thumbnailWidth?: number
  thumbnailHeight?: number
  playButtonSize?: "md" | "lg"
  /** When false, playback stops and the poster overlay returns. */
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
  const pendingPlay = useRef(false)
  const [started, setStarted] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!isActive && started) {
      playerRef.current?.pause()
      setStarted(false)
    }
  }, [isActive, started])

  useEffect(() => {
    if (ready && pendingPlay.current) {
      pendingPlay.current = false
      void playerRef.current?.play()
      setStarted(true)
    }
  }, [ready])

  const handlePlay = () => {
    onActivate?.()
    const player = playerRef.current
    if (player && ready) {
      void player.play()
      setStarted(true)
      return
    }
    pendingPlay.current = true
  }

  const showPoster = !started
  const playBtnClass =
    playButtonSize === "lg"
      ? "h-16 w-16 md:h-20 md:w-20"
      : "h-14 w-14"
  const playIconClass = playButtonSize === "lg" ? "h-7 w-7 md:h-8 md:w-8" : "h-6 w-6"

  return (
    <div className="relative aspect-video w-full bg-muted">
      <MuxPlayer
        ref={playerRef}
        playbackId={playbackId}
        streamType="on-demand"
        metadata={{ video_title: title }}
        poster={muxThumbnail(playbackId, thumbnailWidth, thumbnailHeight)}
        playsInline
        onCanPlay={() => setReady(true)}
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
          onClick={handlePlay}
          className="focus-ring group absolute inset-0 z-10 flex items-center justify-center"
          aria-label={`Play video: ${title}`}
        >
          <img
            src={muxThumbnail(playbackId, thumbnailWidth, thumbnailHeight)}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
            decoding="async"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-foreground/25 transition-colors group-hover:bg-foreground/35">
            <div
              className={`flex ${playBtnClass} items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md transition-transform duration-200 ease-out group-hover:scale-[1.03]`}
            >
              <Play className={`${playIconClass} ml-0.5`} fill="currentColor" aria-hidden="true" />
            </div>
          </div>
        </button>
      )}
    </div>
  )
}
