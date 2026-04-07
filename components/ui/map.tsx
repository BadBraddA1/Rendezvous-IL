"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface MapProps extends React.HTMLAttributes<HTMLDivElement> {
  center?: [number, number]
  zoom?: number
}

export function Map({ center = [-89.8815, 39.2794], zoom = 5, className, children, ...props }: MapProps) {
  const [selectedMarker, setSelectedMarker] = React.useState<string | null>(null)

  return (
    <MapContext.Provider value={{ selectedMarker, setSelectedMarker }}>
      <div className={cn("relative size-full overflow-hidden", className)} {...props}>
        {/* OpenStreetMap iframe as base layer */}
        <iframe
          src={`https://www.openstreetmap.org/export/embed.html?bbox=${center[0] - 15}%2C${center[1] - 10}%2C${center[0] + 15}%2C${center[1] + 10}&layer=mapnik`}
          className="absolute inset-0 h-full w-full border-0"
          style={{ filter: "saturate(0.9)" }}
        />
        {/* Overlay for markers */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="relative h-full w-full pointer-events-auto">
            {children}
          </div>
        </div>
      </div>
    </MapContext.Provider>
  )
}

const MapContext = React.createContext<{
  selectedMarker: string | null
  setSelectedMarker: (id: string | null) => void
}>({
  selectedMarker: null,
  setSelectedMarker: () => {},
})

interface MapMarkerProps {
  longitude: number
  latitude: number
  children?: React.ReactNode
  id?: string
}

export function MapMarker({ longitude, latitude, children, id }: MapMarkerProps) {
  // Simple projection for US-centric map (approximate)
  // This converts lat/lng to percentage positions on the map
  const centerLng = -89.8815
  const centerLat = 39.2794
  const lngRange = 30 // degrees of longitude shown
  const latRange = 20 // degrees of latitude shown

  const x = ((longitude - (centerLng - lngRange / 2)) / lngRange) * 100
  const y = (((centerLat + latRange / 2) - latitude) / latRange) * 100

  // Only render if within bounds
  if (x < 0 || x > 100 || y < 0 || y > 100) return null

  return (
    <div
      className="absolute transform -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${x}%`, top: `${y}%` }}
    >
      {children}
    </div>
  )
}

interface MarkerContentProps {
  children: React.ReactNode
}

export function MarkerContent({ children }: MarkerContentProps) {
  return <div className="relative cursor-pointer">{children}</div>
}

interface MarkerLabelProps {
  children: React.ReactNode
  position?: "top" | "bottom" | "left" | "right"
}

export function MarkerLabel({ children, position = "top" }: MarkerLabelProps) {
  const positionClasses = {
    top: "-top-8 left-1/2 -translate-x-1/2",
    bottom: "top-8 left-1/2 -translate-x-1/2",
    left: "top-1/2 -translate-y-1/2 right-8",
    right: "top-1/2 -translate-y-1/2 left-8",
  }

  return (
    <div
      className={cn(
        "absolute whitespace-nowrap rounded-md bg-popover px-2 py-1 text-xs font-medium text-popover-foreground shadow-md hidden group-hover:block",
        positionClasses[position],
      )}
    >
      {children}
    </div>
  )
}

interface MarkerPopupProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export function MarkerPopup({ children, className, ...props }: MarkerPopupProps) {
  const [isOpen, setIsOpen] = React.useState(false)

  return (
    <div className="group" onClick={() => setIsOpen(!isOpen)}>
      {isOpen && (
        <div
          className={cn(
            "absolute left-1/2 top-full z-50 mt-2 min-w-[200px] -translate-x-1/2 rounded-lg border bg-popover text-popover-foreground shadow-lg",
            className,
          )}
          {...props}
        >
          {children}
        </div>
      )}
    </div>
  )
}

export function MapControls() {
  return null
}

export function useMap() {
  return null
}
