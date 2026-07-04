import { randomUUID } from "crypto"
import { sql, type SqlRow } from "@/lib/db"
import { listAttendedYears } from "@/lib/attended-years"
import { userHasRegistrationForYear } from "@/lib/family-directory"
import { ensureChatSchema, yearChannelId } from "@/lib/chat-schema"
import {
  parseRegistrationEventYear,
  registrationYearLabel,
  type RegistrationEventYear,
} from "@/lib/registration-event-years"
import type { ChatChannelSummary, ChatChannelType } from "@/types/chat"

function rowToSummary(row: SqlRow, extras?: Partial<ChatChannelSummary>): ChatChannelSummary {
  return {
    id: String(row.id),
    name: String(row.name),
    channel_type: String(row.channel_type) as ChatChannelType,
    event_year: row.event_year != null ? parseRegistrationEventYear(row.event_year) : null,
    description: row.description != null ? String(row.description) : null,
    is_active: Number(row.is_active) === 1,
    is_test: Number(row.is_test) === 1,
    last_message_preview: extras?.last_message_preview ?? null,
    last_message_at: extras?.last_message_at ?? null,
    member_count: extras?.member_count,
  }
}

async function attachLastMessage(summaries: ChatChannelSummary[]): Promise<ChatChannelSummary[]> {
  if (summaries.length === 0) return summaries

  const ids = summaries.map((c) => c.id)
  const placeholders = ids.map(() => "?").join(", ")
  const rows = await sql.query(
    `SELECT channel_id, body, image_url, created_at
     FROM chat_messages
     WHERE deleted_at IS NULL
       AND channel_id IN (${placeholders})
     ORDER BY created_at DESC`,
    ids,
  )

  const latestByChannel = new Map<string, { body: string; image_url: string | null; created_at: string }>()
  for (const row of rows) {
    const channelId = String(row.channel_id)
    if (!latestByChannel.has(channelId)) {
      latestByChannel.set(channelId, {
        body: String(row.body ?? ""),
        image_url: row.image_url != null ? String(row.image_url) : null,
        created_at: String(row.created_at),
      })
    }
  }

  return summaries.map((channel) => {
    const latest = latestByChannel.get(channel.id)
    if (!latest) return channel
    const preview =
      latest.body.trim() || (latest.image_url ? "Sent a photo" : "")
    return {
      ...channel,
      last_message_preview: preview.slice(0, 120),
      last_message_at: latest.created_at,
    }
  })
}

export async function syncYearChannelMembership(
  clerkUserId: string,
  email?: string,
): Promise<void> {
  await ensureChatSchema()
  const years = await listAttendedYears(clerkUserId, email)

  for (const year of years) {
    await sql`
      INSERT INTO chat_channel_members (channel_id, clerk_user_id)
      VALUES (${yearChannelId(year)}, ${clerkUserId})
      ON CONFLICT (channel_id, clerk_user_id) DO NOTHING
    `
  }
}

export async function userCanAccessChannel(
  channelId: string,
  clerkUserId: string,
  email: string | undefined,
  isAdmin: boolean,
): Promise<boolean> {
  await ensureChatSchema()

  if (isAdmin) return true

  const [channel] = await sql`
    SELECT id, channel_type, event_year, is_active
    FROM chat_channels
    WHERE id = ${channelId}
    LIMIT 1
  `
  if (!channel || Number(channel.is_active) !== 1) return false

  if (String(channel.channel_type) === "year" && channel.event_year != null) {
    const year = parseRegistrationEventYear(channel.event_year)
    return userHasRegistrationForYear(clerkUserId, email, year)
  }

  const [member] = await sql`
    SELECT channel_id
    FROM chat_channel_members
    WHERE channel_id = ${channelId}
      AND clerk_user_id = ${clerkUserId}
    LIMIT 1
  `
  return Boolean(member)
}

export async function listMemberChatChannels(
  clerkUserId: string,
  email: string | undefined,
  isAdmin: boolean,
): Promise<ChatChannelSummary[]> {
  await ensureChatSchema()
  await syncYearChannelMembership(clerkUserId, email)

  let rows: SqlRow[] = []

  if (isAdmin) {
    rows = await sql`
      SELECT c.*
      FROM chat_channels c
      WHERE c.is_active = 1
      ORDER BY
        CASE WHEN c.channel_type = 'year' THEN 0 ELSE 1 END,
        c.event_year DESC,
        c.name ASC
    `
  } else {
    const attended = await listAttendedYears(clerkUserId, email)
    const yearIds = attended.map((year) => yearChannelId(year))

    const customRows =
      yearIds.length > 0
        ? await sql.query(
            `SELECT c.*
             FROM chat_channels c
             WHERE c.is_active = 1
               AND (
                 (c.channel_type = 'year' AND c.id IN (${yearIds.map(() => "?").join(", ")}))
                 OR c.id IN (
                   SELECT channel_id FROM chat_channel_members WHERE clerk_user_id = ?
                 )
               )
             ORDER BY
               CASE WHEN c.channel_type = 'year' THEN 0 ELSE 1 END,
               c.event_year DESC,
               c.name ASC`,
            [...yearIds, clerkUserId],
          )
        : await sql`
            SELECT c.*
            FROM chat_channels c
            INNER JOIN chat_channel_members m ON m.channel_id = c.id
            WHERE c.is_active = 1
              AND m.clerk_user_id = ${clerkUserId}
            ORDER BY c.name ASC
          `
    rows = customRows
  }

  const summaries = rows.map((row) => rowToSummary(row))
  return attachLastMessage(summaries)
}

