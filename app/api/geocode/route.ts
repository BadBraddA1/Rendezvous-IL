import { NextResponse } from "next/server"

// Cache geocoded results in memory to avoid repeated API calls
const geocodeCache = new Map<string, { lat: number; lng: number }>()

// Helper to search Nominatim
async function searchNominatim(query: string): Promise<{ lat: number; lng: number } | null> {
  const encodedAddress = encodeURIComponent(query)
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1&countrycodes=us`,
    {
      headers: {
        "User-Agent": "Rendezvous2026Map/1.0",
      },
    }
  )

  if (!response.ok) return null

  const data = await response.json()
  if (data && data[0]) {
    return {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
    }
  }
  return null
}

// Generate fallback search queries from an address
function generateSearchQueries(address: string): string[] {
  const queries: string[] = [address]
  
  // Try cleaning up the address - remove unit/apt numbers
  const cleanedAddress = address
    .replace(/\b(apt|unit|suite|ste|#)\s*\w+/gi, "")
    .replace(/\s+/g, " ")
    .trim()
  if (cleanedAddress !== address) {
    queries.push(cleanedAddress)
  }

  // Try replacing common abbreviations
  const expandedAddress = address
    .replace(/\bRd\b/gi, "Road")
    .replace(/\bDr\b/gi, "Drive")
    .replace(/\bSt\b/gi, "Street")
    .replace(/\bLn\b/gi, "Lane")
    .replace(/\bCt\b/gi, "Court")
    .replace(/\bAve\b/gi, "Avenue")
    .replace(/\bBlvd\b/gi, "Boulevard")
    .replace(/\bHwy\b/gi, "Highway")
    .replace(/\bN\b/gi, "North")
    .replace(/\bS\b/gi, "South")
    .replace(/\bE\b/gi, "East")
    .replace(/\bW\b/gi, "West")
  if (expandedAddress !== address) {
    queries.push(expandedAddress)
  }

  // Parse city, state, zip from address
  const parts = address.split(",").map(p => p.trim())
  if (parts.length >= 2) {
    // Try without street number
    const streetPart = parts[0]
    const streetWords = streetPart.split(" ")
    if (streetWords.length > 2 && /^\d+$/.test(streetWords[0])) {
      // Remove house number, keep street name
      const streetOnly = streetWords.slice(1).join(" ")
      queries.push(`${streetOnly}, ${parts.slice(1).join(", ")}`)
    }
    
    // Try just city and state (last resort)
    const lastPart = parts[parts.length - 1]
    const stateZipMatch = lastPart.match(/([A-Z]{2})\s*(\d{5})?/)
    if (stateZipMatch) {
      const state = stateZipMatch[1]
      const city = parts.length >= 2 ? parts[parts.length - 2] : parts[0]
      queries.push(`${city}, ${state}`)
    }
  }

  // Remove duplicates while preserving order
  return [...new Set(queries)]
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
    // Generate multiple search queries to try
    const queries = generateSearchQueries(address)
    
    for (const query of queries) {
      const result = await searchNominatim(query)
      if (result) {
        // Cache the result under the original address
        geocodeCache.set(address, result)
        return NextResponse.json({ 
          ...result, 
          matchedQuery: query,
          wasExact: query === address 
        })
      }
      // Small delay between attempts to be nice to the API
      await new Promise(resolve => setTimeout(resolve, 200))
    }

    return NextResponse.json({ error: "Address not found" }, { status: 404 })
  } catch (error) {
    console.error("Geocoding error:", error)
    return NextResponse.json({ error: "Geocoding failed" }, { status: 500 })
  }
}
