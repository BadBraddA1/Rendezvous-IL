"use client"

import { useEffect, useRef, useState } from "react"
import type { Message, Realtime, RealtimeChannel } from "ably"

type AblyChannelOptions = {
  getTokenRequest: () => Promise<unknown | null>
  channelName: string | null
  event?: string | string[]
  onMessage: (message: Message) => void
}

export type AblyConnectionStatus = "idle" | "connecting" | "connected" | "failed"

export function useAblyChannel({
  getTokenRequest,
  channelName,
  event = "message",
  onMessage,
}: AblyChannelOptions): AblyConnectionStatus {
  const onMessageRef = useRef(onMessage)
  onMessageRef.current = onMessage

  const getTokenRef = useRef(getTokenRequest)
  getTokenRef.current = getTokenRequest

  const [status, setStatus] = useState<AblyConnectionStatus>("idle")

  useEffect(() => {
    if (!channelName) {
      setStatus("idle")
      return
    }

    let client: Realtime | null = null
    let channel: RealtimeChannel | null = null
    let cancelled = false
    setStatus("connecting")

    ;(async () => {
      try {
        const AblyModule = await import("ably")
        const Ably = AblyModule.default ?? AblyModule

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
              .catch((err) => {
                callback(err instanceof Error ? err.message : "Token fetch failed", null)
              })
          },
          autoConnect: true,
        })

        client.connection.on("connected", () => {
          if (!cancelled) setStatus("connected")
        })
        client.connection.on("failed", () => {
          if (!cancelled) setStatus("failed")
        })
        client.connection.on("suspended", () => {
          if (!cancelled) setStatus("failed")
        })

        if (cancelled) {
          client.close()
          return
        }

        channel = client.channels.get(channelName)
        const events = Array.isArray(event) ? event : [event]
        for (const name of events) {
          channel.subscribe(name, (msg) => {
            onMessageRef.current(msg)
          })
        }

        // Attach explicitly so we don't miss messages while auth completes.
        channel.attach((err) => {
          if (cancelled) return
          if (err) {
            console.warn("[useAblyChannel] attach failed:", err)
            setStatus("failed")
          }
        })
      } catch (err) {
        console.warn("[useAblyChannel] connection failed:", err)
        if (!cancelled) setStatus("failed")
      }
    })()

    return () => {
      cancelled = true
      try {
        channel?.unsubscribe()
        channel?.detach()
      } catch {
        // ignore
      }
      client?.close()
    }
  }, [channelName, event])

  return status
}
