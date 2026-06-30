"use client"

import { ChevronRight, MapPin, Bed } from "lucide-react"
import { mapLocations, mapPaths } from "@/lib/venue-map-data"
import { LU_MAP, LU_PIN_COLORS, luPinStyle } from "@/lib/live-updates-colors"
import { LuNowDot } from "@/components/live-updates/lu-now-dot"
import { getEventIcon } from "@/components/live-updates/event-icon"
import { getLocationIdForEvent } from "@/lib/live-updates/location"
import type { ScheduleItem } from "@/lib/live-updates/types"

export function MapView({ 
  nowItem, 
  nextItem, 
  prevItem 
}: { 
  nowItem: ScheduleItem | null
  nextItem: ScheduleItem | null
  prevItem: ScheduleItem | null
}) {
  // Prefer current event, fall back to next
  const featuredItem = nowItem || nextItem
  const isHappeningNow = !!nowItem
  const featuredLocationId = getLocationIdForEvent(featuredItem)
  const featuredLocation = featuredLocationId 
    ? mapLocations.find(l => l.id === featuredLocationId) 
    : null

  // Find the previous location (where you're coming from)
  const prevLocationId = getLocationIdForEvent(prevItem)
  const prevLocation = prevLocationId && prevLocationId !== featuredLocationId
    ? mapLocations.find(l => l.id === prevLocationId)
    : null

  // Try to find a path between prev and featured location.
  // Paths are defined in either direction, so check both and reverse if needed.
  let routePoints: { x: number; y: number }[] | null = null
  let routeColor = LU_MAP.routeDefault
  if (prevLocationId && featuredLocationId && prevLocationId !== featuredLocationId) {
    const path = mapPaths.find(p => {
      const endpoints = p.points.filter(pt => pt.pinId).map(pt => pt.pinId)
      return endpoints.includes(prevLocationId) && endpoints.includes(featuredLocationId)
    })
    if (path) {
      const firstPin = path.points.find(pt => pt.pinId)?.pinId
      const points = firstPin === prevLocationId ? path.points : [...path.points].reverse()
      routePoints = points.map(pt => ({ x: pt.x, y: pt.y }))
      // Use the featured location's color for the route to reinforce the destination
    }
  }

  const cc = featuredLocation
    ? luPinStyle(featuredLocation.color, featuredLocation.category)
    : LU_PIN_COLORS.orange
  
  if (featuredLocation) {
    routeColor = cc.hex
  }

  return (
    <div className="relative w-full h-full flex flex-col xl:flex-row gap-4 xl:gap-6 min-h-0 overflow-y-auto xl:overflow-hidden">
      {/* Left side - Event info card */}
      <div className="w-full shrink-0 flex flex-col max-h-[min(50dvh,22rem)] xl:w-[26rem] xl:max-h-none">
        <div className="lu-panel relative flex flex-1 flex-col justify-center overflow-y-auto overflow-x-hidden p-5 sm:p-7">
          <div className="relative">
            {featuredItem ? (
              <>
                <div className="flex items-center gap-3 mb-5">
                  {isHappeningNow ? (
                    <>
                      <LuNowDot size="md" />
                      <span className="lu-kicker lu-text-now">Happening now</span>
                    </>
                  ) : (
                    <>
                      <ChevronRight className={`h-5 w-5 ${cc.icon}`} />
                      <span className={`lu-kicker ${cc.text}`}>Up next</span>
                    </>
                  )}
                </div>
                <div className="mb-5">
                  {/* Icon recolored to match destination pin */}
                  {getEventIcon(featuredItem.title, featuredItem.isMeal, "lg", cc.icon)}
                </div>
                <h2 className="lu-type-board-md mb-2 text-balance">{featuredItem.title}</h2>
                <p className="text-xl lu-text-secondary mb-1">
                  {isHappeningNow ? featuredItem.time : `${featuredItem.day} ${featuredItem.time}`}
                </p>
                {prevLocation && routePoints && (
                  <div className="mt-5 p-3.5 rounded-xl bg-white/5 border border-primary/20">
                    <div className="flex items-start gap-3">
                      <div className="flex flex-col items-center pt-1">
                        <div className="w-2.5 h-2.5 rounded-full bg-white/40" />
                        <div className="w-px h-5 bg-white/20 my-1" />
                        <ChevronRight className={`h-4 w-4 ${cc.icon} rotate-90`} />
                      </div>
                      <div>
                        <p className="lu-type-label-sm lu-text-subtle mb-0.5">Coming From</p>
                        <p className="text-base font-medium lu-text-body leading-tight">{prevLocation.name}</p>
                      </div>
                    </div>
                  </div>
                )}
                {featuredLocation && (
                  <div className={`mt-3 p-4 rounded-xl lu-panel-inner border ${cc.border}`}>
                    <div className="flex items-start gap-3">
                      <MapPin className={`h-6 w-6 ${cc.icon} shrink-0 mt-1`} fill="currentColor" />
                      <div>
                        <p className={`lu-type-label-sm ${cc.text} mb-1`}>
                          {prevLocation && routePoints ? "Heading To" : "Location"}
                        </p>
                        <p className="text-xl font-semibold leading-tight">{featuredLocation.name}</p>
                        {featuredLocation.description && (
                          <p className="lu-text-muted text-sm mt-1.5 leading-snug">{featuredLocation.description}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center">
                <Bed className="h-24 w-24 lu-icon-muted mx-auto mb-4" />
                <h2 className="lu-type-board-md lu-text-muted">No Active Events</h2>
                <p className="text-lg lu-text-subtle mt-2">Free time at the venue</p>
              </div>
            )}
          </div>
        </div>

        {/* Legend */}
        <div className="mt-4 px-2 grid grid-cols-2 gap-2">
          <div className="flex items-center gap-2 text-xs lu-text-muted">
            <MapPin className="h-3.5 w-3.5 lu-pin-coral" fill="currentColor" />
            <span>Meeting</span>
          </div>
          <div className="flex items-center gap-2 text-xs lu-text-muted">
            <MapPin className="h-3.5 w-3.5 lu-pin-warm" fill="currentColor" />
            <span>Dining</span>
          </div>
          <div className="flex items-center gap-2 text-xs lu-text-muted">
            <MapPin className="h-3.5 w-3.5 lu-pin-ink" fill="currentColor" />
            <span>Activity</span>
          </div>
          <div className="flex items-center gap-2 text-xs lu-text-muted">
            <MapPin className="h-3.5 w-3.5 lu-pin-lake" fill="currentColor" />
            <span>Lodging</span>
          </div>
        </div>
      </div>

      {/* Right side - Venue map */}
      <div className="lu-panel relative flex min-h-[min(40dvh,18rem)] flex-1 items-center justify-center p-3 pt-10 xl:pt-14">
        {/* Aspect-ratio wrapper. NOTE: no overflow-hidden so the pin's floating name label can render above the map for pins near the top edge. The image itself has rounded corners so the visual still looks clean. */}
        <div
          className="relative"
          style={{
            width: "100%",
            aspectRatio: "4 / 3",
            maxHeight: "100%",
            maxWidth: "100%",
          }}
        >
          <img
            src="/images/venue-map.jpg"
            alt="Lake Williamson venue map"
            className="absolute inset-0 w-full h-full rounded-lg"
            draggable={false}
          />

          {/* Route path overlay - shown when there's a known path from prev → featured */}
          {routePoints && routePoints.length >= 2 && (
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              style={{ zIndex: 5 }}
            >
              <defs>
                <marker
                  id="route-arrow"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="5"
                  markerHeight="5"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill={routeColor} />
                </marker>
              </defs>
              {/* Subtle white halo behind the route for contrast on the colorful map */}
              <polyline
                points={routePoints.map(p => `${p.x},${p.y}`).join(" ")}
                fill="none"
                stroke="white"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.7"
                vectorEffect="non-scaling-stroke"
                style={{ strokeWidth: 8 }}
              />
              {/* Animated dashed colored route */}
              <polyline
                points={routePoints.map(p => `${p.x},${p.y}`).join(" ")}
                fill="none"
                stroke={routeColor}
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
                markerEnd="url(#route-arrow)"
                style={{ 
                  strokeWidth: 5,
                  strokeDasharray: "8 6",
                  animation: "route-dash 1.2s linear infinite",
                }}
              />
              <style>{`
                @keyframes route-dash {
                  to { stroke-dashoffset: -14; }
                }
              `}</style>
            </svg>
          )}

          {/* Pins overlay - positioned as % of the wrapper, which equals image pixels */}
          {mapLocations.map((location) => {
            const isFeatured = location.id === featuredLocationId
            const isPrev = location.id === prevLocationId && location.id !== featuredLocationId && !!routePoints
            const pinStyle = luPinStyle(location.color, location.category)
            const hex = pinStyle.hex
            
            return (
              <div
                key={location.id}
                className="absolute -translate-x-1/2 -translate-y-full pointer-events-none"
                style={{ 
                  left: `${location.x}%`, 
                  top: `${location.y}%`,
                  zIndex: isFeatured ? 20 : isPrev ? 15 : 10,
                }}
              >
                {isFeatured && (
                  <div 
                    className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-12 h-12 rounded-full"
                    style={{ backgroundColor: hex, opacity: 0.14 }}
                  />
                )}
                {isPrev && (
                  <div 
                    className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full border-2 border-white/70 bg-white/30"
                  />
                )}
                <MapPin
                  className={`relative drop-shadow-sm transition-colors ${
                    isFeatured ? "h-14 w-14" 
                    : isPrev ? "h-10 w-10" 
                    : "h-7 w-7 opacity-70"
                  }`}
                  style={{ color: isPrev ? LU_MAP.labelOnPin : hex }}
                  fill={isFeatured ? hex : isPrev ? LU_MAP.prevFill : "white"}
                  strokeWidth={2}
                />
                {isFeatured && (
                  <div 
                    className="absolute left-1/2 -translate-x-1/2 -top-12 px-3 py-1.5 rounded-lg text-sm font-semibold whitespace-nowrap shadow-md"
                    style={{ backgroundColor: hex, color: LU_MAP.labelOnPin }}
                  >
                    {location.name}
                  </div>
                )}
                {isPrev && (
                  <div 
                    className="absolute left-1/2 -translate-x-1/2 -top-9 px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap shadow-sm bg-white/90 text-black/80"
                  >
                    {location.name}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
