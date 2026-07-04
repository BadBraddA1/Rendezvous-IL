import { put } from "@vercel/blob"
import { photoExtensionForType, validateFamilyPhoto } from "@/lib/family-directory"

export { validateFamilyPhoto as validateChatPhoto }

export async function uploadChatPhoto(
  channelId: string,
  clerkUserId: string,
  bytes: ArrayBuffer,
  contentType: string,
): Promise<string> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error(
      "Photo storage is not configured. Set BLOB_READ_WRITE_TOKEN in Vercel for chat photo uploads.",
    )
  }

  const extension = photoExtensionForType(contentType)
  const pathname = `chat-photos/${channelId}/${clerkUserId}-${Date.now()}.${extension}`
  const blob = await put(pathname, Buffer.from(bytes), {
    access: "public",
    contentType,
    addRandomSuffix: false,
  })

  return blob.url
}
