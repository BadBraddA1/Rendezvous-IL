"use client"

import { useEffect, useState } from "react"
import { Map } from "@/components/ui/map"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, MapPin } from "lucide-react"
import Script from "next/script"

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
  mapsApiKey: string
}

export default function AdminMapPage() {
  const [mapData, setMapData] = useState<MapData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mapsLoaded, setMapsLoaded] = useState(false)

  useEffect(() => {
    loadMapData()
  }, [])

  const loadMapData = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/admin/registrations/map-data")

      if (!response.ok) {
        throw new Error("Failed to load map data")
      }

      const data = await response.json()
      setMapData(data)
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

  const markers = [
    {
      position: [mapData.center.lat, mapData.center.lng] as [number, number],
      label: `<strong>${mapData.center.name}</strong><br/>${mapData.center.address}`,
      size: "lg" as const,
      color: "#DC2626",
    },
    ...mapData.registrations.map((reg) => ({
      position: [reg.lat, reg.lng] as [number, number],
      label: `<strong>${reg.lastName} Family</strong><br/>${reg.address}`,
      size: "md" as const,
      color: "#3B82F6",
    })),
  ]

  return (
    <>
      <Script
        src={`https://maps.googleapis.com/maps/api/js?key=${mapData.mapsApiKey}`}
        onLoad={() => setMapsLoaded(true)}
        strategy="afterInteractive"
      />

      <div className="container mx-auto space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Registration Map</h1>
            <p className="text-muted-foreground">
              Showing {mapData.registrations.length} registered families across the United States
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-red-600" />
              <span className="text-sm">Lake Williamson</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-blue-600" />
              <span className="text-sm">Registered Families</span>
            </div>
          </div>
        </div>

        <Card className="overflow-hidden">
          <CardContent className="p-0">
            {!mapsLoaded ? (
              <div className="flex h-[calc(100vh-250px)] min-h-[600px] items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  <p className="text-muted-foreground">Loading map...</p>
                </div>
              </div>
            ) : (
              <div className="h-[calc(100vh-250px)] min-h-[600px]">
                <Map center={[mapData.center.lat, mapData.center.lng]} zoom={5} markers={markers} />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
