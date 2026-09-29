"use client"

import { useRef } from "react"
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

  return (
    <div className="relative w-full">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imgRef}
        src={photoUrl}
        alt={alt}
        className="block h-auto w-full"
      />
      <FamilyPhotoFaceLabels faces={faces} layout={layout} />
    </div>
  )
}
