"use client"

import { useCallback, useEffect, useRef, useState } from "react"

const NEAR_BOTTOM_PX = 72

/**
 * System Six decision 4: new messages while reading do not jump the list.
 * Auto-anchor only when already at the bottom. Pill counts the rest.
 */
export function useChatScroll(itemCount: number) {
  const scrollerRef = useRef<HTMLDivElement | null>(null)
  const bottomRef = useRef<HTMLDivElement | null>(null)
  const stickToBottomRef = useRef(true)
  const [unseenCount, setUnseenCount] = useState(0)
  const prevCountRef = useRef(itemCount)

  const measureNearBottom = useCallback(() => {
    const el = scrollerRef.current
    if (!el) return true
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight
    return distance <= NEAR_BOTTOM_PX
  }, [])

  const onScroll = useCallback(() => {
    const near = measureNearBottom()
    stickToBottomRef.current = near
    if (near) setUnseenCount(0)
  }, [measureNearBottom])

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    bottomRef.current?.scrollIntoView({ behavior, block: "end" })
    stickToBottomRef.current = true
    setUnseenCount(0)
  }, [])

  useEffect(() => {
    const prev = prevCountRef.current
    prevCountRef.current = itemCount
    if (itemCount <= prev) return

    if (stickToBottomRef.current) {
      scrollToBottom(prev === 0 ? "auto" : "smooth")
    } else {
      setUnseenCount((n) => n + (itemCount - prev))
    }
  }, [itemCount, scrollToBottom])

  return {
    scrollerRef,
    bottomRef,
    unseenCount,
    onScroll,
    scrollToBottom,
    isAnchored: () => stickToBottomRef.current,
  }
}
