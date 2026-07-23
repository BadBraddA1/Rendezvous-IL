import { photoExtensionForType } from "@/lib/family-directory"

/** Longest edge after upload normalization (keeps directory cards light). */
export const DIRECTORY_PHOTO_MAX_EDGE = 1600
export const DIRECTORY_PHOTO_JPEG_QUALITY = 82

type NormalizedPhoto = {
  buffer: Buffer
  contentType: string
  extension: string
}

function asBuffer(bytes: ArrayBuffer | Buffer): Buffer {
  return Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes)
}

function passthroughOriginal(
  bytes: ArrayBuffer | Buffer,
  contentType: string,
): NormalizedPhoto {
  const type = contentType || "image/jpeg"
  return {
    buffer: asBuffer(bytes),
    contentType: type,
    extension: photoExtensionForType(type),
  }
}

/**
 * Auto-orient from EXIF, shrink huge camera uploads, and re-encode as JPEG.
 * Uses a dynamic `sharp` import so routes that only GET/PATCH directory settings
 * do not load the native module (which currently fails on some Vercel runtimes).
 * If sharp is unavailable, returns the original bytes — iOS/Android already
 * downscale before upload.
 */
export async function normalizeDirectoryPhoto(
  bytes: ArrayBuffer | Buffer,
  contentType = "image/jpeg",
): Promise<NormalizedPhoto> {
  try {
    const sharp = (await import("sharp")).default
    const buffer = await sharp(asBuffer(bytes), { failOn: "none" })
      .rotate()
      .resize({
        width: DIRECTORY_PHOTO_MAX_EDGE,
        height: DIRECTORY_PHOTO_MAX_EDGE,
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: DIRECTORY_PHOTO_JPEG_QUALITY, mozjpeg: true })
      .toBuffer()

    return { buffer, contentType: "image/jpeg", extension: "jpg" }
  } catch (error) {
    console.error(
      "[family-photo] sharp unavailable; uploading original bytes:",
      error instanceof Error ? error.message : error,
    )
    return passthroughOriginal(bytes, contentType)
  }
}
