import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET() {
  try {
    const registrations = await sql`
      SELECT 
        r.id,
        r.family_last_name,
        r.father_signature,
        r.mother_signature,
        r.email,
        r.address,
        r.city,
        r.state,
        r.zip,
        COALESCE(
          json_agg(
            json_build_object('firstName', fm.first_name, 'lastName', fm.last_name)
            ORDER BY fm.id
          ) FILTER (WHERE fm.id IS NOT NULL),
          '[]'
        ) AS family_members
      FROM registrations r
      LEFT JOIN family_members fm ON fm.registration_id = r.id
      WHERE r.address IS NOT NULL 
        AND r.city IS NOT NULL 
        AND r.state IS NOT NULL
      GROUP BY r.id, r.family_last_name, r.father_signature, r.mother_signature, r.email, r.address, r.city, r.state, r.zip
      ORDER BY r.created_at DESC
    `

    const geocodedData = await Promise.all(
      registrations.map(async (reg: any) => {
        try {
          const fullAddress = `${reg.address}, ${reg.city}, ${reg.state} ${reg.zip}, USA`
          const geocodeUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fullAddress)}&limit=1`

          const response = await fetch(geocodeUrl, {
            headers: { "User-Agent": "Rendezvous2026-Map/1.0" },
          })
          const data = await response.json()

          if (data && data[0]) {
            return {
              id: reg.id,
              lastName: reg.family_last_name,
              contactName: reg.father_signature || reg.mother_signature || reg.family_last_name,
              email: reg.email,
              address: `${reg.address}, ${reg.city}, ${reg.state} ${reg.zip}`,
              cityState: `${reg.city}, ${reg.state}`,
              familyMembers: reg.family_members || [],
              lat: Number.parseFloat(data[0].lat),
              lng: Number.parseFloat(data[0].lon),
            }
          }
          return null
        } catch {
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
    })
  } catch (error) {
    console.error("[v0] Map data fetch error:", error)
    return NextResponse.json({ error: "Failed to fetch map data" }, { status: 500 })
  }
}
