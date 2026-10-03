"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { ChatTypingPeer } from "@/lib/chat-kit-types"

type TypingPayload = {
  clerk_user_id: string
  display_name: string
}

const TYPING_TTL_MS = 4000
const PUBLISH_DEBOUNCE_MS = 350

type UseChatTypingOptions = {
  channelName: string | null
  currentUserId: string
  displayName: string
  draft: string
  enabled?: boolean
}

/**
 * Ably Pub/Sub typing indicator (`typing` event) — in-flow with System Six.
 */
export function useChatTyping({
  channelName,
  currentUserId,
  displayName,
  draft,
  enabled = true,
}: UseChatTypingOptions): ChatTypingPeer[] {
  const [peers, setPeers] = useState<ChatTypingPeer[]>([])
  const channelRef = useRef<{
    publish: (name: string, data: TypingPayload) => void
  } | null>(null)
  const expiryRef = useRef<Map<string, number>>(new Map())
  const lastPublishRef = useRef(0)

  useEffect(() => {
    if (!enabled || !channelName) {
      channelRef.current = null
      setPeers([])
      return
    }

    let cancelled = false
    let client: { close: () => void } | null = null

    ;(async () => {
      try {
        const AblyModule = await import("ably")
        const Ably = AblyModule.default ?? AblyModule
        const response = await fetch("/api/ably/token", { method: "POST" })
        if (!response.ok || cancelled) return
        const data = await response.json()
        const tokenRequest = data.tokenRequest
        if (!tokenRequest) return

        const realtime = new Ably.Realtime({
          authCallback: (_params, callback) => {
            callback(null, tokenRequest)
          },
          autoConnect: true,
        })
        client = realtime

        const channel = realtime.channels.get(channelName)
        await channel.attach()

        channelRef.current = channel

        channel.subscribe("typing", (msg) => {
          const payload = msg.data as TypingPayload
          if (!payload?.clerk_user_id || payload.clerk_user_id === currentUserId) return
          const until = Date.now() + TYPING_TTL_MS
          expiryRef.current.set(payload.clerk_user_id, until)
          setPeers([
            {
              id: payload.clerk_user_id,
              name: payload.display_name || "Someone",
            },
          ])
        })
      } catch {
        // typing is optional — ignore connection failures
      }
    })()

    const sweep = window.setInterval(() => {
      const now = Date.now()
      let changed = false
      for (const [id, until] of expiryRef.current) {
        if (until <= now) {
          expiryRef.current.delete(id)
          changed = true
        }
      }
      if (changed) {
        setPeers((current) =>
          current.filter((p) => (expiryRef.current.get(p.id) ?? 0) > now),
        )
      }
    }, 800)

    return () => {
      cancelled = true
      window.clearInterval(sweep)
      channelRef.current = null
      try {
        client?.close()
      } catch {
        // ignore
      }
    }
  }, [channelName, currentUserId, enabled])

  const publishTyping = useCallback(() => {
    const ch = channelRef.current
    if (!ch) return
    const now = Date.now()
    if (now - lastPublishRef.current < PUBLISH_DEBOUNCE_MS) return
    lastPublishRef.current = now
    ch.publish("typing", {
      clerk_user_id: currentUserId,
      display_name: displayName,
    } satisfies TypingPayload)
  }, [currentUserId, displayName])

  useEffect(() => {
    if (!enabled || !draft.trim()) return
    publishTyping()
  }, [draft, enabled, publishTyping])

  return peers
}
