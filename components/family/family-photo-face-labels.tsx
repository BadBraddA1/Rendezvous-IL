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
  /** When true, show a “Name” placeholder under unlabeled faces (manage UI). */
  showUnlabeledPlaceholders?: boolean
  className?: string
  layout?: FamilyPhotoLayout
}

/**
 * Absolute-positioned name labels under each face box (percent of the photo).
 * Parent should be `relative` around the image.
 */
export function FamilyPhotoFaceLabels({
  faces,
  showUnlabeledPlaceholders = false,
  className = "",
  layout,
}: Props) {
  if (!faces.length) return null

  const emptyLayout: FamilyPhotoLayout = { left: 0, top: 0, width: 0, height: 0 }

  return (
    <div className={`pointer-events-none absolute inset-0 ${className}`} aria-hidden>
      {faces.map((face, index) => {
        const label = face.label?.trim() || ""
        if (!label && !showUnlabeledPlaceholders) return null

        const labelFace = { ...face, y: face.y + face.h, h: 0.001, w: face.w }
        const labelBox = faceBoxStyle(labelFace, layout ?? emptyLayout)
        const labelWidth =
          layout && layout.width > 0
            ? Math.max(face.w * layout.width, layout.width * 0.1)
            : `${Math.max(face.w * 100, 10)}%`

        return (
          <div
            key={`${face.x}-${face.y}-${index}`}
            className="absolute flex justify-center"
            style={{
              left: labelBox.left,
              top: labelBox.top,
              width: labelWidth,
            }}
          >
            <span className="mt-0.5 max-w-full truncate rounded-md bg-black/70 px-1.5 py-0.5 text-center text-[10px] font-medium leading-tight text-white shadow-sm sm:text-xs">
              {label || "Name"}
            </span>
          </div>
        )
      })}
    </div>
  )
}
