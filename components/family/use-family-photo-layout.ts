"use client"

import {
  useCallback,
  useEffect,
  useState,
  type CSSProperties,
  type RefObject,
} from "react"

export type FamilyPhotoLayout = {
  left: number
  top: number
  width: number
  height: number
}

/** Map 0–1 face coords to pixels on the rendered <img> (handles any sub-pixel inset). */
export function useFamilyPhotoLayout(
  imgRef: RefObject<HTMLImageElement | null>,
  photoUrl: string,
): FamilyPhotoLayout {
  const [layout, setLayout] = useState<FamilyPhotoLayout>({
    left: 0,
    top: 0,
    width: 0,
    height: 0,
  })

  const measure = useCallback(() => {
    const img = imgRef.current
    const parent = img?.parentElement
    if (!img || !parent) return

    const parentRect = parent.getBoundingClientRect()
    const imgRect = img.getBoundingClientRect()
    if (imgRect.width < 1 || imgRect.height < 1) return

    setLayout({
      left: imgRect.left - parentRect.left,
      top: imgRect.top - parentRect.top,
      width: imgRect.width,
      height: imgRect.height,
    })
  }, [imgRef])

  useEffect(() => {
    measure()
    const img = imgRef.current
    if (!img) return

    img.addEventListener("load", measure)
    const ro = new ResizeObserver(measure)
    ro.observe(img)
    if (img.parentElement) ro.observe(img.parentElement)
    window.addEventListener("resize", measure)

    return () => {
      img.removeEventListener("load", measure)
      ro.disconnect()
      window.removeEventListener("resize", measure)
    }
  }, [imgRef, measure, photoUrl])

  return layout
}

export function faceBoxStyle(
  face: { x: number; y: number; w: number; h: number },
  layout: FamilyPhotoLayout,
): CSSProperties {
  if (layout.width < 1 || layout.height < 1) {
    return {
      left: `${face.x * 100}%`,
      top: `${face.y * 100}%`,
      width: `${face.w * 100}%`,
      height: `${face.h * 100}%`,
    }
  }
  return {
    left: layout.left + face.x * layout.width,
    top: layout.top + face.y * layout.height,
    width: face.w * layout.width,
    height: face.h * layout.height,
  }
}
