"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
import dynamic from "next/dynamic"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Loader2, MapPin, Search, Mail, Phone, Church, Home, User, X } from "lucide-react"
import { Button } from "@/components/ui/button"

// Dynamically import the Leaflet map to avoid SSR issues
const LeafletMap = dynamic(
  () => import("@/components/ui/leaflet-map").then((mod) => mod.LeafletMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full flex items-center justify-center bg-muted">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    ),
  }
)

type Registration = {
  id: number
  lastName: string
  fatherName: string
  email: string
  husbandPhone: string
  wifePhone: string
  homeCongregation: string
  fullAddress: string
  address: string
  lat: number
  lng: number
  checkinQrCode: string
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
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedRegistration, setSelectedRegistration] = useState<Registration | null>(null)

  useEffect(() => {
    loadMapData()

    // Refresh map data every 30 seconds
    const interval = setInterval(() => {
      loadMapData()
    }, 30000)

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
      setMapData(data)
      setError(null)
    } catch (err) {
      console.error("Failed to load map data:", err)
      setError("Failed to load registration map data")
    } finally {
      setLoading(false)
    }
  }

  // Filter registrations based on search query
  const filteredRegistrations = useMemo(() => {
    if (!mapData) return []
    if (!searchQuery.trim()) return mapData.registrations

    const query = searchQuery.toLowerCase()
    return mapData.registrations.filter((reg) => {
      return (
        reg.lastName?.toLowerCase().includes(query) ||
        reg.fatherName?.toLowerCase().includes(query) ||
        reg.email?.toLowerCase().includes(query) ||
        reg.husbandPhone?.includes(query) ||
        reg.wifePhone?.includes(query) ||
        reg.homeCongregation?.toLowerCase().includes(query) ||
        reg.address?.toLowerCase().includes(query) ||
        reg.fullAddress?.toLowerCase().includes(query)
      )
    })
  }, [mapData, searchQuery])

  const handleSelectRegistration = useCallback((reg: Registration) => {
    setSelectedRegistration(reg)
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">Loading registration map...</p>
        </div>
      </div>
    )
  }

  if (error || !mapData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
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
    <div className="min-h-screen bg-background">
      <div className="container mx-auto space-y-6 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Rendezvous 2026 Registration Map</h1>
            <p className="text-muted-foreground">
              See where {mapData.registrations.length} families are traveling from to attend Rendezvous 2026
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-red-600" />
              <span className="text-sm text-foreground">Lake Williamson</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-foreground">Registered Families ({mapData.registrations.length})</span>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, phone, congregation, or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 p-0"
                onClick={() => setSearchQuery("")}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          {searchQuery && (
            <Badge variant="secondary" className="whitespace-nowrap">
              Showing {filteredRegistrations.length} of {mapData.registrations.length} families
            </Badge>
          )}
        </div>

        <div className="flex flex-col gap-6 lg:flex-row">
          {/* Map */}
          <Card className="flex-1 overflow-hidden">
            <CardContent className="p-0">
              <div className="h-[calc(100vh-350px)] min-h-[500px]">
                <LeafletMap
                  center={mapData.center}
                  registrations={filteredRegistrations}
                  selectedId={selectedRegistration?.id ?? null}
                  onSelectRegistration={handleSelectRegistration}
                />
              </div>
            </CardContent>
          </Card>

          {/* Registration List & Details Panel */}
          <div className="w-full lg:w-96 flex flex-col gap-4">
            {/* Selected Registration Details */}
            {selectedRegistration && (
              <Card className="border-green-500 border-2">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <User className="h-5 w-5" />
                      {selectedRegistration.lastName} Family
                    </CardTitle>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedRegistration(null)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  {selectedRegistration.fatherName && (
                    <CardDescription>Father: {selectedRegistration.fatherName}</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-3">
                  {selectedRegistration.email && (
                    <div className="flex items-start gap-3">
                      <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground">Email</p>
                        <a
                          href={`mailto:${selectedRegistration.email}`}
                          className="text-sm text-blue-600 hover:underline"
                        >
                          {selectedRegistration.email}
                        </a>
                      </div>
                    </div>
                  )}
                  {(selectedRegistration.husbandPhone || selectedRegistration.wifePhone) && (
                    <div className="flex items-start gap-3">
                      <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground">Phone</p>
                        {selectedRegistration.husbandPhone && (
                          <a
                            href={`tel:${selectedRegistration.husbandPhone}`}
                            className="text-sm text-blue-600 hover:underline block"
                          >
                            Husband: {selectedRegistration.husbandPhone}
                          </a>
                        )}
                        {selectedRegistration.wifePhone && (
                          <a
                            href={`tel:${selectedRegistration.wifePhone}`}
                            className="text-sm text-blue-600 hover:underline block"
                          >
                            Wife: {selectedRegistration.wifePhone}
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                  {selectedRegistration.homeCongregation && (
                    <div className="flex items-start gap-3">
                      <Church className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground">Home Congregation</p>
                        <p className="text-sm">{selectedRegistration.homeCongregation}</p>
                      </div>
                    </div>
                  )}
                  {selectedRegistration.fullAddress && (
                    <div className="flex items-start gap-3">
                      <Home className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground">Address</p>
                        <p className="text-sm">{selectedRegistration.fullAddress}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Registration List */}
            <Card className="flex-1">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Attendees</CardTitle>
                <CardDescription>Click on a family to view their details</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-[400px] overflow-y-auto">
                  {filteredRegistrations.length === 0 ? (
                    <div className="p-6 text-center text-muted-foreground">No families match your search</div>
                  ) : (
                    <div className="divide-y">
                      {filteredRegistrations.map((reg) => (
                        <button
                          key={reg.id}
                          className={`w-full px-4 py-3 text-left hover:bg-muted/50 transition-colors ${
                            selectedRegistration?.id === reg.id ? "bg-muted" : ""
                          }`}
                          onClick={() => setSelectedRegistration(reg)}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-foreground">{reg.lastName} Family</p>
                              <p className="text-xs text-muted-foreground">{reg.address}</p>
                            </div>
                            <MapPin className="h-4 w-4 text-blue-600" />
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
