"use client"

import { useState, useRef } from "react"
import Image from "next/image"
import { MapPin, X, ZoomIn, ZoomOut, RotateCcw } from "lucide-react"
import { mapLocations, categoryColors, categoryLabels, type MapLocation } from "@/lib/venue-map-data"
import { cn } from "@/lib/utils"

interface InteractiveVenueMapProps {
  highlightedLocationId?: string | null
  onLocationSelect?: (location: MapLocation | null) => void
}

export function InteractiveVenueMap({ highlightedLocationId, onLocationSelect }: InteractiveVenueMapProps) {
  const [selectedLocation, setSelectedLocation] = useState<MapLocation | null>(null)
  const [scale, setScale] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [activeCategories, setActiveCategories] = useState<Set<MapLocation["category"]>>(
    new Set(["lodging", "dining", "activities", "recreation", "meeting"])
  )
  const containerRef = useRef<HTMLDivElement>(null)

  const handleLocationClick = (location: MapLocation) => {
    setSelectedLocation(location)
    onLocationSelect?.(location)
  }

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.5, 4))
  }

  const handleZoomOut = () => {
    setScale((prev) => Math.max(prev - 0.5, 1))
  }

  const handleReset = () => {
    setScale(1)
    setPosition({ x: 0, y: 0 })
    setSelectedLocation(null)
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1) {
      setIsDragging(true)
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y })
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && scale > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      })
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const toggleCategory = (category: MapLocation["category"]) => {
    setActiveCategories((prev) => {
      const next = new Set(prev)
      if (next.has(category)) {
        next.delete(category)
      } else {
        next.add(category)
      }
      return next
    })
  }

  const filteredLocations = mapLocations.filter((loc) => activeCategories.has(loc.category))

  return (
    <div className="flex flex-col gap-4">
      {/* Category filters */}
      <div className="flex flex-wrap gap-2">
        {(Object.keys(categoryLabels) as MapLocation["category"][]).map((category) => (
          <button
            key={category}
            onClick={() => toggleCategory(category)}
            className={cn(
              "flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-all",
              activeCategories.has(category)
                ? `${categoryColors[category]} text-white`
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                activeCategories.has(category) ? "bg-white" : categoryColors[category]
              )}
            />
            {categoryLabels[category]}
          </button>
        ))}
      </div>

      {/* Map container */}
      <div className="relative overflow-hidden rounded-xl border border-border bg-muted/30">
        {/* Zoom controls */}
        <div className="absolute right-3 top-3 z-20 flex flex-col gap-1">
          <button
            onClick={handleZoomIn}
            className="rounded-lg bg-background/90 p-2 shadow-md backdrop-blur-sm transition-colors hover:bg-background"
            aria-label="Zoom in"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <button
            onClick={handleZoomOut}
            className="rounded-lg bg-background/90 p-2 shadow-md backdrop-blur-sm transition-colors hover:bg-background"
            aria-label="Zoom out"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <button
            onClick={handleReset}
            className="rounded-lg bg-background/90 p-2 shadow-md backdrop-blur-sm transition-colors hover:bg-background"
            aria-label="Reset view"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>

        {/* Map with markers */}
        <div
          ref={containerRef}
          className={cn("relative", scale > 1 ? "cursor-grab" : "cursor-default", isDragging && "cursor-grabbing")}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <div
            className="relative transition-transform duration-200"
            style={{
              transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
              transformOrigin: "center center",
            }}
          >
            <Image
              src="/images/venue-map.jpg"
              alt="Lake Williamson Christian Center Map"
              width={1280}
              height={900}
              className="w-full select-none"
              draggable={false}
              priority
            />

            {/* Location markers */}
            {filteredLocations.map((location) => {
              const isHighlighted = highlightedLocationId === location.id
              const isSelected = selectedLocation?.id === location.id

              return (
                <button
                  key={location.id}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleLocationClick(location)
                  }}
                  className={cn(
                    "absolute -translate-x-1/2 -translate-y-full transition-all duration-200",
                    isHighlighted && "z-10 animate-bounce",
                    isSelected && "z-10"
                  )}
                  style={{ left: `${location.x}%`, top: `${location.y}%` }}
                  aria-label={location.name}
                >
                  <div className="relative">
                    <MapPin
                      className={cn(
                        "h-6 w-6 drop-shadow-lg transition-all md:h-8 md:w-8",
                        isHighlighted || isSelected ? "h-8 w-8 md:h-10 md:w-10" : "",
                        location.category === "lodging" && "text-blue-500",
                        location.category === "dining" && "text-orange-500",
                        location.category === "activities" && "text-green-500",
                        location.category === "recreation" && "text-purple-500",
                        location.category === "meeting" && "text-red-500"
                      )}
                      fill="currentColor"
                      strokeWidth={1.5}
                      stroke="white"
                    />
                    {isHighlighted && (
                      <span className="absolute -top-1 left-1/2 h-3 w-3 -translate-x-1/2 animate-ping rounded-full bg-primary" />
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Selected location popup */}
        {selectedLocation && (
          <div className="absolute bottom-3 left-3 right-3 z-20 rounded-lg bg-background/95 p-4 shadow-lg backdrop-blur-sm md:left-auto md:max-w-xs">
            <button
              onClick={() => {
                setSelectedLocation(null)
                onLocationSelect?.(null)
              }}
              className="absolute right-2 top-2 rounded-full p-1 hover:bg-muted"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="flex items-start gap-3">
              <div className={cn("mt-0.5 rounded-full p-1.5", categoryColors[selectedLocation.category])}>
                <MapPin className="h-4 w-4 text-white" />
              </div>
              <div>
                <h3 className="font-semibold">{selectedLocation.name}</h3>
                <p className="text-sm text-muted-foreground">{selectedLocation.description}</p>
                <span
                  className={cn(
                    "mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium text-white",
                    categoryColors[selectedLocation.category]
                  )}
                >
                  {categoryLabels[selectedLocation.category]}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
