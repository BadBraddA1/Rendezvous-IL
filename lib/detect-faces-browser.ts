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

const WASM_CDN = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm"
const FULL_RANGE_MODEL =
  "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_full_range/float16/1/blaze_face_full_range.tflite"
const SHORT_RANGE_MODEL =
  "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite"

type MediaPipeDetection = {
  boundingBox?: {
    originX: number
    originY: number
    width: number
    height: number
  }
}

type MediaPipeFaceDetector = {
  detect: (image: HTMLImageElement | HTMLCanvasElement | ImageBitmap) => {
    detections: MediaPipeDetection[]
  }
  close?: () => void
}

let detectorPromise: Promise<MediaPipeFaceDetector | null> | null = null

async function loadMediaPipeFaceDetector(): Promise<MediaPipeFaceDetector | null> {
  if (typeof window === "undefined") return null
  if (!detectorPromise) {
    detectorPromise = (async () => {
      try {
        // Load from CDN so Firefox/Safari work without a native FaceDetector API,
        // and so we don't fight the repo's pnpm store for a WASM-heavy package.
        const vision = (await import(
          /* webpackIgnore: true */
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/+esm"
        )) as {
          FilesetResolver: {
            forVisionTasks: (path: string) => Promise<unknown>
          }
          FaceDetector: {
            createFromOptions: (
              fileset: unknown,
              options: Record<string, unknown>,
            ) => Promise<MediaPipeFaceDetector>
          }
        }
        const fileset = await vision.FilesetResolver.forVisionTasks(WASM_CDN)
        // Full-range first — family group photos are usually shot from further away.
        try {
          return await vision.FaceDetector.createFromOptions(fileset, {
            baseOptions: {
              modelAssetPath: FULL_RANGE_MODEL,
              delegate: "CPU",
            },
            runningMode: "IMAGE",
            minDetectionConfidence: 0.45,
            minSuppressionThreshold: 0.3,
          })
        } catch {
          return await vision.FaceDetector.createFromOptions(fileset, {
            baseOptions: {
              modelAssetPath: SHORT_RANGE_MODEL,
              delegate: "CPU",
            },
            runningMode: "IMAGE",
            minDetectionConfidence: 0.5,
            minSuppressionThreshold: 0.3,
          })
        }
      } catch (error) {
        console.warn("[face-detect] MediaPipe load failed:", error)
        return null
      }
    })()
  }
  return detectorPromise
}

/** Decode the directory JPEG via fetch so detection uses natural pixels (CORS-safe). */
export async function loadImageElementFromUrl(photoUrl: string): Promise<HTMLImageElement> {
  const response = await fetch(photoUrl, { mode: "cors", credentials: "omit" })
  if (!response.ok) {
    throw new Error("Could not download photo for face detection")
  }
  const blob = await response.blob()
  const objectUrl = URL.createObjectURL(blob)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error("Could not decode photo for face detection"))
      el.src = objectUrl
    })
    return img
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

function boxesFromMediaPipe(
  detections: MediaPipeDetection[],
  naturalW: number,
  naturalH: number,
): NormalizedFaceBox[] {
  return detections
    .map((det) => {
      const box = det.boundingBox
      if (!box) return null
      // MediaPipe returns pixel coords relative to the image passed in.
      const x = clamp01(box.originX / naturalW)
      const y = clamp01(box.originY / naturalH)
      const w = clamp01(box.width / naturalW)
      const h = clamp01(box.height / naturalH)
      // Expand a bit — BlazeFace boxes are tight on the face; labels sit under chin better with padding.
      const padX = w * 0.08
      const padY = h * 0.12
      return {
        x: clamp01(x - padX),
        y: clamp01(y - padY),
        w: clamp01(w + padX * 2),
        h: clamp01(h + padY * 2),
      }
    })
    .filter((box): box is NormalizedFaceBox => Boolean(box) && box.w >= 0.015 && box.h >= 0.015)
    .sort((a, b) => a.x - b.x)
    .slice(0, 12)
}

type FaceDetectorLike = {
  detect: (source: HTMLImageElement) => Promise<
    Array<{ boundingBox: { x: number; y: number; width: number; height: number } }>
  >
}

async function detectWithChromeFaceDetector(
  img: HTMLImageElement,
): Promise<NormalizedFaceBox[]> {
  const FaceDetectorCtor = (
    window as unknown as { FaceDetector?: new (opts?: object) => FaceDetectorLike }
  ).FaceDetector
  if (!FaceDetectorCtor) return []

  try {
    const detector = new FaceDetectorCtor({ maxDetectedFaces: 12, fastMode: false })
    const results = await detector.detect(img)
    return results
      .map((face) => ({
        x: clamp01(face.boundingBox.x / img.naturalWidth),
        y: clamp01(face.boundingBox.y / img.naturalHeight),
        w: clamp01(face.boundingBox.width / img.naturalWidth),
        h: clamp01(face.boundingBox.height / img.naturalHeight),
      }))
      .filter((box) => box.w >= 0.015 && box.h >= 0.015)
      .sort((a, b) => a.x - b.x)
      .slice(0, 12)
  } catch {
    return []
  }
}

/**
 * Real face detection in the browser (Firefox / Safari / Chrome).
 * Prefer MediaPipe BlazeFace full-range — LLMs are unreliable for pixel boxes.
 */
export async function detectFacesInBrowserImage(
  source: HTMLImageElement | string,
): Promise<NormalizedFaceBox[]> {
  if (typeof window === "undefined") return []

  const img =
    typeof source === "string" ? await loadImageElementFromUrl(source) : source

  const naturalW = img.naturalWidth
  const naturalH = img.naturalHeight
  if (naturalW < 16 || naturalH < 16) return []

  const mediaPipe = await loadMediaPipeFaceDetector()
  if (mediaPipe) {
    try {
      const result = mediaPipe.detect(img)
      const boxes = boxesFromMediaPipe(result.detections || [], naturalW, naturalH)
      if (boxes.length > 0) return boxes
    } catch (error) {
      console.warn("[face-detect] MediaPipe detect failed:", error)
    }
  }

  return detectWithChromeFaceDetector(img)
}

/** Always true in browser — MediaPipe loads from CDN (works in Firefox). */
export function browserFaceDetectionSupported(): boolean {
  return typeof window !== "undefined"
}
