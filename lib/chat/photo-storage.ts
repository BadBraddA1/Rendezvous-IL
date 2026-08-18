import { photoExtensionForType, validateFamilyPhoto } from "@/lib/family-directory"
import { isR2MediaConfigured, putMediaObject } from "@/lib/r2-media"

export { validateFamilyPhoto as validateChatPhoto }

export async function uploadChatPhoto(
  channelId: string,
  clerkUserId: string,
  bytes: ArrayBuffer,
  contentType: string,
): Promise<string> {
  if (!isR2MediaConfigured()) {
    throw new Error(
      "Photo storage is not configured. Set R2_UPLOAD_WORKER_URL and R2_UPLOAD_SECRET in Vercel.",
    )
  }

  const extension = photoExtensionForType(contentType)
  const key = `chat-photos/${channelId}/${clerkUserId}-${Date.now()}.${extension}`
  const { url } = await putMediaObject(key, Buffer.from(bytes), contentType)
  return url
}
