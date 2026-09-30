"use client"

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react"

/**
 * Measure how many equal-height rows fit in a box (projector TVs — no scroll,
 * no clipped cards). Optional multi-column packing for wide boards.
 */
export function useFitVisibleCount(options: {
  itemCount: number
  columns?: number
  /** Extra bottom reserve for a “+N more” line when truncated. */
  footerReservePx?: number
  gapPx?: number
}) {
  const {
    itemCount,
    columns = 1,
    footerReservePx = 36,
    gapPx = 10,
  } = options

  const listRef = useRef<HTMLDivElement | null>(null)
  const probeRef = useRef<HTMLDivElement | null>(null)
  const [visibleCount, setVisibleCount] = useState(() => Math.min(itemCount, 6))

  const measure = useCallback(() => {
    const list = listRef.current
    const probe = probeRef.current
    if (!list || itemCount <= 0) {
      setVisibleCount(0)
      return
    }

    const available = list.clientHeight
    if (available <= 0) return

    const rowHeight = Math.max(
      probe?.getBoundingClientRect().height ?? 0,
      56,
    )
    const cols = Math.max(1, columns)
    // Leave room for “+N more” if we might truncate.
    const usable = Math.max(0, available - footerReservePx)
    const rowsThatFit = Math.max(1, Math.floor((usable + gapPx) / (rowHeight + gapPx)))
    const capacity = rowsThatFit * cols
    setVisibleCount(Math.min(itemCount, capacity))
  }, [itemCount, columns, footerReservePx, gapPx])

  useLayoutEffect(() => {
    measure()
  }, [measure, itemCount, columns])

  useEffect(() => {
    const list = listRef.current
    if (!list || typeof ResizeObserver === "undefined") return
    const ro = new ResizeObserver(() => measure())
    ro.observe(list)
    window.addEventListener("resize", measure)
    return () => {
      ro.disconnect()
      window.removeEventListener("resize", measure)
    }
  }, [measure])

  return { listRef, probeRef, visibleCount, hiddenCount: Math.max(0, itemCount - visibleCount) }
}

export function FitListShell({
  header,
  children,
  className,
}: {
  header?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={`relative flex h-full min-h-0 w-full flex-col ${className ?? ""}`}
    >
      {header ? <div className="shrink-0">{header}</div> : null}
      <div className="relative min-h-0 flex-1">{children}</div>
    </div>
  )
}
