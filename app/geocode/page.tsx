"use client"

import { useState } from "react"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MapPin, Play, CheckCircle, XCircle, Clock, Copy, RefreshCw } from "lucide-react"

type Registration = {
  id: number
  lastName: string
  email: string
  fullAddress: string
  address: string
  lat: number
  lng: number
}

type GeoStatus = "pending" | "running" | "success" | "error"

type GeoResult = {
  status: GeoStatus
  newLat?: number
  newLng?: number
  error?: string
  matchedQuery?: string
  wasExact?: boolean
}

// All registrations - same data as map2026
const ALL_REGISTRATIONS: Registration[] = [
  { id: 20, lastName: "Bradd", email: "stephenrbradd@gmail.com", fullAddress: "8754 Sunset Rd, Clinton, IL 61727", address: "Clinton, IL", lat: 40.1531, lng: -88.9642 },
  { id: 22, lastName: "Bradd", email: "badbradda1@gmail.com", fullAddress: "3820 Treebrook Dr, Imperial, MO 63052", address: "Imperial, MO", lat: 38.4178, lng: -90.4012 },
  { id: 44, lastName: "Bradd", email: "abelbradd@yahoo.com", fullAddress: "1139 Highway 367 N, Judsonia, AR 72081", address: "Judsonia, AR", lat: 35.2717, lng: -91.6382 },
  { id: 39, lastName: "Bryan", email: "patriciambryan@gmail.com", fullAddress: "12829 Torre Pines Ln, Yukon, OK 73099", address: "Yukon, OK", lat: 35.5067, lng: -97.7625 },
  { id: 28, lastName: "Collins", email: "collins4family@yahoo.com", fullAddress: "42 Bogart Drive, Petersburg, WV 26847", address: "Petersburg, WV", lat: 38.9923, lng: -79.1259 },
  { id: 41, lastName: "Cozort", email: "abcozort@gmail.com", fullAddress: "246 Funderburk Ln, Tallassee, AL 36078", address: "Tallassee, AL", lat: 32.5357, lng: -85.8958 },
  { id: 30, lastName: "Cozort", email: "edycozort@gmail.com", fullAddress: "315 Southwick Drive, Southaven, MS 38671", address: "Southaven, MS", lat: 34.9892, lng: -89.9873 },
  { id: 27, lastName: "Cozort", email: "ncozort1491@gmail.com", fullAddress: "31303 E Colburn Rd, Grain Valley, MO 64029", address: "Grain Valley, MO", lat: 39.0142, lng: -94.1988 },
  { id: 35, lastName: "English", email: "family@poekee.com", fullAddress: "406 Cedar Dr, Clinton, IL 61727", address: "Clinton, IL", lat: 40.1509, lng: -88.9601 },
  { id: 42, lastName: "Fahrenwald", email: "kristyfah@gmail.com", fullAddress: "1139 Hwy 367N, Judsonia, AR 72081", address: "Judsonia, AR", lat: 35.2750, lng: -91.6330 },
  { id: 29, lastName: "Ferrell", email: "amandaferrell@gmail.com", fullAddress: "4934 Rowsey Crossing Dr, Hernando, MS 38632", address: "Hernando, MS", lat: 34.8237, lng: -89.9934 },
  { id: 38, lastName: "Floyd", email: "jason_floyd32@yahoo.com", fullAddress: "1138 Shaftsbury Hollow Rd, North Bennington, VT 05257", address: "North Bennington, VT", lat: 42.9284, lng: -73.2454 },
  { id: 48, lastName: "Green", email: "timandamygreen@yahoo.com", fullAddress: "4524 Vermilion Trail, Gilbert, MN 55741", address: "Gilbert, MN", lat: 47.4911, lng: -92.4657 },
  { id: 50, lastName: "Haley", email: "melzsong75@gmail.com", fullAddress: "258 W Main St, Alexandria, OH 43001", address: "Alexandria, OH", lat: 40.0931, lng: -82.6224 },
  { id: 43, lastName: "Hanes", email: "andrew.hanes@gmail.com", fullAddress: "303 N Sycamore St, Maroa, IL 61756", address: "Maroa, IL", lat: 40.0367, lng: -88.9573 },
  { id: 34, lastName: "Manning", email: "rebeccamanning81@yahoo.com", fullAddress: "422 N West St, Somerville, TN 38068", address: "Somerville, TN", lat: 35.2448, lng: -89.3537 },
  { id: 33, lastName: "Meacham", email: "paul3swife@gmail.com", fullAddress: "1544 Prehistoric Hill Dr, Imperial, MO 63052", address: "Imperial, MO", lat: 38.3649, lng: -90.3888 },
  { id: 49, lastName: "Middlebrooks", email: "dee.middlebrooks@yahoo.com", fullAddress: "122 Mattie Ln, Flintstone, GA 30725", address: "Flintstone, GA", lat: 34.9407, lng: -85.3274 },
  { id: 45, lastName: "Morris", email: "morrisfamilyeducation@gmail.com", fullAddress: "431 Union Academy Rd, Livingston, TN 38570", address: "Livingston, TN", lat: 36.3834, lng: -85.3233 },
  { id: 36, lastName: "Nix", email: "ahnix@hotmail.com", fullAddress: "10770 US-36, Bradford, OH 45308", address: "Bradford, OH", lat: 40.1295, lng: -84.4358 },
  { id: 32, lastName: "Parish", email: "leefparish@gmail.com", fullAddress: "211 N 5th St, Marlow, OK 73055", address: "Marlow, OK", lat: 34.6478, lng: -97.9575 },
  { id: 46, lastName: "Pasley", email: "teacherdawn1011@gmail.com", fullAddress: "361 Huckleberry Lane, Mineral Bluff, GA 30559", address: "Mineral Bluff, GA", lat: 34.9326, lng: -84.2774 },
  { id: 26, lastName: "Smith", email: "aprilandderrick@gmail.com", fullAddress: "45 Carrousel Dr, Troy, OH 45373", address: "Troy, OH", lat: 40.0395, lng: -84.2030 },
  { id: 40, lastName: "Steele", email: "molcat88@gmail.com", fullAddress: "203 W Wayne St, Paulding, OH 45879", address: "Paulding, OH", lat: 41.1395, lng: -84.5841 },
  { id: 25, lastName: "Valentin", email: "rachel.valentin37@gmail.com", fullAddress: "3306 Christopher Lane, Johnsburg, IL 60051", address: "Johnsburg, IL", lat: 42.3817, lng: -88.2420 },
  { id: 37, lastName: "Watson", email: "deyrl@mac.com", fullAddress: "1260 N 1600 East Rd, Taylorville, IL 62568", address: "Taylorville, IL", lat: 39.5481, lng: -89.2945 },
  { id: 31, lastName: "Zamfir", email: "daniel.zamfir@live.com", fullAddress: "2060 Ware Rd, Tallassee, AL 36078", address: "Tallassee, AL", lat: 32.5280, lng: -85.9010 },
]

