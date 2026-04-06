"use client"

import { useEffect, useState } from "react"
import { Map, MapMarker, MarkerContent, MarkerLabel, MarkerPopup } from "@/components/ui/map"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, MapPin } from "lucide-react"

type MapData = {
  center: {
    name: string
    address: string
    lat: number
    lng: number
  }
  registrations: Array<{
    id: number
    lastName: string
    address: string
    lat: number
    lng: number
  }>
}

export default function Map2026Page() {
  const [mapData, setMapData] = useState<MapData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadMapData()

    // Refresh map data every 30 seconds
    const interval = setInterval(() => {
      loadMapData()
    }, 30000)

    // Clean up interval on unmount
    return () => clearInterval(interval)
  }, [])

  const loadMapData = async () => {
    try {
      if (!mapData) {
        setLoading(true)
      }
      const response = await fetch("/api/map-data")

      if (!response.ok) {
        throw new Error("Failed to load map data")
      }

      const data = await response.json()
      console.log("[v0] Map data loaded:", data)
      setMapData(data)
      setError(null) // Clear any previous errors on successful load
    } catch (err) {
      console.error("[v0] Failed to load map data:", err)
      setError("Failed to load registration map data")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">Loading registration map...</p>
        </div>
      </div>
    )
  }

  if (error || !mapData) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Error Loading Map</CardTitle>
            <CardDescription>{error || "Failed to load map data"}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto space-y-6 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Rendezvous 2026 Registration Map</h1>
          <p className="text-muted-foreground">
            See where {mapData.registrations.length} families are traveling from to attend Rendezvous 2026
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-red-600" />
            <span className="text-sm">Lake Williamson</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-blue-600" />
            <span className="text-sm">Registered Families ({mapData.registrations.length})</span>
          </div>
        </div>
      </div>

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="h-[calc(100vh-250px)] min-h-[600px]">
            <Map center={[mapData.center.lng, mapData.center.lat]} zoom={5}>
              {/* Center marker - Lake Williamson Christian Center */}
              <MapMarker longitude={mapData.center.lng} latitude={mapData.center.lat}>
                <MarkerContent>
                  <div className="size-6 rounded-full bg-red-600 border-3 border-white shadow-lg cursor-pointer hover:scale-110 transition-transform" />
                  <MarkerLabel position="top">{mapData.center.name}</MarkerLabel>
                </MarkerContent>
                <MarkerPopup className="p-3">
                  <h3 className="font-semibold text-foreground">{mapData.center.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{mapData.center.address}</p>
                </MarkerPopup>
              </MapMarker>

              {/* Family markers */}
              {mapData.registrations.map((registration) => (
                <MapMarker key={registration.id} longitude={registration.lng} latitude={registration.lat}>
                  <MarkerContent>
                    <div className="size-4 rounded-full bg-blue-600 border-2 border-white shadow-md cursor-pointer hover:scale-110 transition-transform" />
                    <MarkerLabel position="top">{registration.lastName}</MarkerLabel>
                  </MarkerContent>
                  <MarkerPopup className="p-3">
                    <h3 className="font-semibold text-foreground">{registration.lastName} Family</h3>
                    <p className="text-sm text-muted-foreground mt-1">{registration.address}</p>
                  </MarkerPopup>
                </MapMarker>
              ))}
            </Map>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