export async function listAllChatChannelsForAdmin(): Promise<ChatChannelSummary[]> {
  await ensureChatSchema()

  const rows = await sql`
    SELECT c.*,
      (SELECT COUNT(*) FROM chat_channel_members m WHERE m.channel_id = c.id) as member_count
    FROM chat_channels c
    ORDER BY
      CASE WHEN c.channel_type = 'year' THEN 0 ELSE 1 END,
      c.event_year DESC,
      c.name ASC
  `

  const summaries = rows.map((row) =>
    rowToSummary(row, {
      member_count: row.member_count != null ? Number(row.member_count) : undefined,
    }),
  )
  return attachLastMessage(summaries)
}

export async function createCustomChatChannel(input: {
  name: string
  description?: string | null
  isTest?: boolean
  createdByClerkId: string
  memberClerkIds?: string[]
}): Promise<ChatChannelSummary> {
  await ensureChatSchema()

  const id = `custom-${randomUUID()}`
  const name = input.name.trim()
  if (!name) throw new Error("Channel name is required")

  await sql`
    INSERT INTO chat_channels (
      id, name, channel_type, description, is_active, is_test, created_by_clerk_id
    ) VALUES (
      ${id},
      ${name},
      'custom',
      ${input.description?.trim() || null},
      1,
      ${input.isTest ? 1 : 0},
      ${input.createdByClerkId}
    )
  `

  const members = new Set(input.memberClerkIds ?? [])
  members.add(input.createdByClerkId)

  for (const clerkUserId of members) {
    await sql`
      INSERT INTO chat_channel_members (channel_id, clerk_user_id)
      VALUES (${id}, ${clerkUserId})
      ON CONFLICT (channel_id, clerk_user_id) DO NOTHING
    `
  }

  const [row] = await sql`SELECT * FROM chat_channels WHERE id = ${id} LIMIT 1`
  return rowToSummary(row)
}

export async function updateChatChannel(
  channelId: string,
  patch: {
    name?: string
    description?: string | null
    is_active?: boolean
    is_test?: boolean
  },
): Promise<ChatChannelSummary | null> {
  await ensureChatSchema()

  const [existing] = await sql`
    SELECT * FROM chat_channels WHERE id = ${channelId} LIMIT 1
  `
  if (!existing) return null
  if (String(existing.channel_type) === "year") {
    throw new Error("Year channels cannot be edited")
  }

  const name = patch.name?.trim() || String(existing.name)
  const description =
    patch.description !== undefined ? patch.description : existing.description
  const isActive = patch.is_active !== undefined ? (patch.is_active ? 1 : 0) : Number(existing.is_active)
  const isTest = patch.is_test !== undefined ? (patch.is_test ? 1 : 0) : Number(existing.is_test)

  await sql`
    UPDATE chat_channels
    SET name = ${name},
        description = ${description},
        is_active = ${isActive},
        is_test = ${isTest},
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ${channelId}
  `

  const [row] = await sql`SELECT * FROM chat_channels WHERE id = ${channelId} LIMIT 1`
  return rowToSummary(row)
}

export async function deleteCustomChatChannel(channelId: string): Promise<boolean> {
  await ensureChatSchema()

  const [existing] = await sql`
    SELECT channel_type FROM chat_channels WHERE id = ${channelId} LIMIT 1
  `
  if (!existing) return false
  if (String(existing.channel_type) === "year") {
    throw new Error("Year channels cannot be deleted")
  }

  await sql`DELETE FROM chat_channel_members WHERE channel_id = ${channelId}`
  await sql`DELETE FROM chat_messages WHERE channel_id = ${channelId}`
  await sql`DELETE FROM chat_channels WHERE id = ${channelId}`
  return true
}

