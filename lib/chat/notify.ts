import { sql } from "@/lib/db"
import {
  type ApnsAlertPayload,
  type ApnsEnvironment,
  isApnsConfigured,
  sendApnsAlerts,
} from "@/lib/apns"
import { listChatChannelMemberIds } from "@/lib/chat/channels"
import { ensureChatSchema, yearChannelId } from "@/lib/chat-schema"
import { isFcmConfigured, isPermanentFcmTokenFailure, sendFcmAlerts } from "@/lib/fcm"
import { ensureFamilyMembershipSchema } from "@/lib/family-membership"
import { logPushSend, type PushFailureDetail } from "@/lib/push-activity"
import { ensurePushSchema } from "@/lib/push-schema"
import type { RegistrationEventYear } from "@/lib/registration-event-years"
import type { ChatMessagePayload } from "@/types/chat"

type ApnsSendStats = {
  attempted: number
  succeeded: number
  failed: number
  sandboxTokens: number
  productionTokens: number
  failures: PushFailureDetail[]
}

/**
 * Send to every active iOS token for the given Clerk users, routing each token
 * to sandbox or production APNs based on how that install registered.
 * DEBUG / Xcode builds register as sandbox; TestFlight / App Store as production.
 * Filtering only on APNS_ENVIRONMENT drops the phone you're actually holding.
 */
async function sendApnsToClerkUsers(
  clerkUserIds: string[],
  payload: ApnsAlertPayload,
): Promise<ApnsSendStats> {
  const empty: ApnsSendStats = {
    attempted: 0,
    succeeded: 0,
    failed: 0,
    sandboxTokens: 0,
    productionTokens: 0,
    failures: [],
  }
  if (!isApnsConfigured() || clerkUserIds.length === 0) return empty

  const placeholders = clerkUserIds.map(() => "?").join(", ")
  const rows = await sql.query(
    `SELECT token, environment, clerk_user_id FROM ios_device_tokens
     WHERE is_active = 1
       AND clerk_user_id IN (${placeholders})`,
    clerkUserIds,
  )

  const byEnv = new Map<ApnsEnvironment, { token: string; clerkUserId: string | null }[]>()
  for (const row of rows) {
    const env: ApnsEnvironment =
      String(row.environment) === "sandbox" ? "sandbox" : "production"
    const list = byEnv.get(env) ?? []
    list.push({
      token: String(row.token),
      clerkUserId: row.clerk_user_id != null ? String(row.clerk_user_id) : null,
    })
    byEnv.set(env, list)
  }

  const stats: ApnsSendStats = { ...empty, failures: [] }
  for (const [environment, devices] of byEnv) {
    if (devices.length === 0) continue
    if (environment === "sandbox") stats.sandboxTokens += devices.length
    else stats.productionTokens += devices.length

    const tokens = devices.map((d) => d.token)
    const byToken = new Map(devices.map((d) => [d.token, d.clerkUserId]))
    const results = await sendApnsAlerts(tokens, payload, { environment })
    stats.attempted += results.length
    for (const r of results) {
      if (r.success) {
        stats.succeeded += 1
        continue
      }
      stats.failed += 1
      stats.failures.push({
        platform: "ios",
        environment,
        clerkUserId: byToken.get(r.deviceToken) ?? null,
        token: r.deviceToken,
        reason: r.reason ?? null,
        statusCode: r.status ?? null,
      })
      if (r.reason?.includes("BadDeviceToken") || r.reason?.includes("Unregistered")) {
        await sql`UPDATE ios_device_tokens SET is_active = 0 WHERE token = ${r.deviceToken}`
      }
    }
  }

  return stats
}

