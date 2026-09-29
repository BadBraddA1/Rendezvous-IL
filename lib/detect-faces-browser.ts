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

type FaceApiBox = { x: number; y: number; width: number; height: number }

type FaceApiGlobal = {
  nets: {
    ssdMobilenetv1: { loadFromUri: (uri: string) => Promise<void>; isLoaded: boolean }
    tinyFaceDetector: { loadFromUri: (uri: string) => Promise<void>; isLoaded: boolean }
  }
  detectAllFaces: (
    input: HTMLImageElement | HTMLCanvasElement,
    options?: unknown,
  ) => {
    withFaceLandmarks?: () => unknown
  } & Promise<Array<{ box: FaceApiBox; detection?: { score: number } }>>
  SsdMobilenetv1Options: new (opts?: { minConfidence?: number; maxResults?: number }) => unknown
  TinyFaceDetectorOptions: new (opts?: { inputSize?: number; scoreThreshold?: number }) => unknown
}

declare global {
  interface Window {
    faceapi?: FaceApiGlobal
  }
}

const MODEL_URI = "/face-api-models"
const FACE_API_SCRIPT = "/vendor/face-api.min.js"

let modelsReady: Promise<FaceApiGlobal> | null = null

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[data-face-api="1"]`)
    if (existing && window.faceapi) {
      resolve()
      return
    }
    if (existing) {
      existing.addEventListener("load", () => resolve())
      existing.addEventListener("error", () => reject(new Error("Could not load face detection library")))
      return
    }
    const script = document.createElement("script")
    script.src = src
    script.async = true
    script.dataset.faceApi = "1"
    script.onload = () => resolve()
    script.onerror = () => reject(new Error("Could not load face detection library from /vendor/face-api.min.js"))
    document.head.appendChild(script)
  })
}

async function getFaceApi(): Promise<FaceApiGlobal> {
  if (typeof window === "undefined") {
    throw new Error("Face detection only runs in the browser")
  }
  if (!modelsReady) {
    modelsReady = (async () => {
      await loadScript(FACE_API_SCRIPT)
      const faceapi = window.faceapi
      if (!faceapi) {
        throw new Error("Face detection library loaded but faceapi global is missing")
      }
      // SSD MobileNet is better for group / outdoor family photos than tiny detector.
      if (!faceapi.nets.ssdMobilenetv1.isLoaded) {
        await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URI)
      }
      if (!faceapi.nets.tinyFaceDetector.isLoaded) {
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URI)
      }
      return faceapi
    })()
  }
  return modelsReady
}

/** Decode the directory JPEG via same-origin proxy (CDN has no CORS). */
export async function loadImageElementFromUrl(photoUrl: string): Promise<HTMLImageElement> {
  const fetchUrl = sameOriginMediaUrl(photoUrl)
  const response = await fetch(fetchUrl, { credentials: "same-origin" })
  if (!response.ok) {
    throw new Error(
      `Could not download photo for face detection (${response.status}). Try again after deploy finishes.`,
    )
  }
  const blob = await response.blob()
  const objectUrl = URL.createObjectURL(blob)
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error("Could not decode photo for face detection"))
      el.src = objectUrl
    })
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

function sameOriginMediaUrl(photoUrl: string): string {
  try {
    const host = new URL(photoUrl, window.location.href).hostname
    if (
      host === "cdn.rendezvousil.com" ||
      host.endsWith(".blob.vercel-storage.com") ||
      host.endsWith(".r2.dev")
    ) {
      return `/api/media/cdn-proxy?url=${encodeURIComponent(photoUrl)}`
    }
  } catch {
    // fall through
  }
  return photoUrl
}

function boxesFromFaceApi(
  detections: Array<{ box: FaceApiBox }>,
  naturalW: number,
  naturalH: number,
): NormalizedFaceBox[] {
  return detections
    .map((det) => {
      const { x, y, width, height } = det.box
      const padX = (width / naturalW) * 0.06
      const padY = (height / naturalH) * 0.1
      return {
        x: clamp01(x / naturalW - padX),
        y: clamp01(y / naturalH - padY),
        w: clamp01(width / naturalW + padX * 2),
        h: clamp01(height / naturalH + padY * 2),
      }
    })
    .filter((box) => box.w >= 0.012 && box.h >= 0.012)
    .sort((a, b) => a.x - b.x)
    .slice(0, 12)
}

function mergeBoxes(a: NormalizedFaceBox[], b: NormalizedFaceBox[]): NormalizedFaceBox[] {
  const all = [...a, ...b]
  const kept: NormalizedFaceBox[] = []
  for (const box of all.sort((x, y) => y.w * y.h - x.w * x.h)) {
    const overlaps = kept.some((other) => {
      const ix = Math.max(box.x, other.x)
      const iy = Math.max(box.y, other.y)
      const ax = Math.min(box.x + box.w, other.x + other.w)
      const ay = Math.min(box.y + box.h, other.y + other.h)
      const inter = Math.max(0, ax - ix) * Math.max(0, ay - iy)
      const union = box.w * box.h + other.w * other.h - inter
      return union > 0 && inter / union > 0.35
    })
    if (!overlaps) kept.push(box)
  }
  return kept.sort((x, y) => x.x - y.x).slice(0, 12)
}

/**
 * Face detection in the browser (Firefox / Safari / Chrome).
 * Uses face-api SSD MobileNet hosted on this site — no Cloudflare Worker, no Gemini boxes.
 */
export async function detectFacesInBrowserImage(
  source: HTMLImageElement | string,
): Promise<NormalizedFaceBox[]> {
  if (typeof window === "undefined") {
    throw new Error("Face detection only runs in the browser")
  }

  const img =
    typeof source === "string" ? await loadImageElementFromUrl(source) : source

  const naturalW = img.naturalWidth
  const naturalH = img.naturalHeight
  if (naturalW < 16 || naturalH < 16) {
    throw new Error("Photo is too small to detect faces")
  }

  const faceapi = await getFaceApi()

  const ssd = await faceapi.detectAllFaces(
    img,
    new faceapi.SsdMobilenetv1Options({ minConfidence: 0.25, maxResults: 12 }),
  )
  let boxes = boxesFromFaceApi(ssd, naturalW, naturalH)

  if (boxes.length < 2) {
    // Tiny detector as a second pass for smaller / distant faces in group shots.
    const tiny = await faceapi.detectAllFaces(
      img,
      new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.3 }),
    )
    boxes = mergeBoxes(boxes, boxesFromFaceApi(tiny, naturalW, naturalH))
  }

  if (boxes.length === 0) {
    const tinyLarge = await faceapi.detectAllFaces(
      img,
      new faceapi.TinyFaceDetectorOptions({ inputSize: 608, scoreThreshold: 0.2 }),
    )
    boxes = boxesFromFaceApi(tinyLarge, naturalW, naturalH)
  }

  return boxes
}

export function browserFaceDetectionSupported(): boolean {
  return typeof window !== "undefined"
}