export async function setChatChannelMembers(
  channelId: string,
  clerkUserIds: string[],
): Promise<void> {
  await ensureChatSchema()

  const [existing] = await sql`
    SELECT channel_type FROM chat_channels WHERE id = ${channelId} LIMIT 1
  `
  if (!existing) throw new Error("Channel not found")
  if (String(existing.channel_type) === "year") {
    throw new Error("Year channel membership is managed automatically")
  }

  await sql`DELETE FROM chat_channel_members WHERE channel_id = ${channelId}`

  for (const clerkUserId of new Set(clerkUserIds)) {
    if (!clerkUserId.trim()) continue
    await sql`
      INSERT INTO chat_channel_members (channel_id, clerk_user_id)
      VALUES (${channelId}, ${clerkUserId})
      ON CONFLICT (channel_id, clerk_user_id) DO NOTHING
    `
  }
}

export type ChatMemberRole = "member" | "moderator"

export async function listChatChannelMemberIds(channelId: string): Promise<string[]> {
  await ensureChatSchema()
  const rows = await sql`
    SELECT clerk_user_id
    FROM chat_channel_members
    WHERE channel_id = ${channelId}
    ORDER BY joined_at ASC
  `
  return rows.map((row) => String(row.clerk_user_id))
}

export async function listChatChannelMembers(
  channelId: string,
): Promise<{ clerk_user_id: string; role: ChatMemberRole }[]> {
  await ensureChatSchema()
  const rows = await sql`
    SELECT clerk_user_id, role
    FROM chat_channel_members
    WHERE channel_id = ${channelId}
    ORDER BY
      CASE WHEN role = 'moderator' THEN 0 ELSE 1 END,
      joined_at ASC
  `
  return rows.map((row) => ({
    clerk_user_id: String(row.clerk_user_id),
    role: String(row.role || "member") === "moderator" ? "moderator" : "member",
  }))
}

export async function userIsChannelModerator(
  channelId: string,
  clerkUserId: string,
): Promise<boolean> {
  await ensureChatSchema()
  const [row] = await sql`
    SELECT role
    FROM chat_channel_members
    WHERE channel_id = ${channelId}
      AND clerk_user_id = ${clerkUserId}
    LIMIT 1
  `
  return String(row?.role || "") === "moderator"
}

/** Site admins can moderate any room; channel mods only rooms they moderate. */
export async function userCanModerateChannel(
  channelId: string,
  clerkUserId: string,
  isAdmin: boolean,
): Promise<boolean> {
  if (isAdmin) return true
  return userIsChannelModerator(channelId, clerkUserId)
}

export async function addChatChannelMember(
  channelId: string,
  clerkUserId: string,
  role: ChatMemberRole = "member",
): Promise<void> {
  await ensureChatSchema()
  const id = clerkUserId.trim()
  if (!id) throw new Error("Member id is required")

  const [existing] = await sql`
    SELECT channel_type FROM chat_channels WHERE id = ${channelId} LIMIT 1
  `
  if (!existing) throw new Error("Channel not found")
  // Year channels auto-include registrants; admins may still add explicit mod rows.
  if (String(existing.channel_type) === "year" && role !== "moderator") {
    throw new Error("Year channel membership is managed automatically from registrations")
  }

  await sql`
    INSERT INTO chat_channel_members (channel_id, clerk_user_id, role)
    VALUES (${channelId}, ${id}, ${role})
    ON CONFLICT (channel_id, clerk_user_id) DO UPDATE SET
      role = excluded.role
  `
}

export async function setChatChannelMemberRole(
  channelId: string,
  clerkUserId: string,
  role: ChatMemberRole,
): Promise<void> {
  await ensureChatSchema()
  const id = clerkUserId.trim()
  if (!id) throw new Error("Member id is required")

  const [existing] = await sql`
    SELECT id FROM chat_channels WHERE id = ${channelId} LIMIT 1
  `
  if (!existing) throw new Error("Channel not found")

  await sql`
    INSERT INTO chat_channel_members (channel_id, clerk_user_id, role)
    VALUES (${channelId}, ${id}, ${role})
    ON CONFLICT (channel_id, clerk_user_id) DO UPDATE SET
      role = excluded.role
  `
}

export async function removeChatChannelMember(channelId: string, clerkUserId: string): Promise<void> {
  await ensureChatSchema()
  const id = clerkUserId.trim()
  if (!id) throw new Error("Member id is required")

  const [existing] = await sql`
    SELECT channel_type FROM chat_channels WHERE id = ${channelId} LIMIT 1
  `
  if (!existing) throw new Error("Channel not found")

  const [member] = await sql`
    SELECT role FROM chat_channel_members
    WHERE channel_id = ${channelId} AND clerk_user_id = ${id}
    LIMIT 1
  `
  // Year channels: only explicit mod rows can be removed (not auto membership).
  if (String(existing.channel_type) === "year" && String(member?.role || "") !== "moderator") {
    throw new Error("Year channel membership is managed automatically from registrations")
  }

  await sql`
    DELETE FROM chat_channel_members
    WHERE channel_id = ${channelId}
      AND clerk_user_id = ${id}
  `
}

export function defaultYearChannelName(year: RegistrationEventYear): string {
  return `${registrationYearLabel(year)} Chat`
}
