import { chatConfig } from "@/lib/chat-config"
import type { ChatKitMessage } from "@/lib/chat-kit-types"

export type ChatDayBlock = {
  dayKey: string
  label: string
  groups: ChatMessageGroup[]
}

export type ChatMessageGroup = {
  id: string
  senderId: string
  senderName: string
  senderAvatarUrl?: string | null
  isMine: boolean
  messages: ChatKitMessage[]
}

function toDate(value: ChatKitMessage["createdAt"]): Date {
  if (value instanceof Date) return value
  return new Date(value)
}

function dayKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

function dayLabel(date: Date, now = new Date()): string {
  const today = dayKey(now)
  const key = dayKey(date)
  if (key === today) return "Today"

  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (key === dayKey(yesterday)) return "Yesterday"

  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date)
}

/**
 * System Six decision 1 + 2 scaffolding:
 * same sender + under groupWindowMs → one group; day divider when date changes.
 */
export function groupMessages(
  messages: ChatKitMessage[],
  windowMs = chatConfig.groupWindowMs,
): ChatDayBlock[] {
  const sorted = [...messages].sort(
    (a, b) => toDate(a.createdAt).getTime() - toDate(b.createdAt).getTime(),
  )

  const days: ChatDayBlock[] = []
  let currentDay: ChatDayBlock | null = null
  let currentGroup: ChatMessageGroup | null = null

  for (const message of sorted) {
    const created = toDate(message.createdAt)
    const key = dayKey(created)

    if (!currentDay || currentDay.dayKey !== key) {
      currentDay = { dayKey: key, label: dayLabel(created), groups: [] }
      days.push(currentDay)
      currentGroup = null
    }

    const last = currentGroup?.messages[currentGroup.messages.length - 1]
    const sameSender = currentGroup?.senderId === message.senderId
    const withinWindow =
      last != null &&
      created.getTime() - toDate(last.createdAt).getTime() <= windowMs

    if (currentGroup && sameSender && withinWindow) {
      currentGroup.messages.push(message)
      continue
    }

    currentGroup = {
      id: `${message.senderId}-${message.id}`,
      senderId: message.senderId,
      senderName: message.senderName,
      senderAvatarUrl: message.senderAvatarUrl,
      isMine: message.isMine,
      messages: [message],
    }
    currentDay.groups.push(currentGroup)
  }

  return days
}

export function formatExactTime(value: ChatKitMessage["createdAt"]): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(toDate(value))
}
