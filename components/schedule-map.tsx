"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { X, ZoomIn, ZoomOut, MapPin } from "lucide-react"
import { mapLocations, type MapLocation } from "@/lib/venue-map-data"

interface ScheduleMapProps {
  highlightedLocationId?: string | null
  onClose?: () => void
}

export function ScheduleMap({ highlightedLocationId, onClose }: ScheduleMapProps) {
  const [scale, setScale] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [selectedLocation, setSelectedLocation] = useState<MapLocation | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Track drag/pan
  const isDragging = useRef(false)
  const dragStart = useRef({ x: 0, y: 0 })
  const positionRef = useRef({ x: 0, y: 0 })

  // Track pinch
  const lastPinchDist = useRef<number | null>(null)
  const lastPinchMid = useRef<{ x: number; y: number } | null>(null)
  const scaleRef = useRef(1)

  // Sync refs with state so event handlers always read fresh values
  useEffect(() => { positionRef.current = position }, [position])
  useEffect(() => { scaleRef.current = scale }, [scale])

  const clampPosition = useCallback((x: number, y: number, s: number) => {
    const el = containerRef.current
    if (!el) return { x, y }
    const cw = el.clientWidth
    const ch = el.clientHeight
    const mapW = cw * s
    const mapH = ch * s
    // Allow panning but don't let the map disappear off screen more than 80%
    const maxX = cw * 0.8
    const maxY = ch * 0.8
    const minX = cw - mapW - cw * 0.8 + cw
    const minY = ch - mapH - ch * 0.8 + ch
    return {
      x: Math.min(maxX, Math.max(minX, x)),
      y: Math.min(maxY, Math.max(minY, y)),
    }
  }, [])

  // Center on highlighted location when it changes
  useEffect(() => {
    if (highlightedLocationId) {
      const location = mapLocations.find((loc) => loc.id === highlightedLocationId)
      if (location && containerRef.current) {
        const cw = containerRef.current.clientWidth
        const ch = containerRef.current.clientHeight
        const newScale = 2
        const newX = cw / 2 - (location.x / 100) * cw * newScale
        const newY = ch / 2 - (location.y / 100) * ch * newScale
        const clamped = clampPosition(newX, newY, newScale)
        setScale(newScale)
        setPosition(clamped)
        setSelectedLocation(location)
      }
    }
  }, [highlightedLocationId, clampPosition])

  const handleReset = () => {
    setScale(1)
    setPosition({ x: 0, y: 0 })
    setSelectedLocation(null)
  }

  const handleZoomIn = () => {
    const newScale = Math.min(scaleRef.current + 0.5, 4)
    const el = containerRef.current
    if (!el) return
    const cx = el.clientWidth / 2
    const cy = el.clientHeight / 2
    // Zoom toward center
    const newX = cx - (cx - positionRef.current.x) * (newScale / scaleRef.current)
    const newY = cy - (cy - positionRef.current.y) * (newScale / scaleRef.current)
    const clamped = clampPosition(newX, newY, newScale)
    setScale(newScale)
    setPosition(clamped)
  }

  const handleZoomOut = () => {
    const newScale = Math.max(scaleRef.current - 0.5, 0.75)
    const el = containerRef.current
    if (!el) return
    const cx = el.clientWidth / 2
    const cy = el.clientHeight / 2
    const newX = cx - (cx - positionRef.current.x) * (newScale / scaleRef.current)
    const newY = cy - (cy - positionRef.current.y) * (newScale / scaleRef.current)
    const clamped = clampPosition(newX, newY, newScale)
    setScale(newScale)
    setPosition(clamped)
  }

  // ── Mouse handlers ──────────────────────────────────────────────────────
  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true
    dragStart.current = { x: e.clientX - positionRef.current.x, y: e.clientY - positionRef.current.y }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return
    const raw = { x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y }
    const clamped = clampPosition(raw.x, raw.y, scaleRef.current)
    setPosition(clamped)
  }

  const handleMouseUp = () => { isDragging.current = false }

  // ── Touch handlers (attached via useEffect to get passive: false) ───────
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        isDragging.current = true
        lastPinchDist.current = null
        lastPinchMid.current = null
        dragStart.current = {
          x: e.touches[0].clientX - positionRef.current.x,
          y: e.touches[0].clientY - positionRef.current.y,
        }
      } else if (e.touches.length === 2) {
        // Starting a pinch — stop any pan
        isDragging.current = false
        const dx = e.touches[1].clientX - e.touches[0].clientX
        const dy = e.touches[1].clientY - e.touches[0].clientY
        lastPinchDist.current = Math.hypot(dx, dy)
        lastPinchMid.current = {
          x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
          y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
        }
      }
    }

    const onTouchMove = (e: TouchEvent) => {
      // Prevent browser page zoom / scroll while interacting with the map
      e.preventDefault()

      if (e.touches.length === 1 && isDragging.current) {
        const raw = {
          x: e.touches[0].clientX - dragStart.current.x,
          y: e.touches[0].clientY - dragStart.current.y,
        }
        const clamped = clampPosition(raw.x, raw.y, scaleRef.current)
        positionRef.current = clamped
        setPosition(clamped)
      } else if (e.touches.length === 2 && lastPinchDist.current !== null && lastPinchMid.current !== null) {
        const dx = e.touches[1].clientX - e.touches[0].clientX
        const dy = e.touches[1].clientY - e.touches[0].clientY
        const dist = Math.hypot(dx, dy)
        const mid = {
          x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
          y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
        }

        const ratio = dist / lastPinchDist.current
        const newScale = Math.min(4, Math.max(0.75, scaleRef.current * ratio))

        // Zoom toward the midpoint of the pinch
        const rect = el.getBoundingClientRect()
        const localMidX = mid.x - rect.left
        const localMidY = mid.y - rect.top
        const newX = localMidX - (localMidX - positionRef.current.x) * (newScale / scaleRef.current)
        const newY = localMidY - (localMidY - positionRef.current.y) * (newScale / scaleRef.current)
        const clamped = clampPosition(newX, newY, newScale)

        scaleRef.current = newScale
        positionRef.current = clamped
        setScale(newScale)
        setPosition(clamped)

        lastPinchDist.current = dist
        lastPinchMid.current = mid
      }
    }

    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        lastPinchDist.current = null
        lastPinchMid.current = null
      }
      if (e.touches.length === 0) {
        isDragging.current = false
      }
    }

    el.addEventListener("touchstart", onTouchStart, { passive: false })
    el.addEventListener("touchmove", onTouchMove, { passive: false })
    el.addEventListener("touchend", onTouchEnd, { passive: true })

    return () => {
      el.removeEventListener("touchstart", onTouchStart)
      el.removeEventListener("touchmove", onTouchMove)
      el.removeEventListener("touchend", onTouchEnd)
    }
  }, [clampPosition])

  return (
    <div className="relative w-full h-full bg-muted/30 rounded-lg overflow-hidden select-none">

      {/* Controls */}
      <div className="absolute top-2 right-2 z-20 flex gap-1">
        <button
          onClick={handleZoomIn}
          className="p-2 bg-background/90 rounded-md shadow-sm hover:bg-background transition-colors touch-manipulation"
          aria-label="Zoom in"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
        <button
          onClick={handleZoomOut}
          className="p-2 bg-background/90 rounded-md shadow-sm hover:bg-background transition-colors touch-manipulation"
          aria-label="Zoom out"
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        <button
          onClick={handleReset}
          className="px-2 py-1 bg-background/90 rounded-md shadow-sm hover:bg-background transition-colors text-xs touch-manipulation"
        >
          Reset
        </button>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 bg-background/90 rounded-md shadow-sm hover:bg-background transition-colors touch-manipulation"
            aria-label="Close map"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Map container */}
      <div
        ref={containerRef}
        className="w-full h-full overflow-hidden cursor-grab active:cursor-grabbing"
        style={{ touchAction: "none" }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div
          className="relative origin-top-left will-change-transform"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transformOrigin: "0 0",
          }}
        >
          {/* Map image */}
          <img
            src="/images/venue-map.jpg"
            alt="Lake Williamson Christian Center venue map"
            className="w-full h-auto pointer-events-none"
            draggable={false}
          />

          {/* Location markers */}
          {mapLocations.map((location) => {
            const isHighlighted = location.id === highlightedLocationId
            const isSelected = selectedLocation?.id === location.id
            const color =
              location.category === "dining"
                ? "text-orange-500"
                : location.category === "meeting"
                  ? "text-red-500"
                  : "text-purple-500"

            return (
              <button
                key={location.id}
                onClick={(e) => {
                  e.stopPropagation()
                  setSelectedLocation(isSelected ? null : location)
                }}
                className={`absolute -translate-x-1/2 -translate-y-full touch-manipulation ${
                  isHighlighted ? "z-30 animate-bounce" : "z-10 hover:z-20"
                }`}
                style={{ left: `${location.x}%`, top: `${location.y}%` }}
                aria-label={location.name}
              >
                <MapPin
                  className={`drop-shadow-md transition-all ${color} ${
                    isHighlighted || isSelected ? "h-9 w-9" : "h-6 w-6"
                  }`}
                  fill={isHighlighted || isSelected ? "currentColor" : "white"}
                />
              </button>
            )
          })}

          {/* Selected location popup */}
          {selectedLocation && (
            <div
              className="absolute z-40 bg-background rounded-xl shadow-xl p-3 min-w-[170px] max-w-[210px] -translate-x-1/2 border border-border/50"
              style={{ left: `${selectedLocation.x}%`, top: `${selectedLocation.y + 3}%` }}
            >
              <button
                onClick={() => setSelectedLocation(null)}
                className="absolute top-1.5 right-1.5 p-1 hover:bg-muted rounded touch-manipulation"
                aria-label="Close popup"
              >
                <X className="h-3 w-3" />
              </button>
              <div className="flex items-start gap-2 pr-4">
                <MapPin
                  className={`h-4 w-4 mt-0.5 shrink-0 ${
                    selectedLocation.category === "dining"
                      ? "text-orange-500"
                      : selectedLocation.category === "meeting"
                        ? "text-red-500"
                        : "text-purple-500"
                  }`}
                />
                <div>
                  <p className="font-semibold text-xs leading-snug">{selectedLocation.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{selectedLocation.description}</p>
                  <span className={`mt-1.5 inline-block text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                    selectedLocation.category === "dining"
                      ? "bg-orange-100 text-orange-700"
                      : selectedLocation.category === "meeting"
                        ? "bg-red-100 text-red-700"
                        : "bg-purple-100 text-purple-700"
                  }`}>
                    {selectedLocation.category.charAt(0).toUpperCase() + selectedLocation.category.slice(1)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="absolute bottom-2 left-2 z-20 flex flex-wrap gap-2 text-xs bg-background/90 rounded-md p-2 shadow-sm">
        <div className="flex items-center gap-1">
          <MapPin className="h-3 w-3 text-red-500" fill="white" />
          <span>Meeting</span>
        </div>
        <div className="flex items-center gap-1">
          <MapPin className="h-3 w-3 text-orange-500" fill="white" />
          <span>Dining</span>
        </div>
        <div className="flex items-center gap-1">
          <MapPin className="h-3 w-3 text-purple-500" fill="white" />
          <span>Activity</span>
        </div>
      </div>

      <p className="absolute bottom-2 right-2 z-20 text-xs text-muted-foreground bg-background/90 rounded-md px-2 py-1">
        Pinch to zoom · drag to pan
      </p>
    </div>
  )
}
