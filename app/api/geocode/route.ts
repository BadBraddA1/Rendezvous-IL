import { NextResponse } from "next/server"

// Cache geocoded results in memory to avoid repeated API calls
const geocodeCache = new Map<string, { lat: number; lng: number }>()

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
    // Use Nominatim (OpenStreetMap) for geocoding - it's free
    const encodedAddress = encodeURIComponent(address)
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1`,
      {
        headers: {
          "User-Agent": "Rendezvous2026Map/1.0",
        },
      }
    )

    if (!response.ok) {
      throw new Error("Geocoding failed")
    }

    const data = await response.json()

    if (data && data[0]) {
      const result = {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
      }
      // Cache the result
      geocodeCache.set(address, result)
      return NextResponse.json(result)
    }

    return NextResponse.json({ error: "Address not found" }, { status: 404 })
  } catch (error) {
    console.error("Geocoding error:", error)
    return NextResponse.json({ error: "Geocoding failed" }, { status: 500 })
  }
}
