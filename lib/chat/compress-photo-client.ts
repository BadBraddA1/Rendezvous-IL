/**
 * Browser-side resize + JPEG compress before chat upload.
 * Keeps each photo well under Vercel's ~4.5 MB request body limit.
 */
export async function compressChatPhotoForUpload(
  file: File,
  maxDimension = 1600,
  quality = 0.82,
): Promise<Blob> {
  if (typeof createImageBitmap === "undefined") {
    return file
  }

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    return file
  }

  try {
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height))
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))

    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext("2d")
    if (!ctx) return file
    ctx.drawImage(bitmap, 0, 0, width, height)

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((result) => resolve(result), "image/jpeg", quality)
    })
    return blob && blob.size > 0 ? blob : file
  } finally {
    bitmap.close()
  }
}
