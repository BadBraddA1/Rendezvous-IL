"use client"

import { useEffect, useState } from "react"
import { useClerk } from "@clerk/nextjs"

const CLERK_LOAD_TIMEOUT_MS = 12_000

export const CLERK_LOAD_ERROR =
  "We couldn't connect to the sign-in service. Check Clerk DNS / domain setup for this site."

/** True once Clerk JS is ready; surfaces a message if it never loads. */
export function useClerkReady() {
  const clerk = useClerk()
  const [timedOut, setTimedOut] = useState(false)

  useEffect(() => {
    if (clerk.loaded) {
      setTimedOut(false)
      return
    }
    const timer = window.setTimeout(() => setTimedOut(true), CLERK_LOAD_TIMEOUT_MS)
    return () => window.clearTimeout(timer)
  }, [clerk.loaded])

  return {
    ready: clerk.loaded,
    loadError: timedOut && !clerk.loaded ? CLERK_LOAD_ERROR : null,
  }
}
