import Ably from "ably"
import { chatChannelName } from "@/lib/ably-channels"

export { chatChannelName }

let restClient: Ably.Rest | null = null

function getAblyRest(): Ably.Rest | null {
  const key = process.env.ABLY_API_KEY
  if (!key) return null
  if (!restClient) restClient = new Ably.Rest({ key })
  return restClient
}

export async function publishChatEvent(
  channelId: string,
  event: "message" | "message_deleted" | "reaction" | "poll_updated",
  payload: Record<string, unknown>,
): Promise<void> {
  const ably = getAblyRest()
  if (!ably) {
    console.error("[ably] ABLY_API_KEY is not configured — live chat updates will not publish")
    return
  }
  const channel = ably.channels.get(chatChannelName(channelId))
  await channel.publish(event, payload)
}

/** @deprecated Prefer publishChatEvent("message", …) */
export async function publishChatMessage(
  channelId: string,
  payload: Record<string, unknown>,
): Promise<void> {
  await publishChatEvent(channelId, "message", payload)
}

export async function createChatAblyTokenRequest(
  clerkUserId: string,
  channelIds: string[],
): Promise<Ably.TokenRequest> {
  const ably = getAblyRest()
  if (!ably) throw new Error("ABLY_API_KEY is not configured")

  const capability: Record<string, string[]> = {}
  for (const id of channelIds) {
    capability[chatChannelName(id)] = ["subscribe", "presence", "publish"]
  }

  return ably.auth.createTokenRequest({
    clientId: clerkUserId,
    capability: JSON.stringify(capability),
  })
}
