"use client"

import { useEffect, useRef } from "react"
import { useAuth } from "@clerk/nextjs"

const PING_INTERVAL_MS = 5 * 60 * 1000

/** Fire-and-forget last-seen ping for signed-in web users. */
export function UserActivityPing() {
  const { isLoaded, isSignedIn } = useAuth()
  const lastPingRef = useRef(0)

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return

    async function ping() {
      const now = Date.now()
      if (now - lastPingRef.current < 30_000) return
      lastPingRef.current = now

      try {
        await fetch("/api/auth/activity", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ platform: "web" }),
          keepalive: true,
        })
      } catch {
        // non-blocking
      }
    }

    void ping()
    const timer = window.setInterval(() => {
      void ping()
    }, PING_INTERVAL_MS)

    return () => window.clearInterval(timer)
  }, [isLoaded, isSignedIn])

  return null
}
