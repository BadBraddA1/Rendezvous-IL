"use client"

import { useEffect, useMemo, useState } from "react"
import { Images } from "lucide-react"
import {
  computePhotoshowIndex,
  PHOTOSHOW_INTERVAL_MS,
  type PhotoshowPhoto,
} from "@/lib/live-updates/photoshow-shared"

export function PhotoshowView({
  photos,
  immersive = false,
  fromChat = false,
  roomLabel = null,
}: {
  photos: PhotoshowPhoto[]
  immersive?: boolean
  /** Empty state should tell people to post in the group chat. */
  fromChat?: boolean
  roomLabel?: string | null
}) {
  const [tick, setTick] = useState(0)
  const [brokenIds, setBrokenIds] = useState<Record<string, true>>({})

  useEffect(() => {
    if (photos.length <= 1) return
    const id = window.setInterval(() => setTick((n) => n + 1), 1000)
    return () => window.clearInterval(id)
  }, [photos.length])

  const index = useMemo(
    () => computePhotoshowIndex(photos.length),
    // tick advances every second so we pick up the epoch bucket change
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [photos.length, tick],
  )

  const photo = photos[index] ?? photos[0]
  const imageFailed = photo ? Boolean(brokenIds[photo.id]) : false

  if (!photo) {
    return (
      <div
        className={
          immersive
            ? "absolute inset-0 flex items-center justify-center bg-black px-8"
            : "relative flex h-full min-h-[50dvh] w-full items-center justify-center px-6"
        }
      >
        <div className="relative flex w-full max-w-4xl flex-col items-center justify-center text-center">
          <Images className="mb-8 h-20 w-20 text-white/80 sm:h-28 sm:w-28" strokeWidth={1.5} />
          <h2 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
            No photos yet
          </h2>
          {roomLabel && (
            <p className="mt-4 text-2xl font-semibold tracking-wide text-white sm:text-3xl">
              This screen · {roomLabel}
            </p>
          )}
          <p className="mt-6 max-w-3xl text-xl leading-relaxed text-white sm:text-2xl lg:text-3xl">
            {fromChat
              ? "Send photos in the group chat and they’ll appear on this screen within about a minute."
              : "Send photos in the group chat (or add slides in Admin → Photoshow) to show them on this screen."}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div
      className={
        immersive
          ? "absolute inset-0 overflow-hidden bg-black"
          : "relative flex h-full min-h-[50dvh] w-full items-center justify-center overflow-hidden"
      }
    >
      <div
        key={photo.id}
        className={
          immersive
            ? "absolute inset-0"
            : "lu-panel relative h-full min-h-[50dvh] w-full max-w-[96rem] overflow-hidden"
        }
      >
        {!imageFailed ? (
          // Plain img: chat blob URLs are large/external; next/image fill often
          // collapses to 0×0 inside flex Live Updates layout.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo.image_url}
            alt={photo.caption || "Rendezvous photoshow"}
            className={
              immersive
                ? "absolute inset-0 h-full w-full object-cover animate-in fade-in-0 duration-700"
                : "h-full w-full object-contain animate-in fade-in-0 duration-700"
            }
            decoding="async"
            onError={() => {
              setBrokenIds((prev) => ({ ...prev, [photo.id]: true }))
            }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center px-6 text-center text-2xl font-semibold text-white">
            Could not load this photo
          </div>
        )}
        {photo.caption && !imageFailed && (
          <div
            className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/70 to-transparent px-6 pb-8 pt-24 sm:px-12 sm:pb-10 ${
              immersive ? "" : "rounded-b-[inherit]"
            }`}
          >
            <p className="text-balance text-center text-2xl font-bold text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] sm:text-3xl lg:text-4xl">
              {photo.caption}
            </p>
          </div>
        )}
      </div>

      {photos.length > 1 && !immersive && (
        <div className="pointer-events-none absolute bottom-3 right-4 text-sm tabular-nums text-white/50">
          {index + 1} / {photos.length}
          <span className="sr-only">
            , advances every {Math.round(PHOTOSHOW_INTERVAL_MS / 1000)} seconds
          </span>
        </div>
      )}
    </div>
  )
}
