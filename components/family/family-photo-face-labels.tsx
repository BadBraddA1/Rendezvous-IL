"use client"

import {
  faceBoxStyle,
  type FamilyPhotoLayout,
} from "@/components/family/use-family-photo-layout"

type FaceBox = {
  x: number
  y: number
  w: number
  h: number
  label?: string | null
}

type Props = {
  faces: FaceBox[]
  className?: string
  layout?: FamilyPhotoLayout
}

/**
 * Absolute-positioned name labels under each face box (percent of the photo).
 * Parent should be `relative` around the image.
 * Only faces with a real name get a chip — unlabeled faces stay unmarked.
 * Labels sit below the box (or above near the bottom edge).
 */
export function FamilyPhotoFaceLabels({
  faces,
  className = "",
  layout,
}: Props) {
  if (!faces.length) return null

  const emptyLayout: FamilyPhotoLayout = { left: 0, top: 0, width: 0, height: 0 }
  const resolved = layout ?? emptyLayout

  return (
    <div className={`pointer-events-none absolute inset-0 ${className}`} aria-hidden>
      {faces.map((face, index) => {
        const label = face.label?.trim() || ""
        if (!label) return null

        // Keep chips off faces: prefer below the box; flip above near the bottom edge.
        const placeAbove = face.y + face.h > 0.88
        const anchorY = placeAbove ? face.y : face.y + face.h
        const labelFace = { ...face, y: anchorY, h: 0.001, w: face.w }
        const labelBox = faceBoxStyle(labelFace, resolved)
        const labelWidth =
          resolved.width > 0
            ? Math.max(face.w * resolved.width, resolved.width * 0.1)
            : `${Math.max(face.w * 100, 10)}%`

        return (
          <div
            key={`${face.x}-${face.y}-${index}`}
            className="absolute flex justify-center"
            style={{
              left: labelBox.left,
              top: labelBox.top,
              width: labelWidth,
              transform: placeAbove ? "translateY(calc(-100% - 4px))" : "translateY(4px)",
            }}
          >
            <span className="max-w-full truncate rounded-md bg-black/70 px-1.5 py-0.5 text-center text-[10px] font-medium leading-tight text-white shadow-sm sm:text-xs">
              {label}
            </span>
          </div>
        )
      })}
    </div>
  )
}
