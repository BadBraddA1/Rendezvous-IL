export type NormalizedFaceBox = {
  x: number
  y: number
  w: number
  h: number
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(1, Math.max(0, value))
}

type FaceDetectorLike = {
  detect: (source: HTMLImageElement) => Promise<
    Array<{ boundingBox: { x: number; y: number; width: number; height: number } }>
  >
}

/**
 * Browser Face Detection API (Chrome / Edge). Returns boxes normalized to the
 * image's natural pixels — matches how we store 0–1 coords for the stored JPEG.
 */
export async function detectFacesInBrowserImage(
  img: HTMLImageElement,
): Promise<NormalizedFaceBox[]> {
  if (typeof window === "undefined") return []

  const FaceDetectorCtor = (
    window as unknown as { FaceDetector?: new (opts?: object) => FaceDetectorLike }
  ).FaceDetector
  if (!FaceDetectorCtor) return []

  const naturalW = img.naturalWidth
  const naturalH = img.naturalHeight
  if (naturalW < 16 || naturalH < 16) return []

  try {
    const detector = new FaceDetectorCtor({ maxDetectedFaces: 12, fastMode: false })
    const results = await detector.detect(img)
    const boxes = results
      .map((face) => {
        const { x, y, width, height } = face.boundingBox
        return {
          x: clamp01(x / naturalW),
          y: clamp01(y / naturalH),
          w: clamp01(width / naturalW),
          h: clamp01(height / naturalH),
        }
      })
      .filter((box) => box.w >= 0.02 && box.h >= 0.02)
      .sort((a, b) => a.x - b.x)
      .slice(0, 12)
    return boxes
  } catch {
    return []
  }
}

export function browserFaceDetectionSupported(): boolean {
  return typeof window !== "undefined" && "FaceDetector" in window
}
