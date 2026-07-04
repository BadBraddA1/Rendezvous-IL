import { sql } from "@/lib/db"
import { defaultApnsEnvironment, isApnsConfigured, sendApnsAlerts } from "@/lib/apns"
import { listChatChannelMemberIds } from "@/lib/chat/channels"
import { ensureChatSchema, yearChannelId } from "@/lib/chat-schema"
import { isFcmConfigured, isPermanentFcmTokenFailure, sendFcmAlerts } from "@/lib/fcm"
import { ensurePushSchema } from "@/lib/push-schema"
import type { RegistrationEventYear } from "@/lib/registration-event-years"
import type { ChatMessagePayload } from "@/types/chat"

async function recipientClerkIds(channelId: string, senderClerkId: string): Promise<string[]> {
  await ensureChatSchema()

  const [channel] = await sql`
    SELECT channel_type, event_year
    FROM chat_channels
    WHERE id = ${channelId}
    LIMIT 1
  `

  let ids = await listChatChannelMemberIds(channelId)

  // Year channels: also include anyone with a linked family registration for that year
  // (membership rows may be incomplete until each user opens chat).
  if (channel && String(channel.channel_type) === "year" && channel.event_year != null) {
    const year = Number(channel.event_year) as RegistrationEventYear
    const yearId = yearChannelId(year)
    if (yearId === channelId) {
      try {
        const rows = await sql`
          SELECT DISTINCT f.clerk_user_id AS clerk_user_id
          FROM families f
          INNER JOIN registrations_v2 rv ON rv.family_id = f.id
          WHERE f.clerk_user_id IS NOT NULL
            AND rv.event_year = ${year}
        `
        for (const row of rows) {
          if (row.clerk_user_id) ids.push(String(row.clerk_user_id))
        }
      } catch {
        // registrations_v2 may not exist in older DBs
      }
    }
  }

  return [...new Set(ids)].filter((id) => id && id !== senderClerkId)
}

/**
 * Push a chat notification to channel members (iOS APNs + Android FCM).
 * Best-effort — never throws to the chat send path.
 */
export async function notifyChatMessagePush(input: {
  channelId: string
  channelTitle: string
  message: ChatMessagePayload
}): Promise<void> {
  try {
    await ensurePushSchema()

    const recipients = await recipientClerkIds(input.channelId, input.message.sender_clerk_id)
    if (recipients.length === 0) return

    const title = input.message.is_announcement
      ? `Announcement · ${input.channelTitle}`
      : input.channelTitle
    const body = input.message.is_announcement
      ? input.message.body.slice(0, 160)
      : `${input.message.sender_display_name}: ${input.message.body}`.slice(0, 160)
    const deepLink = `rendezvousil://chat`
    const webUrl = "https://rendezvousil.com/chat"

    const placeholders = recipients.map(() => "?").join(", ")

    if (isApnsConfigured()) {
      const rows = await sql.query(
        `SELECT token FROM ios_device_tokens
         WHERE is_active = 1
           AND environment = ?
           AND clerk_user_id IN (${placeholders})`,
        [defaultApnsEnvironment(), ...recipients],
      )
      const tokens = rows.map((r) => String(r.token)).filter(Boolean)
      if (tokens.length > 0) {
        const results = await sendApnsAlerts(tokens, {
          title,
          body,
          url: deepLink,
          threadId: `chat-${input.channelId}`,
        })
        for (const f of results.filter((r) => !r.success)) {
          if (f.reason?.includes("BadDeviceToken") || f.reason?.includes("Unregistered")) {
            await sql`UPDATE ios_device_tokens SET is_active = 0 WHERE token = ${f.deviceToken}`
          }
        }
      }
    }

    if (isFcmConfigured()) {
      const rows = await sql.query(
        `SELECT token FROM android_device_tokens
         WHERE is_active = 1
           AND clerk_user_id IN (${placeholders})`,
        [...recipients],
      )
      const tokens = rows.map((r) => String(r.token)).filter(Boolean)
      if (tokens.length > 0) {
        const results = await sendFcmAlerts(tokens, {
          title,
          body,
          url: webUrl,
        })
        for (const f of results.filter((r) => !r.success)) {
          if (isPermanentFcmTokenFailure(f.reason)) {
            await sql`UPDATE android_device_tokens SET is_active = 0 WHERE token = ${f.deviceToken}`
          }
        }
      }
    }
  } catch (error) {
    console.error("[chat/notify] push failed:", error)
  }
}
