"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { X, ZoomIn, ZoomOut, MapPin } from "lucide-react"
import { mapLocations, type MapLocation } from "@/lib/venue-map-data"

interface ScheduleMapProps {
  highlightedLocationId?: string | null
  onClose?: () => void
}

interface PopupPos {
  x: number
  y: number
  location: MapLocation
}

export function ScheduleMap({ highlightedLocationId, onClose }: ScheduleMapProps) {
  const [scale, setScale] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [popup, setPopup] = useState<PopupPos | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const mapLayerRef = useRef<HTMLDivElement>(null)

  const isDragging = useRef(false)
  const didDrag = useRef(false)
  const dragStart = useRef({ x: 0, y: 0 })
  const positionRef = useRef({ x: 0, y: 0 })
  const lastPinchDist = useRef<number | null>(null)
  const lastPinchMid = useRef<{ x: number; y: number } | null>(null)
  const scaleRef = useRef(1)

  useEffect(() => { positionRef.current = position }, [position])
  useEffect(() => { scaleRef.current = scale }, [scale])

  const clamp = useCallback((x: number, y: number, s: number) => {
    const el = containerRef.current
    if (!el) return { x, y }
    const cw = el.clientWidth
    const ch = el.clientHeight
    // Map is rendered at full container width, aspect ratio ~1.35
    const mapW = cw * s
    const mapH = mapW / 1.35
    const pad = 60 // px — how much map edge can go past the container edge
    return {
      x: Math.min(pad, Math.max(cw - mapW - pad, x)),
      y: Math.min(pad, Math.max(ch - mapH - pad, y)),
    }
  }, [])

  // Convert map-percentage coords → screen px (accounting for pan/scale)
  const mapPctToScreen = useCallback((pctX: number, pctY: number) => {
    const el = containerRef.current
    if (!el) return { x: 0, y: 0 }
    const cw = el.clientWidth
    const mapW = cw * scaleRef.current
    const mapH = mapW / 1.35
    return {
      x: positionRef.current.x + (pctX / 100) * mapW,
      y: positionRef.current.y + (pctY / 100) * mapH,
    }
  }, [])

  const openPopup = useCallback((location: MapLocation) => {
    const screen = mapPctToScreen(location.x, location.y)
    setPopup({ x: screen.x, y: screen.y, location })
  }, [mapPctToScreen])

  // Re-position popup whenever pan/scale changes
  useEffect(() => {
    if (!popup) return
    const screen = mapPctToScreen(popup.location.x, popup.location.y)
    setPopup(p => p ? { ...p, x: screen.x, y: screen.y } : null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scale, position])

  // Center on highlighted location
  useEffect(() => {
    if (!highlightedLocationId) return
    const location = mapLocations.find(l => l.id === highlightedLocationId)
    if (!location || !containerRef.current) return
    const el = containerRef.current
    const newScale = 2.2
    const cw = el.clientWidth
    const ch = el.clientHeight
    const mapW = cw * newScale
    const mapH = mapW / 1.35
    const rawX = cw / 2 - (location.x / 100) * mapW
    const rawY = ch / 2 - (location.y / 100) * mapH
    const clamped = clamp(rawX, rawY, newScale)
    setScale(newScale)
    setPosition(clamped)
    // Open popup after state settles
    setTimeout(() => openPopup(location), 50)
  }, [highlightedLocationId, clamp, openPopup])

  const zoomAround = useCallback((newScale: number, pivotX: number, pivotY: number) => {
    newScale = Math.min(4, Math.max(0.75, newScale))
    const ratio = newScale / scaleRef.current
    const newX = pivotX - (pivotX - positionRef.current.x) * ratio
    const newY = pivotY - (pivotY - positionRef.current.y) * ratio
    const clamped = clamp(newX, newY, newScale)
    scaleRef.current = newScale
    positionRef.current = clamped
    setScale(newScale)
    setPosition(clamped)
  }, [clamp])

  const handleZoomIn = () => {
    const el = containerRef.current
    if (!el) return
    zoomAround(scaleRef.current + 0.5, el.clientWidth / 2, el.clientHeight / 2)
  }

  const handleZoomOut = () => {
    const el = containerRef.current
    if (!el) return
    zoomAround(scaleRef.current - 0.5, el.clientWidth / 2, el.clientHeight / 2)
  }

  const handleReset = () => {
    setScale(1)
    setPosition({ x: 0, y: 0 })
    setPopup(null)
  }

  // Mouse handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true
    didDrag.current = false
    dragStart.current = { x: e.clientX - positionRef.current.x, y: e.clientY - positionRef.current.y }
  }
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return
    didDrag.current = true
    const raw = { x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y }
    const clamped = clamp(raw.x, raw.y, scaleRef.current)
    positionRef.current = clamped
    setPosition(clamped)
  }
  const handleMouseUp = () => { isDragging.current = false }

  // Touch handlers — passive:false so preventDefault works
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        isDragging.current = true
        didDrag.current = false
        lastPinchDist.current = null
        dragStart.current = {
          x: e.touches[0].clientX - positionRef.current.x,
          y: e.touches[0].clientY - positionRef.current.y,
        }
      } else if (e.touches.length === 2) {
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
      e.preventDefault()
      if (e.touches.length === 1 && isDragging.current) {
        didDrag.current = true
        const raw = {
          x: e.touches[0].clientX - dragStart.current.x,
          y: e.touches[0].clientY - dragStart.current.y,
        }
        const clamped = clamp(raw.x, raw.y, scaleRef.current)
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
        const rect = el.getBoundingClientRect()
        zoomAround(scaleRef.current * (dist / lastPinchDist.current), mid.x - rect.left, mid.y - rect.top)
        lastPinchDist.current = dist
        lastPinchMid.current = mid
      }
    }

    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) lastPinchDist.current = null
      if (e.touches.length === 0) isDragging.current = false
    }

    el.addEventListener("touchstart", onTouchStart, { passive: false })
    el.addEventListener("touchmove", onTouchMove, { passive: false })
    el.addEventListener("touchend", onTouchEnd, { passive: true })
    return () => {
      el.removeEventListener("touchstart", onTouchStart)
      el.removeEventListener("touchmove", onTouchMove)
      el.removeEventListener("touchend", onTouchEnd)
    }
  }, [clamp, zoomAround])

  // Smart popup position — keeps it inside the container
  const getPopupStyle = (px: number, py: number): React.CSSProperties => {
    const el = containerRef.current
    if (!el) return { left: px, top: py }
    const cw = el.clientWidth
    const popupW = 200
    const popupH = 110
    const pinOffset = 28 // px above pin tip
    let left = px - popupW / 2
    let top = py - pinOffset - popupH

    // Flip below pin if would go off top
    if (top < 8) top = py + pinOffset

    // Clamp horizontally
    left = Math.max(8, Math.min(cw - popupW - 8, left))

    return { left, top, width: popupW }
  }

  const pinColor = (cat: MapLocation["category"]) =>
    cat === "dining" ? "text-orange-500" : cat === "meeting" ? "text-red-500" : "text-purple-500"

  const badgeClass = (cat: MapLocation["category"]) =>
    cat === "dining"
      ? "bg-orange-100 text-orange-700"
      : cat === "meeting"
        ? "bg-red-100 text-red-700"
        : "bg-purple-100 text-purple-700"

  return (
    <div className="relative w-full h-full bg-muted/30 overflow-hidden select-none">

      {/* Zoom controls — top-right, always visible */}
      <div className="absolute top-2 right-2 z-30 flex gap-1">
        <button onClick={handleZoomIn} className="p-2.5 bg-background/95 rounded-lg shadow border border-border/40 touch-manipulation active:scale-95 transition-transform" aria-label="Zoom in">
          <ZoomIn className="h-4 w-4" />
        </button>
        <button onClick={handleZoomOut} className="p-2.5 bg-background/95 rounded-lg shadow border border-border/40 touch-manipulation active:scale-95 transition-transform" aria-label="Zoom out">
          <ZoomOut className="h-4 w-4" />
        </button>
        <button onClick={handleReset} className="px-3 py-2 bg-background/95 rounded-lg shadow border border-border/40 text-xs font-medium touch-manipulation active:scale-95 transition-transform">
          Reset
        </button>
      </div>

      {/* Pannable / zoomable map layer */}
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
          ref={mapLayerRef}
          className="absolute top-0 left-0 origin-top-left will-change-transform"
          style={{
            width: "100%",
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transformOrigin: "0 0",
          }}
        >
          <img
            src="/images/venue-map.jpg"
            alt="Lake Williamson Christian Center venue map"
            className="w-full h-auto pointer-events-none block"
            draggable={false}
          />

          {/* Pins */}
          {mapLocations.map((location) => {
            const isHighlighted = location.id === highlightedLocationId
            const isSelected = popup?.location.id === location.id
            return (
              <button
                key={location.id}
                onPointerDown={e => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation()
                  if (isSelected) {
                    setPopup(null)
                  } else {
                    openPopup(location)
                  }
                }}
                className={`absolute -translate-x-1/2 -translate-y-full touch-manipulation ${
                  isHighlighted ? "z-20 animate-bounce" : "z-10"
                }`}
                style={{ left: `${location.x}%`, top: `${location.y}%` }}
                aria-label={location.name}
              >
                <MapPin
                  className={`drop-shadow-md transition-all duration-150 ${pinColor(location.category)} ${
                    isHighlighted || isSelected ? "h-9 w-9 scale-110" : "h-6 w-6"
                  }`}
                  fill={isHighlighted || isSelected ? "currentColor" : "white"}
                />
              </button>
            )
          })}
        </div>
      </div>

      {/* Popup — rendered outside scaled layer so it's never clipped/scaled */}
      {popup && (
        <div
          className="absolute z-40 bg-background rounded-xl shadow-xl border border-border/50 p-3"
          style={getPopupStyle(popup.x, popup.y)}
        >
          <button
            onClick={() => setPopup(null)}
            className="absolute top-2 right-2 p-1 hover:bg-muted rounded-md touch-manipulation"
            aria-label="Close"
          >
            <X className="h-3 w-3" />
          </button>
          <div className="flex items-start gap-2 pr-5">
            <MapPin className={`h-4 w-4 mt-0.5 shrink-0 ${pinColor(popup.location.category)}`} />
            <div className="min-w-0">
              <p className="font-semibold text-xs leading-snug">{popup.location.name}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{popup.location.description}</p>
              <span className={`mt-1.5 inline-block text-[10px] font-medium px-1.5 py-0.5 rounded-full ${badgeClass(popup.location.category)}`}>
                {popup.location.category.charAt(0).toUpperCase() + popup.location.category.slice(1)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-2 left-2 z-30 flex gap-3 text-xs bg-background/90 rounded-lg px-2.5 py-1.5 shadow border border-border/40">
        <div className="flex items-center gap-1"><MapPin className="h-3 w-3 text-red-500" fill="white" /><span>Meeting</span></div>
        <div className="flex items-center gap-1"><MapPin className="h-3 w-3 text-orange-500" fill="white" /><span>Dining</span></div>
        <div className="flex items-center gap-1"><MapPin className="h-3 w-3 text-purple-500" fill="white" /><span>Activity</span></div>
      </div>

      <p className="absolute bottom-2 right-2 z-30 text-[10px] text-muted-foreground/70">
        Pinch to zoom · drag to pan
      </p>
    </div>
  )
}
