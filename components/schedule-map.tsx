"use client"

import { useState, useRef, useEffect } from "react"
import { X, ZoomIn, ZoomOut, MapPin } from "lucide-react"
import { mapLocations, categoryColors, type MapLocation } from "@/lib/venue-map-data"

interface ScheduleMapProps {
  highlightedLocationId?: string | null
  onClose?: () => void
}

export function ScheduleMap({ highlightedLocationId, onClose }: ScheduleMapProps) {
  const [scale, setScale] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [selectedLocation, setSelectedLocation] = useState<MapLocation | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Center on highlighted location when it changes
  useEffect(() => {
    if (highlightedLocationId) {
      const location = mapLocations.find((loc) => loc.id === highlightedLocationId)
      if (location && containerRef.current) {
        const containerWidth = containerRef.current.clientWidth
        const containerHeight = containerRef.current.clientHeight
        
        // Calculate position to center the location
        const newX = containerWidth / 2 - (location.x / 100) * containerWidth * scale
        const newY = containerHeight / 2 - (location.y / 100) * containerHeight * scale
        
        setPosition({ x: newX, y: newY })
        setScale(1.5)
        setSelectedLocation(location)
      }
    }
  }, [highlightedLocationId])

  const handleZoomIn = () => setScale((prev) => Math.min(prev + 0.5, 4))
  const handleZoomOut = () => setScale((prev) => Math.max(prev - 0.5, 0.5))

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget || (e.target as HTMLElement).tagName === "IMG") {
      setIsDragging(true)
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y })
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      })
    }
  }

  const handleMouseUp = () => setIsDragging(false)

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0]
    setIsDragging(true)
    setDragStart({ x: touch.clientX - position.x, y: touch.clientY - position.y })
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDragging) {
      const touch = e.touches[0]
      setPosition({
        x: touch.clientX - dragStart.x,
        y: touch.clientY - dragStart.y,
      })
    }
  }

  const handleTouchEnd = () => setIsDragging(false)

  const handleReset = () => {
    setScale(1)
    setPosition({ x: 0, y: 0 })
    setSelectedLocation(null)
  }

  return (
    <div className="relative w-full h-full bg-muted/30 rounded-lg overflow-hidden">
      {/* Controls */}
      <div className="absolute top-2 right-2 z-20 flex gap-1">
        <button
          onClick={handleZoomIn}
          className="p-2 bg-background/90 rounded-md shadow-sm hover:bg-background transition-colors"
          aria-label="Zoom in"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
        <button
          onClick={handleZoomOut}
          className="p-2 bg-background/90 rounded-md shadow-sm hover:bg-background transition-colors"
          aria-label="Zoom out"
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        <button
          onClick={handleReset}
          className="px-2 py-1 bg-background/90 rounded-md shadow-sm hover:bg-background transition-colors text-xs"
        >
          Reset
        </button>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 bg-background/90 rounded-md shadow-sm hover:bg-background transition-colors"
            aria-label="Close map"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Map container */}
      <div
        ref={containerRef}
        className="w-full h-full cursor-grab active:cursor-grabbing overflow-hidden"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="relative transition-transform duration-100"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transformOrigin: "0 0",
          }}
        >
          {/* Map image */}
          <img
            src="/images/venue-map.jpg"
            alt="Lake Williamson Christian Center venue map"
            className="w-full h-auto select-none pointer-events-none"
            draggable={false}
          />

          {/* Location markers */}
          {mapLocations.map((location) => {
            const isHighlighted = location.id === highlightedLocationId
            const isSelected = selectedLocation?.id === location.id

            return (
              <button
                key={location.id}
                onClick={(e) => {
                  e.stopPropagation()
                  setSelectedLocation(isSelected ? null : location)
                }}
                className={`absolute -translate-x-1/2 -translate-y-full transition-all duration-300 ${
                  isHighlighted ? "z-30 animate-bounce" : "z-10"
                }`}
                style={{
                  left: `${location.x}%`,
                  top: `${location.y}%`,
                }}
                aria-label={location.name}
              >
                <div className="relative">
                  <MapPin
                    className={`h-6 w-6 drop-shadow-md ${
                      isHighlighted || isSelected
                        ? "text-primary h-8 w-8"
                        : location.category === "dining"
                          ? "text-orange-500"
                          : location.category === "meeting"
                            ? "text-red-500"
                            : "text-purple-500"
                    }`}
                    fill={isHighlighted || isSelected ? "currentColor" : "white"}
                  />
                </div>
              </button>
            )
          })}

          {/* Selected location popup */}
          {selectedLocation && (
            <div
              className="absolute z-40 bg-background rounded-lg shadow-lg p-3 min-w-[180px] max-w-[220px] -translate-x-1/2"
              style={{
                left: `${selectedLocation.x}%`,
                top: `${selectedLocation.y + 2}%`,
              }}
            >
              <button
                onClick={() => setSelectedLocation(null)}
                className="absolute top-1 right-1 p-1 hover:bg-muted rounded"
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
                  <p className="font-semibold text-sm">{selectedLocation.name}</p>
                  <p className="text-xs text-muted-foreground">{selectedLocation.description}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="absolute bottom-2 left-2 z-20 flex flex-wrap gap-2 text-xs bg-background/90 rounded-md p-2">
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
          <span>Recreation</span>
        </div>
      </div>

      {/* Instructions */}
      <p className="absolute bottom-2 right-2 z-20 text-xs text-muted-foreground bg-background/90 rounded-md px-2 py-1">
        Drag to pan
      </p>
    </div>
  )
}
