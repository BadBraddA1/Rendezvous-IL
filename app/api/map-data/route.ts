import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET() {
  try {
    console.log("[v0] Fetching registrations for map...")

    const registrations = await sql`
      SELECT 
        id,
        family_last_name,
        father_signature,
        email,
        husband_phone,
        wife_phone,
        address,
        city,
        state,
        zip,
        home_congregation,
        checkin_qr_code
      FROM registrations
      WHERE address IS NOT NULL 
        AND city IS NOT NULL 
        AND state IS NOT NULL
      ORDER BY created_at DESC
    `

    console.log(`[v0] Found ${registrations.length} registrations with addresses`)

    const geocodedData = await Promise.all(
      registrations.map(async (reg: any) => {
        try {
          const fullAddress = `${reg.address}, ${reg.city}, ${reg.state} ${reg.zip}, USA`
          console.log(`[v0] Geocoding: ${fullAddress}`)

          // Use Nominatim (OpenStreetMap) free geocoding service
          const geocodeUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fullAddress)}&limit=1`

          const response = await fetch(geocodeUrl, {
            headers: {
              "User-Agent": "Rendezvous2026-Map/1.0",
            },
          })
          const data = await response.json()

          if (data && data[0]) {
            console.log(`[v0] Successfully geocoded ${reg.family_last_name}`)
            return {
              id: reg.id,
              lastName: reg.family_last_name,
              fatherName: reg.father_signature,
              email: reg.email,
              husbandPhone: reg.husband_phone,
              wifePhone: reg.wife_phone,
              homeCongregation: reg.home_congregation,
              fullAddress: `${reg.address}, ${reg.city}, ${reg.state} ${reg.zip}`,
              address: `${reg.city}, ${reg.state}`,
              lat: Number.parseFloat(data[0].lat),
              lng: Number.parseFloat(data[0].lon),
              checkinQrCode: reg.checkin_qr_code,
            }
          }
          console.log(`[v0] No geocoding result for ${reg.family_last_name}`)
          return null
        } catch (error) {
          console.error(`[v0] Failed to geocode address for ${reg.family_last_name}:`, error)
          return null
        }
      }),
    )

    const validData = geocodedData.filter((item) => item !== null)
    console.log(`[v0] Successfully geocoded ${validData.length} registrations`)

    return NextResponse.json({
      center: {
        name: "Lake Williamson Christian Center",
        address: "Carlinville, IL",
        lat: 39.2794,
        lng: -89.8815,
      },
      registrations: validData,
    })
  } catch (error) {
    console.error("[v0] Map data fetch error:", error)
    return NextResponse.json({ error: "Failed to fetch map data" }, { status: 500 })
  }
}
