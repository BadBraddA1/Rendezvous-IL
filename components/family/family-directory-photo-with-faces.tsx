"use client"

import { useRef, useState } from "react"
import { FamilyPhotoFaceLabels } from "@/components/family/family-photo-face-labels"
import { useFamilyPhotoLayout } from "@/components/family/use-family-photo-layout"

type Face = { x: number; y: number; w: number; h: number; label: string }

type Props = {
  photoUrl: string
  alt: string
  faces: Face[]
}

export function FamilyDirectoryPhotoWithFaces({ photoUrl, alt, faces }: Props) {
  const imgRef = useRef<HTMLImageElement>(null)
  const layout = useFamilyPhotoLayout(imgRef, photoUrl)
  const [showNames, setShowNames] = useState(true)
  const namedFaces = faces.filter((face) => face.label?.trim())
  const hasLabels = namedFaces.length > 0

  return (
    <button
      type="button"
      className="relative w-full cursor-pointer border-0 bg-transparent p-0 text-left"
      onClick={() => {
        if (hasLabels) setShowNames((prev) => !prev)
      }}
      aria-pressed={hasLabels ? showNames : undefined}
      aria-label={
        hasLabels
          ? showNames
            ? "Hide names on photo"
            : "Show names on photo"
          : alt
      }
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imgRef}
        src={photoUrl}
        alt={alt}
        className="pointer-events-none block h-auto w-full"
      />
      {showNames && hasLabels && (
        <FamilyPhotoFaceLabels faces={namedFaces} layout={layout} />
      )}
      {hasLabels && (
        <span className="pointer-events-none absolute bottom-2 right-2 rounded-full bg-black/55 px-2 py-1 text-[10px] font-medium text-white sm:text-xs">
          {showNames ? "Tap to hide names" : "Tap to show names"}
        </span>
      )}
    </button>
  )
}
