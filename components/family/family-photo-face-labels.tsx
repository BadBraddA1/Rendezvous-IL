"use client"

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
}

/**
 * Absolute-positioned name labels under each face box (percent of the photo).
 * Parent should be `relative` around the image.
 */
export function FamilyPhotoFaceLabels({
  faces,
  showUnlabeledPlaceholders = false,
  className = "",
}: Props) {
  if (!faces.length) return null

  return (
    <div className={`pointer-events-none absolute inset-0 ${className}`} aria-hidden>
      {faces.map((face, index) => {
        const label = face.label?.trim() || ""
        if (!label && !showUnlabeledPlaceholders) return null

        return (
          <div
            key={`${face.x}-${face.y}-${index}`}
            className="absolute flex justify-center"
            style={{
              left: `${face.x * 100}%`,
              top: `${(face.y + face.h) * 100}%`,
              width: `${Math.max(face.w * 100, 10)}%`,
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
