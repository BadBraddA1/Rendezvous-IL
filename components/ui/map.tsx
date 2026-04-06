"use client"

import * as React from "react"
import maplibregl from "maplibre-gl"
import "maplibre-gl/dist/maplibre-gl.css"
import { cn } from "@/lib/utils"

const MapContext = React.createContext<maplibregl.Map | null>(null)

export function useMap() {
  const context = React.useContext(MapContext)
  if (!context) {
    throw new Error("useMap must be used within a Map component")
  }
  return context
}

interface MapProps extends React.HTMLAttributes<HTMLDivElement> {
  center?: [number, number]
  zoom?: number
  minZoom?: number
  maxZoom?: number
}

export function Map({ center = [0, 0], zoom = 9, minZoom = 0, maxZoom = 22, className, children, ...props }: MapProps) {
  const mapContainer = React.useRef<HTMLDivElement>(null)
  const map = React.useRef<maplibregl.Map | null>(null)
  const [mapInstance, setMapInstance] = React.useState<maplibregl.Map | null>(null)

  React.useEffect(() => {
    if (map.current || !mapContainer.current) return

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          carto: {
            type: "raster",
            tiles: [
              "https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
              "https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
              "https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
            ],
            tileSize: 256,
          },
        },
        layers: [
          {
            id: "carto-layer",
            type: "raster",
            source: "carto",
          },
        ],
      },
      center: center as [number, number],
      zoom,
      minZoom,
      maxZoom,
    })

    setMapInstance(map.current)

    return () => {
      map.current?.remove()
      map.current = null
    }
  }, [])

  return (
    <MapContext.Provider value={mapInstance}>
      <div ref={mapContainer} className={cn("relative size-full", className)} {...props}>
        {mapInstance && children}
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
  const map = useMap()
  const markerRef = React.useRef<maplibregl.Marker | null>(null)
  const elementRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!map || !elementRef.current) return

    markerRef.current = new maplibregl.Marker({
      element: elementRef.current,
    })
      .setLngLat([longitude, latitude])
      .addTo(map)

    return () => {
      markerRef.current?.remove()
    }
  }, [map, longitude, latitude])

  return <div ref={elementRef}>{children}</div>
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
    top: "-top-8 left-1/2 -translate-x-1/2",
    bottom: "top-8 left-1/2 -translate-x-1/2",
    left: "top-1/2 -translate-y-1/2 right-8",
    right: "top-1/2 -translate-y-1/2 left-8",
  }

  return (
    <div
      className={cn(
        "absolute whitespace-nowrap rounded-md bg-popover px-2 py-1 text-xs font-medium text-popover-foreground shadow-md",
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
        "absolute left-1/2 top-full z-50 mt-2 w-64 -translate-x-1/2 rounded-lg border bg-popover text-popover-foreground shadow-lg",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function MapControls() {
  const map = useMap()

  React.useEffect(() => {
    if (!map) return

    map.addControl(new maplibregl.NavigationControl(), "top-right")
    map.addControl(
      new maplibregl.GeolocateControl({
        positionOptions: {
          enableHighAccuracy: true,
        },
        trackUserLocation: true,
      }),
      "top-right",
    )
  }, [map])

  return null
}
