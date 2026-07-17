import sharp from "sharp"

/** Longest edge after upload normalization (keeps directory cards light). */
export const DIRECTORY_PHOTO_MAX_EDGE = 1600
export const DIRECTORY_PHOTO_JPEG_QUALITY = 82

/**
 * Auto-orient from EXIF, shrink huge camera uploads, and re-encode as JPEG.
 * Prevents oversized / oddly oriented photos from blowing up directory cards
 * or chewing through mobile memory.
 */
export async function normalizeDirectoryPhoto(bytes: ArrayBuffer | Buffer): Promise<{
  buffer: Buffer
  contentType: "image/jpeg"
  extension: "jpg"
}> {
  const input = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes)
  const buffer = await sharp(input, { failOn: "none" })
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
}
