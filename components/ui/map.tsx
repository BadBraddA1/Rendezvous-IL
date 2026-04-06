"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

// US map bounds for coordinate projection
const US_BOUNDS = {
  minLng: -125,
  maxLng: -66,
  minLat: 24,
  maxLat: 50,
}

function lngToPercent(lng: number) {
  return ((lng - US_BOUNDS.minLng) / (US_BOUNDS.maxLng - US_BOUNDS.minLng)) * 100
}

function latToPercent(lat: number) {
  return ((US_BOUNDS.maxLat - lat) / (US_BOUNDS.maxLat - US_BOUNDS.minLat)) * 100
}

type MapContextType = {
  center: [number, number]
  zoom: number
}

const MapContext = React.createContext<MapContextType>({ center: [0, 0], zoom: 5 })

export function useMap() {
  return React.useContext(MapContext)
}

interface MapProps extends React.HTMLAttributes<HTMLDivElement> {
  center?: [number, number]
  zoom?: number
  minZoom?: number
  maxZoom?: number
}

export function Map({ center = [0, 0], zoom = 5, className, children, ...props }: MapProps) {
  return (
    <MapContext.Provider value={{ center, zoom }}>
      <div
        className={cn("relative size-full overflow-hidden rounded-lg bg-[#dbeafe]", className)}
        {...props}
      >
        {/* US SVG map background */}
        <svg
          viewBox="0 0 1000 600"
          className="absolute inset-0 size-full opacity-20"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Simple US outline - approximate shapes for continental states */}
          <rect x="50" y="50" width="900" height="500" rx="8" fill="#93c5fd" stroke="#3b82f6" strokeWidth="1" />
          {/* State grid lines for visual reference */}
          {[...Array(9)].map((_, i) => (
            <line key={`v${i}`} x1={50 + i * 100} y1="50" x2={50 + i * 100} y2="550" stroke="#3b82f6" strokeWidth="0.5" opacity="0.4" />
          ))}
          {[...Array(5)].map((_, i) => (
            <line key={`h${i}`} x1="50" y1={50 + i * 100} x2="950" y2={50 + i * 100} stroke="#3b82f6" strokeWidth="0.5" opacity="0.4" />
          ))}
        </svg>

        {/* CARTO tile map using img tiles */}
        <div className="absolute inset-0">
          <img
            src="https://a.basemaps.cartocdn.com/light_all/4/4/6.png"
            className="hidden"
            alt=""
            crossOrigin="anonymous"
          />
        </div>

        {/* OpenStreetMap embed via iframe */}
        <iframe
          src={`https://www.openstreetmap.org/export/embed.html?bbox=${center[0] - 20}%2C${center[1] - 12}%2C${center[0] + 20}%2C${center[1] + 12}&layer=mapnik`}
          className="absolute inset-0 size-full border-0"
          title="Registration Map"
          loading="lazy"
        />

        {/* Markers rendered on top */}
        <div className="absolute inset-0 pointer-events-none">
          {children}
        </div>
      </div>
    </MapContext.Provider>
  )
}

interface MapMarkerProps {
  longitude: number
  latitude: number
  children?: React.ReactNode
}

export function MapMarker({ longitude, latitude, children }: MapMarkerProps) {
  const [showPopup, setShowPopup] = React.useState(false)

  const left = `${lngToPercent(longitude)}%`
  const top = `${latToPercent(latitude)}%`

  return (
    <div
      className="absolute pointer-events-auto"
      style={{ left, top, transform: "translate(-50%, -50%)" }}
      onMouseEnter={() => setShowPopup(true)}
      onMouseLeave={() => setShowPopup(false)}
      onClick={() => setShowPopup((p) => !p)}
    >
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          if (child.type === MarkerPopup) {
            return showPopup ? child : null
          }
          return child
        }
        return child
      })}
    </div>
  )
}

interface MarkerContentProps {
  children: React.ReactNode
}

export function MarkerContent({ children }: MarkerContentProps) {
  return <div className="relative">{children}</div>
}

interface MarkerLabelProps {
  children: React.ReactNode
  position?: "top" | "bottom" | "left" | "right"
}

export function MarkerLabel({ children, position = "top" }: MarkerLabelProps) {
  const positionClasses = {
    top: "-top-7 left-1/2 -translate-x-1/2",
    bottom: "top-5 left-1/2 -translate-x-1/2",
    left: "top-1/2 -translate-y-1/2 right-6",
    right: "top-1/2 -translate-y-1/2 left-6",
  }

  return (
    <div
      className={cn(
        "absolute whitespace-nowrap rounded bg-white/90 px-1.5 py-0.5 text-[10px] font-semibold text-gray-800 shadow",
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
  return (
    <div
      className={cn(
        "absolute left-1/2 top-full z-50 mt-2 w-64 -translate-x-1/2 rounded-lg border bg-white text-gray-900 shadow-xl",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function MapControls() {
  return null
}
