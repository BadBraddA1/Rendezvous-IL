import { del, put } from "@vercel/blob"
import { photoExtensionForType } from "@/lib/family-directory"

export function isBlobStorageConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN)
}

export async function uploadFamilyPhoto(
  familyId: number,
  bytes: ArrayBuffer,
  contentType: string,
): Promise<string> {
  if (!isBlobStorageConfigured()) {
    throw new Error(
      "Photo storage is not configured. Set BLOB_READ_WRITE_TOKEN in Vercel for family photo uploads.",
    )
  }

  const extension = photoExtensionForType(contentType)
  const pathname = `family-photos/${familyId}-${Date.now()}.${extension}`
  const blob = await put(pathname, Buffer.from(bytes), {
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
