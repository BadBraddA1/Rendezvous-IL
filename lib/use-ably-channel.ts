"use client"

import { useEffect, useRef } from "react"
import type { Message, Realtime, RealtimeChannel } from "ably"

type AblyChannelOptions = {
  getTokenRequest: () => Promise<unknown | null>
  channelName: string | null
  event?: string | string[]
  onMessage: (message: Message) => void
}

export function useAblyChannel({
  getTokenRequest,
  channelName,
  event = "message",
  onMessage,
}: AblyChannelOptions) {
  const onMessageRef = useRef(onMessage)
  onMessageRef.current = onMessage

  const getTokenRef = useRef(getTokenRequest)
  getTokenRef.current = getTokenRequest

  useEffect(() => {
    if (!channelName) return

    let client: Realtime | null = null
    let channel: RealtimeChannel | null = null
    let cancelled = false

    ;(async () => {
      try {
        const Ably = (await import("ably/build/ably.js")).default
        client = new Ably.Realtime({
          authCallback: (_params, callback) => {
            getTokenRef
              .current()
              .then((token) => {
                if (!token) {
                  callback("No Ably token available", null)
                  return
                }
                callback(null, token as Parameters<typeof callback>[1])
              })
              .catch(() => {
                callback("Token fetch failed", null)
              })
          },
        })

        if (cancelled) {
          client.close()
          return
        }

        channel = client.channels.get(channelName)
        const events = Array.isArray(event) ? event : [event]
        for (const name of events) {
          channel.subscribe(name, (msg) => onMessageRef.current(msg))
        }
      } catch (err) {
        console.warn("[useAblyChannel] connection failed:", err)
      }
    })()

    return () => {
      cancelled = true
      channel?.unsubscribe()
      client?.close()
    }
  }, [channelName, event])
}
