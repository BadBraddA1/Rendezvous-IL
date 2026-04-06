"use client"

import { useEffect, useState } from "react"
import { Map, MapMarker, MarkerContent, MarkerLabel, MarkerPopup } from "@/components/ui/map"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, MapPin, Mail, Home, Users } from "lucide-react"

type FamilyMember = {
  firstName: string
  lastName: string
}

type Registration = {
  id: number
  lastName: string
  contactName: string
  email: string
  address: string
  cityState: string
  familyMembers: FamilyMember[]
  lat: number
  lng: number
}

type MapData = {
  center: {
    name: string
    address: string
    lat: number
    lng: number
  }
  registrations: Registration[]
}

export default function Map2026Page() {
  const [mapData, setMapData] = useState<MapData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadMapData()
    const interval = setInterval(loadMapData, 30000)
    return () => clearInterval(interval)
  }, [])

  const loadMapData = async () => {
    try {
      if (!mapData) setLoading(true)
      const response = await fetch("/api/map-data")
      if (!response.ok) throw new Error("Failed to load map data")
      const data = await response.json()
      setMapData(data)
      setError(null)
    } catch (err) {
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
            {mapData.registrations.length} families registered from across the country
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-red-600" />
            <span className="text-sm font-medium">Lake Williamson</span>
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
              {/* Lake Williamson center marker */}
              <MapMarker longitude={mapData.center.lng} latitude={mapData.center.lat}>
                <MarkerContent>
                  <div className="size-6 rounded-full bg-red-600 border-[3px] border-white shadow-lg cursor-pointer hover:scale-110 transition-transform" />
                  <MarkerLabel position="top">{mapData.center.name}</MarkerLabel>
                </MarkerContent>
                <MarkerPopup className="p-3 min-w-[200px]">
                  <h3 className="font-semibold text-foreground">{mapData.center.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{mapData.center.address}</p>
                </MarkerPopup>
              </MapMarker>

              {/* Family markers */}
              {mapData.registrations.map((reg) => (
                <MapMarker key={reg.id} longitude={reg.lng} latitude={reg.lat}>
                  <MarkerContent>
                    <div className="size-4 rounded-full bg-blue-600 border-2 border-white shadow-md cursor-pointer hover:scale-110 transition-transform" />
                    <MarkerLabel position="top">{reg.lastName}</MarkerLabel>
                  </MarkerContent>
                  <MarkerPopup className="p-0 min-w-[240px]">
                    <div className="p-3 space-y-2">
                      {/* Header */}
                      <div className="border-b pb-2">
                        <h3 className="font-bold text-base text-foreground">{reg.lastName} Family</h3>
                        <p className="text-sm text-muted-foreground">{reg.contactName}</p>
                      </div>

                      {/* Address */}
                      <div className="flex gap-2 items-start">
                        <Home className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                        <p className="text-sm text-foreground">{reg.address}</p>
                      </div>

                      {/* Email */}
                      <div className="flex gap-2 items-center">
                        <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                        <a
                          href={`mailto:${reg.email}`}
                          className="text-sm text-blue-600 hover:underline truncate"
                        >
                          {reg.email}
                        </a>
                      </div>

                      {/* Family members */}
                      {reg.familyMembers.length > 0 && (
                        <div className="flex gap-2 items-start">
                          <Users className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                          <div className="text-sm text-foreground">
                            {reg.familyMembers.map((m, i) => (
                              <span key={i}>
                                {m.firstName} {m.lastName}
                                {i < reg.familyMembers.length - 1 ? ", " : ""}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
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
