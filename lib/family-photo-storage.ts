import { del, put } from "@vercel/blob"
import { normalizeDirectoryPhoto } from "@/lib/family-photo-process"

export function isBlobStorageConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN)
}

export async function uploadFamilyPhoto(
  familyId: number,
  bytes: ArrayBuffer,
  _contentType: string,
): Promise<string> {
  if (!isBlobStorageConfigured()) {
    throw new Error(
      "Photo storage is not configured. Set BLOB_READ_WRITE_TOKEN in Vercel for family photo uploads.",
    )
  }

  const { buffer, contentType, extension } = await normalizeDirectoryPhoto(bytes, _contentType)
  const pathname = `family-photos/${familyId}-${Date.now()}.${extension}`
  const blob = await put(pathname, buffer, {
    access: "public",
    contentType,
    addRandomSuffix: false,
  })

  return blob.url
}

export async function deleteFamilyPhotoIfStored(url: string | null | undefined) {
  if (!url || !url.includes("blob.vercel-storage.com")) return
  try {
    await del(url)
  } catch (error) {
    console.error("[family-photo] Failed to delete old blob:", error)
  }
}
