import { NextResponse } from "next/server"

// Cache geocoded results in memory to avoid repeated API calls
const geocodeCache = new Map<string, { lat: number; lng: number }>()

const GEOCODIO_API_KEY = process.env.Geocodio

// Search using Geocodio API
async function searchGeocodio(address: string): Promise<{ lat: number; lng: number; accuracy: number; accuracy_type: string } | null> {
  if (!GEOCODIO_API_KEY) {
    console.error("Geocodio API key not configured")
    return null
  }

  const encodedAddress = encodeURIComponent(address)
  const response = await fetch(
    `https://api.geocod.io/v1.7/geocode?q=${encodedAddress}&api_key=${GEOCODIO_API_KEY}`,
    {
      headers: {
        "Content-Type": "application/json",
      },
    }
  )

  if (!response.ok) {
    console.error("Geocodio API error:", response.status, await response.text())
    return null
  }

  const data = await response.json()
  
  if (data.results && data.results.length > 0) {
    const result = data.results[0]
    return {
      lat: result.location.lat,
      lng: result.location.lng,
      accuracy: result.accuracy,
      accuracy_type: result.accuracy_type,
    }
  }
  
  return null
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const address = searchParams.get("address")

  if (!address) {
    return NextResponse.json({ error: "Address is required" }, { status: 400 })
  }

  // Check cache first
  if (geocodeCache.has(address)) {
    return NextResponse.json(geocodeCache.get(address))
  }

  try {
    const result = await searchGeocodio(address)
    
    if (result) {
      // Cache the result
      geocodeCache.set(address, { lat: result.lat, lng: result.lng })
      return NextResponse.json({ 
        lat: result.lat,
        lng: result.lng,
        accuracy: result.accuracy,
        accuracyType: result.accuracy_type,
        wasExact: result.accuracy_type === "rooftop" || result.accuracy_type === "point",
      })
    }

    return NextResponse.json({ error: "Address not found" }, { status: 404 })
  } catch (error) {
    console.error("Geocoding error:", error)
    return NextResponse.json({ error: "Geocoding failed" }, { status: 500 })
  }
}