async function recipientClerkIds(channelId: string, senderClerkId: string): Promise<string[]> {
  await ensureChatSchema()
  await ensureFamilyMembershipSchema()

  const [channel] = await sql`
    SELECT channel_type, event_year
    FROM chat_channels
    WHERE id = ${channelId}
    LIMIT 1
  `

  let ids = await listChatChannelMemberIds(channelId)

  // Anyone who has already posted in the channel should receive pushes even if
  // they accessed it as admin without an explicit membership row.
  try {
    const participantRows = await sql`
      SELECT DISTINCT sender_clerk_id AS clerk_user_id
      FROM chat_messages
      WHERE channel_id = ${channelId}
        AND deleted_at IS NULL
        AND sender_clerk_id IS NOT NULL
    `
    for (const row of participantRows) {
      if (row.clerk_user_id) ids.push(String(row.clerk_user_id))
    }
  } catch {
    // ignore
  }

  // Year channels: include everyone on a registered family for that year
  // (primary clerk_user_id + family_account_members). Membership rows may be
  // incomplete until each user opens chat.
  if (channel && String(channel.channel_type) === "year" && channel.event_year != null) {
    const year = Number(channel.event_year) as RegistrationEventYear
    const yearId = yearChannelId(year)
    if (yearId === channelId) {
      try {
        const membershipRows = await sql`
          SELECT DISTINCT m.clerk_user_id AS clerk_user_id
          FROM family_account_members m
          WHERE EXISTS (
            SELECT 1 FROM registrations_v2 rv
            WHERE rv.family_id = m.family_id AND rv.event_year = ${year}
          )
          OR EXISTS (
            SELECT 1
            FROM families f
            JOIN registrations r ON LOWER(r.email) = LOWER(f.email)
            WHERE f.id = m.family_id
              AND COALESCE(r.event_year, 2026) = ${year}
          )
        `
        for (const row of membershipRows) {
          if (row.clerk_user_id) ids.push(String(row.clerk_user_id))
        }
      } catch {
        // family_account_members / registrations_v2 may be absent on older DBs
      }

      try {
        const primaryRows = await sql`
          SELECT DISTINCT f.clerk_user_id AS clerk_user_id
          FROM families f
          WHERE f.clerk_user_id IS NOT NULL
            AND (
              EXISTS (
                SELECT 1 FROM registrations_v2 rv
                WHERE rv.family_id = f.id AND rv.event_year = ${year}
              )
              OR EXISTS (
                SELECT 1 FROM registrations r
                WHERE LOWER(r.email) = LOWER(f.email)
                  AND COALESCE(r.event_year, 2026) = ${year}
              )
            )
        `
        for (const row of primaryRows) {
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
    if (recipients.length === 0) {
      await logPushSend({
        source: "chat",
        title: input.channelTitle,
        bodyPreview: "No recipients",
        channelId: input.channelId,
        messageId: input.message.id,
        recipientCount: 0,
        iosAttempted: 0,
        iosSucceeded: 0,
        iosFailed: 0,
        androidAttempted: 0,
        androidSucceeded: 0,
        androidFailed: 0,
      })
      return
    }

    const title = input.message.is_announcement
      ? `Announcement · ${input.channelTitle}`
      : input.message.kind === "poll"
        ? `Poll · ${input.channelTitle}`
        : input.channelTitle
    const imageUrl =
      typeof input.message.image_url === "string" && input.message.image_url.trim()
        ? input.message.image_url.trim()
        : undefined
    const photoCount = Array.isArray(input.message.image_urls)
      ? input.message.image_urls.length
      : imageUrl
        ? 1
        : 0
    const preview =
      input.message.kind === "poll"
        ? input.message.poll_question?.trim() || input.message.body.trim() || "New poll"
        : input.message.body.trim() ||
          (photoCount > 1 ? `Sent ${photoCount} photos` : photoCount === 1 ? "Sent a photo" : "")
    const body = input.message.is_announcement
      ? preview.slice(0, 160)
      : `${input.message.sender_display_name}: ${preview}`.slice(0, 160)
    const deepLink = `rendezvousil://chat?channel=${encodeURIComponent(input.channelId)}`
    const webUrl = "https://rendezvousil.com/chat"

    const placeholders = recipients.map(() => "?").join(", ")

    const ios = await sendApnsToClerkUsers(recipients, {
      title,
      body,
      url: deepLink,
      threadId: `chat-${input.channelId}`,
      channelId: input.channelId,
      contentAvailable: true,
      sound: input.message.is_announcement ? "announce.caf" : "chat.caf",
      imageUrl,
    })

    let androidAttempted = 0
    let androidSucceeded = 0
    let androidFailed = 0
    const androidFailures: PushFailureDetail[] = []

    if (isFcmConfigured()) {
      const rows = await sql.query(
        `SELECT token, clerk_user_id FROM android_device_tokens
         WHERE is_active = 1
           AND clerk_user_id IN (${placeholders})`,
        [...recipients],
      )
      const devices = rows.map((r) => ({
        token: String(r.token),
        clerkUserId: r.clerk_user_id != null ? String(r.clerk_user_id) : null,
      }))
      if (devices.length > 0) {
        const byToken = new Map(devices.map((d) => [d.token, d.clerkUserId]))
        const results = await sendFcmAlerts(
          devices.map((d) => d.token),
          {
            title,
            body,
            url: webUrl,
            imageUrl,
          },
        )
        androidAttempted = results.length
        for (const r of results) {
          if (r.success) {
            androidSucceeded += 1
            continue
          }
          androidFailed += 1
          androidFailures.push({
            platform: "android",
            clerkUserId: byToken.get(r.deviceToken) ?? null,
            token: r.deviceToken,
            reason: r.reason ?? null,
            statusCode: r.status ?? null,
          })
          if (isPermanentFcmTokenFailure(r.reason)) {
            await sql`UPDATE android_device_tokens SET is_active = 0 WHERE token = ${r.deviceToken}`
          }
        }
      }
    }

    await logPushSend({
      source: "chat",
      title,
      bodyPreview: body,
      channelId: input.channelId,
      messageId: input.message.id,
      recipientCount: recipients.length,
      iosAttempted: ios.attempted,
      iosSucceeded: ios.succeeded,
      iosFailed: ios.failed,
      androidAttempted,
      androidSucceeded,
      androidFailed,
      sandboxTokens: ios.sandboxTokens,
      productionTokens: ios.productionTokens,
      failures: [...ios.failures, ...androidFailures],
      meta: { hasImage: Boolean(imageUrl) },
    })
  } catch (error) {
    console.error("[chat/notify] push failed:", error)
  }
}

/**
 * Push a reaction notification to the message author only (not the channel).
 */
export async function notifyChatReactionPush(input: {
  channelId: string
  authorClerkId: string
  actorDisplayName: string
  emoji: string
}): Promise<void> {
  try {
    await ensurePushSchema()
    const recipient = input.authorClerkId
    if (!recipient) return

    const title = "New reaction"
    const body = `${input.actorDisplayName} reacted ${input.emoji} to your message`.slice(0, 160)
    const deepLink = `rendezvousil://chat?channel=${encodeURIComponent(input.channelId)}`
    const webUrl = "https://rendezvousil.com/chat"

    const ios = await sendApnsToClerkUsers([recipient], {
      title,
      body,
      url: deepLink,
      threadId: `chat-${input.channelId}`,
      channelId: input.channelId,
      contentAvailable: true,
      sound: "chat.caf",
    })

    let androidAttempted = 0
    let androidSucceeded = 0
    let androidFailed = 0
    const androidFailures: PushFailureDetail[] = []

    if (isFcmConfigured()) {
      const rows = await sql`
        SELECT token, clerk_user_id FROM android_device_tokens
        WHERE is_active = 1
          AND clerk_user_id = ${recipient}
      `
      const devices = rows.map((r) => ({
        token: String(r.token),
        clerkUserId: r.clerk_user_id != null ? String(r.clerk_user_id) : null,
      }))
      if (devices.length > 0) {
        const byToken = new Map(devices.map((d) => [d.token, d.clerkUserId]))
        const results = await sendFcmAlerts(
          devices.map((d) => d.token),
          { title, body, url: webUrl },
        )
        androidAttempted = results.length
        for (const r of results) {
          if (r.success) {
            androidSucceeded += 1
            continue
          }
          androidFailed += 1
          androidFailures.push({
            platform: "android",
            clerkUserId: byToken.get(r.deviceToken) ?? null,
            token: r.deviceToken,
            reason: r.reason ?? null,
            statusCode: r.status ?? null,
          })
          if (isPermanentFcmTokenFailure(r.reason)) {
            await sql`UPDATE android_device_tokens SET is_active = 0 WHERE token = ${r.deviceToken}`
          }
        }
      }
    }

    await logPushSend({
      source: "chat_reaction",
      title,
      bodyPreview: body,
      channelId: input.channelId,
      recipientCount: 1,
      iosAttempted: ios.attempted,
      iosSucceeded: ios.succeeded,
      iosFailed: ios.failed,
      androidAttempted,
      androidSucceeded,
      androidFailed,
      sandboxTokens: ios.sandboxTokens,
      productionTokens: ios.productionTokens,
      failures: [...ios.failures, ...androidFailures],
    })
  } catch (error) {
    console.error("[chat/notify] reaction push failed:", error)
  }
}