const RATE_LIMIT_DELAY = 1500 // 1.5 seconds between requests to avoid rate limiting

export default function GeocodeAdminPage() {
  const [results, setResults] = useState<Map<number, GeoResult>>(new Map())
  const [isRunningAll, setIsRunningAll] = useState(false)
  const [currentIndex, setCurrentIndex] = useState<number | null>(null)
  const [outputCode, setOutputCode] = useState<string>("")

  const geocodeFamily = async (reg: Registration): Promise<GeoResult> => {
    try {
      const response = await fetch(`/api/geocode?address=${encodeURIComponent(reg.fullAddress)}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        return { status: "error", error: errorData.error || "Failed to geocode" }
      }

      const data = await response.json()
      
      if (data.lat && data.lng) {
        return { 
          status: "success", 
          newLat: data.lat, 
          newLng: data.lng,
          matchedQuery: data.matchedQuery,
          wasExact: data.wasExact
        }
      }
      
      return { status: "error", error: "No coordinates returned" }
    } catch (error) {
      return { status: "error", error: String(error) }
    }
  }

  const runSingleGeocode = async (reg: Registration) => {
    setResults(prev => new Map(prev).set(reg.id, { status: "running" }))
    
    const result = await geocodeFamily(reg)
    
    setResults(prev => new Map(prev).set(reg.id, result))
  }

  const runAllGeocode = async () => {
    setIsRunningAll(true)
    setResults(new Map())
    
    for (let i = 0; i < ALL_REGISTRATIONS.length; i++) {
      const reg = ALL_REGISTRATIONS[i]
      setCurrentIndex(i)
      
      setResults(prev => new Map(prev).set(reg.id, { status: "running" }))
      
      const result = await geocodeFamily(reg)
      
      setResults(prev => new Map(prev).set(reg.id, result))
      
      // Wait before next request to avoid rate limiting (except for last one)
      if (i < ALL_REGISTRATIONS.length - 1) {
        await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY))
      }
    }
    
    setCurrentIndex(null)
    setIsRunningAll(false)
  }

  const generateOutputCode = () => {
    const lines = ALL_REGISTRATIONS.map(reg => {
      const result = results.get(reg.id)
      const lat = result?.newLat ?? reg.lat
      const lng = result?.newLng ?? reg.lng
      
      return `  {
    id: ${reg.id},
    lastName: "${reg.lastName}",
    email: "${reg.email}",
    fullAddress: "${reg.fullAddress}",
    address: "${reg.address}",
    lat: ${lat.toFixed(6)},
    lng: ${lng.toFixed(6)},
  },`
    }).join("\n")

    const code = `const ALL_REGISTRATIONS = [\n${lines}\n]`
    setOutputCode(code)
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(outputCode)
  }

  const getStatusIcon = (status: GeoStatus | undefined) => {
    switch (status) {
      case "running":
        return <RefreshCw className="h-4 w-4 animate-spin text-primary" />
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />
    }
  }

  const successCount = Array.from(results.values()).filter(r => r.status === "success").length
  const errorCount = Array.from(results.values()).filter(r => r.status === "error").length

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />

      <main className="flex-1">
        {/* Header */}
        <section className="bg-secondary py-12">
          <div className="container">
            <div className="flex items-center gap-3 mb-4">
              <MapPin className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold text-secondary-foreground">
                Geocode Family Addresses
              </h1>
            </div>
            <p className="text-secondary-foreground/80 max-w-2xl">
              Fix family pin locations by re-geocoding their addresses. Run individually or all at once with rate limiting (1.5 second delay between requests).
            </p>
          </div>
        </section>

        <section className="container py-8">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Controls */}
            <Card className="lg:col-span-3 bg-gradient-to-br from-card to-muted/30 border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Play className="h-5 w-5 text-primary" />
                  Controls
                </CardTitle>
                <CardDescription>
                  Run geocoding for all families or click individual families below
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-center gap-4">
                  <Button 
                    onClick={runAllGeocode} 
                    disabled={isRunningAll}
                    className="bg-primary hover:bg-primary/90"
                  >
                    {isRunningAll ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Running... ({currentIndex !== null ? currentIndex + 1 : 0}/{ALL_REGISTRATIONS.length})
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        Run All (with 1.5s delay)
                      </>
                    )}
                  </Button>

                  <Button 
                    variant="outline" 
                    onClick={generateOutputCode}
                    disabled={results.size === 0}
                  >
                    Generate Updated Code
                  </Button>

                  <div className="flex gap-2 ml-auto">
                    <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      {successCount} Success
                    </Badge>
                    <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30">
                      <XCircle className="h-3 w-3 mr-1" />
                      {errorCount} Errors
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Families List */}
            <div className="lg:col-span-2">
              <Card className="bg-gradient-to-br from-card to-muted/30 border-border/50">
                <CardHeader>
                  <CardTitle>Families ({ALL_REGISTRATIONS.length})</CardTitle>
                  <CardDescription>Click a family to geocode their address individually</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
                    {ALL_REGISTRATIONS.map((reg, index) => {
                      const result = results.get(reg.id)
                      const isCurrentlyRunning = isRunningAll && currentIndex === index

                      return (
                        <div 
                          key={reg.id}
                          className={`p-4 rounded-lg border transition-colors ${
                            isCurrentlyRunning 
                              ? "border-primary bg-primary/5" 
                              : result?.status === "success"
                              ? "border-green-500/30 bg-green-500/5"
                              : result?.status === "error"
                              ? "border-red-500/30 bg-red-500/5"
                              : "border-border bg-card hover:bg-muted/50"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                {getStatusIcon(result?.status)}
                                <span className="font-medium">{reg.lastName} Family</span>
                                <Badge variant="secondary" className="text-xs">ID: {reg.id}</Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mt-1 truncate">
                                {reg.fullAddress}
                              </p>
                              <div className="flex gap-4 mt-2 text-xs">
                                <span className="text-muted-foreground">
                                  Current: {reg.lat.toFixed(4)}, {reg.lng.toFixed(4)}
                                </span>
                                {result?.newLat && result?.newLng && (
                                  <span className={
                                    result.newLat !== reg.lat || result.newLng !== reg.lng
                                      ? "text-green-600 font-medium"
                                      : "text-muted-foreground"
                                  }>
                                    New: {result.newLat.toFixed(4)}, {result.newLng.toFixed(4)}
                                    {(result.newLat !== reg.lat || result.newLng !== reg.lng) && " (changed)"}
                                  </span>
                                )}
                              </div>
                              {result?.matchedQuery && !result?.wasExact && (
                                <p className="text-xs text-amber-600 mt-1">
                                  Matched via: &quot;{result.matchedQuery}&quot;
                                </p>
                              )}
                              {result?.error && (
                                <p className="text-xs text-red-500 mt-1">{result.error}</p>
                              )}
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => runSingleGeocode(reg)}
                              disabled={isRunningAll || result?.status === "running"}
                            >
                              {result?.status === "running" ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                              ) : (
                                <MapPin className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Output Code */}
            <div className="lg:col-span-1">
              <Card className="bg-gradient-to-br from-card to-muted/30 border-border/50 sticky top-4">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    Output Code
                    {outputCode && (
                      <Button size="sm" variant="ghost" onClick={copyToClipboard}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    )}
                  </CardTitle>
                  <CardDescription>
                    Updated coordinates to copy into map2026/page.tsx
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {outputCode ? (
                    <pre className="text-xs bg-muted p-4 rounded-lg overflow-auto max-h-[500px] whitespace-pre-wrap">
                      {outputCode}
                    </pre>
                  ) : (
                    <div className="text-center text-muted-foreground py-8">
                      <p>Run geocoding then click</p>
                      <p className="font-medium">&quot;Generate Updated Code&quot;</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
