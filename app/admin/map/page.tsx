"use client"

import { useEffect, useState } from "react"
import { Map } from "@/components/ui/map"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, MapPin } from "lucide-react"
import Script from "next/script"
import { MainContent } from "@/components/main-content"
import { EMAIL_BRAND } from "@/lib/email-templates"
import { AdminRetryButton } from "@/components/admin/admin-panel-states"

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
      <MainContent className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">Loading registration map...</p>
        </div>
      </MainContent>
    )
  }

  if (error || !mapData) {
    return (
      <MainContent className="flex min-h-screen items-center justify-center p-6">
        <Card className="w-full max-w-md callout-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Registration map unavailable</CardTitle>
            <CardDescription>
              {error || "We couldn't load family locations. Check your connection and try again."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AdminRetryButton onRetry={loadMapData} label="Reload map" />
          </CardContent>
        </Card>
      </MainContent>
    )
  }

  const markers = [
    {
      position: [mapData.center.lat, mapData.center.lng] as [number, number],
      label: `<strong>${mapData.center.name}</strong><br/>${mapData.center.address}`,
      size: "lg" as const,
      color: EMAIL_BRAND.coral,
    },
    ...mapData.registrations.map((reg) => ({
      position: [reg.lat, reg.lng] as [number, number],
      label: `<strong>${reg.lastName} Family</strong><br/>${reg.address}`,
      size: "md" as const,
      color: EMAIL_BRAND.primary,
    })),
  ]

  return (
    <>
      <Script
        src={`https://maps.googleapis.com/maps/api/js?key=${mapData.mapsApiKey}`}
        onLoad={() => setMapsLoaded(true)}
        strategy="afterInteractive"
      />

      <main id="main-content" className="admin-main">
        <div className="admin-container">
          <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="admin-page-header">
              <h1 className="text-section-title text-balance">Registration Map</h1>
              <p className="text-lead text-muted-foreground">
                Showing {mapData.registrations.length} registered families across the United States
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-destructive" />
                <span className="text-sm">Lake Williamson</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-info" />
                <span className="text-sm">Registered Families</span>
              </div>
            </div>
          </header>

        <Card className="overflow-hidden">
          <CardContent className="p-0">
            {!mapsLoaded ? (
              <div className="flex h-[calc(100dvh-250px)] min-h-[min(600px,80dvh)] items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  <p className="text-muted-foreground">Loading map...</p>
                </div>
              </div>
            ) : (
              <div className="h-[calc(100dvh-250px)] min-h-[min(600px,80dvh)]">
                <Map center={[mapData.center.lat, mapData.center.lng]} zoom={5} markers={markers} />
              </div>
            )}
          </CardContent>
        </Card>
        </div>
      </main>
    </>
  )
}
