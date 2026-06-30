"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { MapPin } from "lucide-react"
import { EMAIL_BRAND } from "@/lib/email-templates"

const DEFAULT_MARKER = EMAIL_BRAND.primary

interface Marker {
  position: [number, number]
  label: string
  size?: "sm" | "md" | "lg"
  color?: string
}

interface MapProps extends React.HTMLAttributes<HTMLDivElement> {
  center?: [number, number]
  zoom?: number
  markers?: Marker[]
}

export function Map({ 
  center = [39.2794, -89.8815], 
  zoom = 5, 
  markers = [],
  className, 
  children, 
  ...props 
}: MapProps) {
  const [selectedMarker, setSelectedMarker] = React.useState<number | null>(null)

  // Calculate bounds for OpenStreetMap embed
  const latRange = 20 / zoom
  const lngRange = 30 / zoom
  const bbox = `${center[1] - lngRange / 2},${center[0] - latRange / 2},${center[1] + lngRange / 2},${center[0] + latRange / 2}`

  const getMarkerSize = (size?: "sm" | "md" | "lg") => {
    switch (size) {
      case "sm": return "h-3 w-3"
      case "lg": return "h-6 w-6"
      default: return "h-4 w-4"
    }
  }

  // Convert lat/lng to percentage position on the map
  const getPosition = (lat: number, lng: number) => {
    const x = ((lng - (center[1] - lngRange / 2)) / lngRange) * 100
    const y = (((center[0] + latRange / 2) - lat) / latRange) * 100
    return { x, y }
  }

  return (
    <div className={cn("relative size-full overflow-hidden bg-muted", className)} {...props}>
      {/* OpenStreetMap iframe as base layer */}
      <iframe
        src={`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik`}
        className="absolute inset-0 h-full w-full border-0"
        style={{ filter: "saturate(0.9)" }}
        title="Map"
      />
      
      {/* Marker overlay */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="relative h-full w-full">
          {markers.map((marker, index) => {
            const pos = getPosition(marker.position[0], marker.position[1])
            
            // Only render if within bounds
            if (pos.x < 0 || pos.x > 100 || pos.y < 0 || pos.y > 100) return null
            
            return (
              <div
                key={index}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-auto cursor-pointer group"
                style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                onClick={() => setSelectedMarker(selectedMarker === index ? null : index)}
              >
                <MapPin 
                  className={cn(
                    getMarkerSize(marker.size),
                    "drop-shadow-md transition-transform hover:scale-125"
                  )}
                  style={{ color: marker.color || DEFAULT_MARKER }}
                  fill={marker.color || DEFAULT_MARKER}
                />
                
                {/* Tooltip on hover/click */}
                {selectedMarker === index && (
                  <div 
                    className="absolute left-1/2 top-full z-layer-floating mt-2 -translate-x-1/2 min-w-[150px] max-w-[250px] rounded-lg border bg-popover p-2 text-xs text-popover-foreground shadow-lg"
                    dangerouslySetInnerHTML={{ __html: marker.label }}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>
      
      {children}
    </div>
  )
}

// Legacy exports for compatibility
export function MapMarker({ children }: { children?: React.ReactNode }) {
  return <>{children}</>
}

export function MarkerContent({ children }: { children: React.ReactNode }) {
  return <div className="relative cursor-pointer">{children}</div>
}

export function MarkerLabel({ children }: { children: React.ReactNode }) {
  return <span>{children}</span>
}

export function MarkerPopup({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>
}

export function MapControls() {
  return null
}

export function useMap() {
  return null
}
