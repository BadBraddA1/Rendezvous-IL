import { sql, type SqlRow } from "@/lib/db"
import { toPublicMediaUrl } from "@/lib/media-keys"
import { CHAT_REACTION_EMOJIS } from "@/lib/chat/reactions"
import { normalizeChatTimestamp } from "@/lib/chat/timestamps"
import type {
  ChatMessageKind,
  ChatMessagePayload,
  ChatReactionSummary,
} from "@/types/chat"

function parseImageUrls(row: SqlRow): string[] {
  const rewrite = (url: string) => toPublicMediaUrl(url) ?? url
  const raw = row.image_urls
  if (typeof raw === "string" && raw.trim()) {
    try {
      const parsed = JSON.parse(raw) as unknown
      if (Array.isArray(parsed)) {
        return parsed
          .filter((u): u is string => typeof u === "string" && u.trim().length > 0)
          .map(rewrite)
      }
    } catch {
      // fall through
    }
  }
  if (row.image_url != null && String(row.image_url).trim()) {
    return [rewrite(String(row.image_url))]
  }
  return []
}

function parsePollOptions(row: SqlRow): string[] | null {
  if (String(row.kind || "text") !== "poll") return null
  const raw = row.poll_options
  if (typeof raw !== "string" || !raw.trim()) return null
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return null
    return parsed.filter((o): o is string => typeof o === "string")
  } catch {
    return null
  }
}

export function rowToBaseMessage(row: SqlRow): Omit<
  ChatMessagePayload,
  "poll_counts" | "my_vote" | "reactions"
> {
  const imageUrls = parseImageUrls(row)
  const kind = (String(row.kind || "text") === "poll" ? "poll" : "text") as ChatMessageKind
  return {
    id: String(row.id),
    channel_id: String(row.channel_id),
    sender_clerk_id: String(row.sender_clerk_id),
    sender_display_name: String(row.sender_display_name),
    sender_avatar_url: row.sender_avatar_url != null ? String(row.sender_avatar_url) : null,
    body: String(row.body ?? ""),
    image_url: imageUrls[0] ?? null,
    image_urls: imageUrls,
    kind,
    is_announcement: Number(row.is_announcement) === 1,
    poll_question:
      kind === "poll" && row.poll_question != null ? String(row.poll_question) : null,
    poll_options: parsePollOptions(row),
    created_at: normalizeChatTimestamp(
      row.created_at != null ? String(row.created_at) : null,
    ),
  }
}

export async function loadPollCounts(
  messageIds: string[],
): Promise<Map<string, number[]>> {
  const result = new Map<string, number[]>()
  if (messageIds.length === 0) return result

  const placeholders = messageIds.map(() => "?").join(", ")
  const rows = await sql.query(
    `SELECT message_id, option_index, COUNT(*) AS vote_count
     FROM chat_poll_votes
     WHERE message_id IN (${placeholders})
     GROUP BY message_id, option_index`,
    messageIds,
  )

  for (const row of rows) {
    const id = String(row.message_id)
    const idx = Number(row.option_index)
    const count = Number(row.vote_count)
    if (!Number.isFinite(idx) || idx < 0) continue
    let counts = result.get(id)
    if (!counts) {
      counts = []
      result.set(id, counts)
    }
    while (counts.length <= idx) counts.push(0)
    counts[idx] = count
  }
  return result
}

export async function loadMyVotes(
  messageIds: string[],
  clerkUserId: string,
): Promise<Map<string, number>> {
  const result = new Map<string, number>()
  if (messageIds.length === 0 || !clerkUserId) return result

  const placeholders = messageIds.map(() => "?").join(", ")
  const rows = await sql.query(
    `SELECT message_id, option_index
     FROM chat_poll_votes
     WHERE clerk_user_id = ?
       AND message_id IN (${placeholders})`,
    [clerkUserId, ...messageIds],
  )
  for (const row of rows) {
    result.set(String(row.message_id), Number(row.option_index))
  }
  return result
}

