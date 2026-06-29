"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { ChevronLeft, ChevronRight, Pause, Play, Square } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  canUsePageTour,
  getActiveTourRoutes,
  findTourIndex,
  nextTourIndex,
  prevTourIndex,
  PAGE_TOUR_DEFAULT_INTERVAL_SEC,
  PAGE_TOUR_STORAGE,
} from "@/lib/page-tour"

function readBool(key: string): boolean {
  if (typeof window === "undefined") return false
  return sessionStorage.getItem(key) === "1"
}

function readNumber(key: string, fallback: number): number {
  if (typeof window === "undefined") return fallback
  const raw = sessionStorage.getItem(key)
  if (!raw) return fallback
  const n = Number.parseInt(raw, 10)
  return Number.isFinite(n) && n > 0 ? n : fallback
}

export function PageTourOverlay() {
  const pathname = usePathname()
  const router = useRouter()
  const [enabled, setEnabled] = useState(false)
  const [index, setIndex] = useState(0)
  const [intervalSec, setIntervalSec] = useState(PAGE_TOUR_DEFAULT_INTERVAL_SEC)
  const [paused, setPaused] = useState(false)
  const [countdown, setCountdown] = useState(PAGE_TOUR_DEFAULT_INTERVAL_SEC)

  const routes = useMemo(() => getActiveTourRoutes(), [pathname])

  const current = routes[index]
  const nextRoute = routes[nextTourIndex(index, routes.length)]

  const stopTour = useCallback(() => {
    sessionStorage.removeItem(PAGE_TOUR_STORAGE.active)
    sessionStorage.removeItem(PAGE_TOUR_STORAGE.paused)
    setEnabled(false)
    setPaused(false)
  }, [])

  const goTo = useCallback(
    (targetIndex: number) => {
      const route = routes[targetIndex]
      if (!route) return
      sessionStorage.setItem(PAGE_TOUR_STORAGE.index, String(targetIndex))
      setIndex(targetIndex)
      setCountdown(intervalSec)
      router.push(route.path)
    },
    [routes, router, intervalSec],
  )

  useEffect(() => {
    if (typeof window === "undefined") return
    if (!canUsePageTour(window.location.hostname)) return

    const active = readBool(PAGE_TOUR_STORAGE.active)
    if (!active) return

    const sec = readNumber(PAGE_TOUR_STORAGE.intervalSec, PAGE_TOUR_DEFAULT_INTERVAL_SEC)
    const tourRoutes = getActiveTourRoutes()
    const storedIndex = readNumber(PAGE_TOUR_STORAGE.index, 0)
    const pathIndex = findTourIndex(pathname, tourRoutes)
    const resolvedIndex = pathIndex >= 0 ? pathIndex : Math.min(storedIndex, tourRoutes.length - 1)

    sessionStorage.setItem(PAGE_TOUR_STORAGE.index, String(resolvedIndex))
    setEnabled(true)
    setIntervalSec(sec)
    setIndex(resolvedIndex)
    setPaused(readBool(PAGE_TOUR_STORAGE.paused))
    setCountdown(sec)
  }, [pathname])

  useEffect(() => {
    if (!enabled || paused) return
    setCountdown(intervalSec)
  }, [enabled, paused, pathname, intervalSec])

  useEffect(() => {
    if (!enabled || paused || routes.length === 0) return

    const timer = window.setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          const storedIndex = readNumber(PAGE_TOUR_STORAGE.index, 0)
          const next = nextTourIndex(storedIndex, routes.length)
          const route = routes[next]
          if (route) {
            sessionStorage.setItem(PAGE_TOUR_STORAGE.index, String(next))
            setIndex(next)
            router.push(route.path)
          }
          return intervalSec
        }
        return prev - 1
      })
    }, 1000)

    return () => window.clearInterval(timer)
  }, [enabled, paused, routes, router, intervalSec])

  useEffect(() => {
    if (!enabled) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return
      }

      if (event.key === " ") {
        event.preventDefault()
        const nextPaused = !paused
        setPaused(nextPaused)
        sessionStorage.setItem(PAGE_TOUR_STORAGE.paused, nextPaused ? "1" : "0")
        if (!nextPaused) setCountdown(intervalSec)
      } else if (event.key === "ArrowRight") {
        event.preventDefault()
        goTo(nextTourIndex(index, routes.length))
      } else if (event.key === "ArrowLeft") {
        event.preventDefault()
        goTo(prevTourIndex(index, routes.length))
      } else if (event.key === "Escape") {
        event.preventDefault()
        stopTour()
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [enabled, paused, index, routes.length, intervalSec, goTo, stopTour])

  if (!enabled || !current) return null

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-layer-floating border-t border-border bg-card px-3 py-2 shadow-sm pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:px-4"
      role="status"
      aria-live="polite"
      aria-label="Page tour controls"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 text-sm">
          <p className="font-medium text-foreground">
            Page tour{" "}
            <span className="text-muted-foreground">
              ({index + 1}/{routes.length})
            </span>
          </p>
          <p className="truncate text-muted-foreground">
            <span className="font-mono text-foreground">{current.path}</span>
            {!paused && nextRoute ? (
              <>
                {" "}
                · next{" "}
                <span className="font-mono text-foreground">{nextRoute.path}</span> in{" "}
                <span className="tabular-nums font-semibold text-primary">{countdown}s</span>
              </>
            ) : (
              <span className="text-warning"> · paused</span>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="touch-target"
            onClick={() => goTo(prevTourIndex(index, routes.length))}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="touch-target"
            onClick={() => {
              const nextPaused = !paused
              setPaused(nextPaused)
              sessionStorage.setItem(PAGE_TOUR_STORAGE.paused, nextPaused ? "1" : "0")
              if (!nextPaused) setCountdown(intervalSec)
            }}
            aria-label={paused ? "Resume tour" : "Pause tour"}
          >
            {paused ? <Play className="h-4 w-4" aria-hidden="true" /> : <Pause className="h-4 w-4" aria-hidden="true" />}
          </Button>
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="touch-target"
            onClick={() => goTo(nextTourIndex(index, routes.length))}
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="min-h-11"
            onClick={stopTour}
            aria-label="Stop page tour"
          >
            <Square className="h-4 w-4" aria-hidden="true" />
            Stop
          </Button>
        </div>
      </div>
    </div>
  )
}
