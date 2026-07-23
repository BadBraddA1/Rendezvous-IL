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
}: {
  photos: PhotoshowPhoto[]
  immersive?: boolean
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
      <div className="relative flex h-full min-h-[50dvh] w-full items-center justify-center">
        <div className="lu-panel relative flex w-full max-w-2xl flex-col items-center justify-center p-12">
          <Images className="lu-text-meal mb-6 h-24 w-24 opacity-60" />
          <h2 className="lu-type-board-lg lu-text-meal relative opacity-80">No photos yet</h2>
          <p className="lu-text-secondary mt-3 text-center text-lg">
            Post photos in chat, or add slides in Admin → Photoshow.
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
            className={`h-full w-full object-contain animate-in fade-in-0 duration-700 ${
              immersive ? "absolute inset-0" : ""
            }`}
            decoding="async"
            onError={() => {
              setBrokenIds((prev) => ({ ...prev, [photo.id]: true }))
            }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center px-6 text-center text-white/70">
            Could not load this photo
          </div>
        )}
        {photo.caption && !imageFailed && (
          <div
            className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-6 pb-6 pt-16 sm:px-10 sm:pb-8 ${
              immersive ? "" : "rounded-b-[inherit]"
            }`}
          >
            <p className="text-balance text-center text-xl font-semibold text-white sm:text-2xl lg:text-3xl">
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