async function resolveReactorDisplayNames(
  clerkUserIds: string[],
): Promise<Map<string, string>> {
  const names = new Map<string, string>()
  const unique = [...new Set(clerkUserIds.filter(Boolean))]
  if (unique.length === 0) return names

  const placeholders = unique.map(() => "?").join(", ")
  const rows = await sql.query(
    `SELECT m.sender_clerk_id, m.sender_display_name
     FROM chat_messages m
     INNER JOIN (
       SELECT sender_clerk_id, MAX(created_at) AS max_created
       FROM chat_messages
       WHERE sender_clerk_id IN (${placeholders})
         AND deleted_at IS NULL
       GROUP BY sender_clerk_id
     ) latest
       ON m.sender_clerk_id = latest.sender_clerk_id
      AND m.created_at = latest.max_created
     WHERE m.deleted_at IS NULL`,
    unique,
  )

  for (const row of rows) {
    const id = String(row.sender_clerk_id)
    const name = String(row.sender_display_name ?? "").trim()
    if (id && name) names.set(id, name)
  }
  return names
}

export async function loadReactionSummaries(
  messageIds: string[],
  clerkUserId: string,
): Promise<Map<string, ChatReactionSummary[]>> {
  const result = new Map<string, ChatReactionSummary[]>()
  if (messageIds.length === 0) return result

  const placeholders = messageIds.map(() => "?").join(", ")
  const rows = await sql.query(
    `SELECT message_id, emoji, clerk_user_id
     FROM chat_message_reactions
     WHERE message_id IN (${placeholders})
     ORDER BY created_at ASC`,
    messageIds,
  )

  type AccEntry = { userIds: string[]; reacted_by_me: boolean }
  type Acc = Map<string, AccEntry>
  const byMessage = new Map<string, Acc>()
  const allUserIds: string[] = []

  for (const row of rows) {
    const messageId = String(row.message_id)
    const emoji = String(row.emoji)
    const reactorId = String(row.clerk_user_id)
    let acc = byMessage.get(messageId)
    if (!acc) {
      acc = new Map()
      byMessage.set(messageId, acc)
    }
    const cur = acc.get(emoji) ?? { userIds: [], reacted_by_me: false }
    cur.userIds.push(reactorId)
    if (reactorId === clerkUserId) cur.reacted_by_me = true
    acc.set(emoji, cur)
    allUserIds.push(reactorId)
  }

  const displayNames = await resolveReactorDisplayNames(allUserIds)

  const toSummary = (emoji: string, cur: AccEntry): ChatReactionSummary => ({
    emoji,
    count: cur.userIds.length,
    reacted_by_me: cur.reacted_by_me,
    reactors: cur.userIds.map((id) => ({
      clerk_user_id: id,
      display_name: displayNames.get(id) ?? "Member",
    })),
  })

  for (const messageId of messageIds) {
    const acc = byMessage.get(messageId)
    if (!acc || acc.size === 0) {
      result.set(messageId, [])
      continue
    }
    const summaries: ChatReactionSummary[] = []
    // Stable order: allowlist first, then any unexpected emojis
    for (const emoji of CHAT_REACTION_EMOJIS) {
      const cur = acc.get(emoji)
      if (cur) {
        summaries.push(toSummary(emoji, cur))
        acc.delete(emoji)
      }
    }
    for (const [emoji, cur] of acc) {
      summaries.push(toSummary(emoji, cur))
    }
    result.set(messageId, summaries)
  }

  return result
}

export async function enrichMessages(
  bases: Omit<ChatMessagePayload, "poll_counts" | "my_vote" | "reactions">[],
  clerkUserId: string,
): Promise<ChatMessagePayload[]> {
  const ids = bases.map((m) => m.id)
  const pollIds = bases.filter((m) => m.kind === "poll").map((m) => m.id)

  const [pollCounts, myVotes, reactions] = await Promise.all([
    loadPollCounts(pollIds),
    loadMyVotes(pollIds, clerkUserId),
    loadReactionSummaries(ids, clerkUserId),
  ])

  return bases.map((base) => {
    const options = base.poll_options
    let counts: number[] | null = null
    if (base.kind === "poll" && options) {
      const raw = pollCounts.get(base.id) ?? []
      counts = options.map((_, i) => raw[i] ?? 0)
    }
    return {
      ...base,
      poll_counts: counts,
      my_vote: myVotes.has(base.id) ? myVotes.get(base.id)! : null,
      reactions: reactions.get(base.id) ?? [],
    }
  })
}

export async function enrichSingleMessage(
  row: SqlRow,
  clerkUserId: string,
): Promise<ChatMessagePayload> {
  const [enriched] = await enrichMessages([rowToBaseMessage(row)], clerkUserId)
  return enriched
}
