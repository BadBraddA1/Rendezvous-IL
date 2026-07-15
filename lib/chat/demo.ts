import { timingSafeEqual } from "crypto"
import { listActiveTestChatChannels } from "@/lib/chat/channels"
import type { ChatChannelSummary } from "@/types/chat"

/** Fixed sender used when chatting with the demo code (not a real Clerk user). */
export const CHAT_DEMO_USER_ID = "demo-chat-reviewer"
export const CHAT_DEMO_DISPLAY_NAME = "App Review"

const DEMO_HEADER = "x-chat-demo-code"

function configuredDemoCode(): string | null {
  const raw = process.env.CHAT_DEMO_CODE?.trim()
  return raw && raw.length >= 6 ? raw : null
}

function codesMatch(provided: string, expected: string): boolean {
  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

export type ChatDemoContext = {
  userId: string
  displayName: string
  isDemo: true
}

/** Resolve App Review / TestFlight chat demo access from `X-Chat-Demo-Code`. */
export function chatDemoContextFromRequest(request: Request): ChatDemoContext | null {
  const expected = configuredDemoCode()
  if (!expected) return null

  const provided = request.headers.get(DEMO_HEADER)?.trim()
  if (!provided || !codesMatch(provided, expected)) return null

  return {
    userId: CHAT_DEMO_USER_ID,
    displayName: CHAT_DEMO_DISPLAY_NAME,
    isDemo: true,
  }
}

/** Active admin-managed test/custom channels for demo access. */
export async function listDemoTestChannels(): Promise<ChatChannelSummary[]> {
  return listActiveTestChatChannels()
}
