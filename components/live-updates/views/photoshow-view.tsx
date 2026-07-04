"use client"

import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
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

  if (!photo) {
    return (
      <div className="relative flex h-full w-full items-center justify-center">
        <div className="lu-panel relative flex w-full max-w-2xl flex-col items-center justify-center p-12">
          <Images className="lu-text-meal mb-6 h-24 w-24 opacity-60" />
          <h2 className="lu-type-board-lg lu-text-meal relative opacity-80">No photos yet</h2>
          <p className="lu-text-secondary mt-3 text-center text-lg">
            Add photos in Admin → Photoshow for room screens.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`relative flex h-full w-full items-center justify-center overflow-hidden ${
        immersive ? "bg-black" : ""
      }`}
    >
      <div
        key={photo.id}
        className={`relative ${
          immersive
            ? "absolute inset-0"
            : "lu-panel h-full w-full max-w-[96rem] overflow-hidden"
        }`}
      >
        <Image
          src={photo.image_url}
          alt={photo.caption || "Rendezvous photoshow"}
          fill
          unoptimized
          priority
          className="object-contain animate-in fade-in-0 duration-700"
          sizes="100vw"
        />
        {photo.caption && (
          <div
            className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-6 pb-6 pt-16 sm:px-10 sm:pb-8 ${
              immersive ? "" : "rounded-b-[inherit]"
            }`}
          >
            <p className="text-center text-xl font-semibold text-white text-balance sm:text-2xl lg:text-3xl">
              {photo.caption}
            </p>
          </div>
        )}
      </div>

      {photos.length > 1 && !immersive && (
        <div className="pointer-events-none absolute bottom-3 right-4 text-sm text-white/50 tabular-nums">
          {index + 1} / {photos.length}
          <span className="sr-only">
            , advances every {Math.round(PHOTOSHOW_INTERVAL_MS / 1000)} seconds
          </span>
        </div>
      )}
    </div>
  )
}
