import { NextResponse } from "next/server"
import { checkAdminAuth } from "@/lib/admin-auth"
import { sql } from "@/lib/db"

export async function GET() {
  const admin = await checkAdminAuth()
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const registrations = await sql`
      SELECT 
        id,
        family_last_name,
        address,
        city,
        state,
        zip
      FROM registrations
      WHERE address IS NOT NULL 
        AND city IS NOT NULL 
        AND state IS NOT NULL
      ORDER BY created_at DESC
    `

    const apiKey = process.env.GOOGLE_MAPS_API_KEY

    if (!apiKey) {
      throw new Error("Google Maps API key not configured")
    }

    const geocodedData = await Promise.all(
      registrations.map(async (reg: any) => {
        try {
          const fullAddress = `${reg.address}, ${reg.city}, ${reg.state} ${reg.zip}`
          const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(fullAddress)}&key=${apiKey}`

          const response = await fetch(geocodeUrl)
          const data = await response.json()

          if (data.results && data.results[0]) {
            const location = data.results[0].geometry.location
            return {
              id: reg.id,
              lastName: reg.family_last_name,
              address: `${reg.city}, ${reg.state}`,
              lat: location.lat,
              lng: location.lng,
            }
          }
          return null
        } catch (error) {
          console.error(`[v0] Failed to geocode address for ${reg.family_last_name}:`, error)
          return null
        }
      }),
    )

    const validData = geocodedData.filter((item) => item !== null)

    return NextResponse.json({
      center: {
        name: "Lake Williamson Christian Center",
        address: "Carlinville, IL",
        lat: 39.2794,
        lng: -89.8815,
      },
      registrations: validData,
      mapsApiKey: apiKey,
    })
  } catch (error) {
    console.error("[v0] Map data fetch error:", error)
    return NextResponse.json({ error: "Failed to fetch map data" }, { status: 500 })
  }
}
