import { normalizeDirectoryPhoto } from "@/lib/family-photo-process"
import { isR2MediaConfigured, putMediaObject, deleteMediaUrl } from "@/lib/r2-media"

export function isMediaStorageConfigured(): boolean {
  return isR2MediaConfigured()
}

/** @deprecated use isMediaStorageConfigured */
export const isBlobStorageConfigured = isMediaStorageConfigured

export async function uploadFamilyPhoto(
  familyId: number,
  bytes: ArrayBuffer,
  _contentType: string,
): Promise<string> {
  if (!isMediaStorageConfigured()) {
    throw new Error(
      "Photo storage is not configured. Set R2_UPLOAD_WORKER_URL and R2_UPLOAD_SECRET in Vercel.",
    )
  }

  const { buffer, contentType, extension } = await normalizeDirectoryPhoto(bytes, _contentType)
  const key = `family-photos/${familyId}-${Date.now()}.${extension}`
  const { url } = await putMediaObject(key, buffer, contentType)
  return url
}

export async function deleteFamilyPhotoIfStored(url: string | null | undefined) {
  await deleteMediaUrl(url)
}
