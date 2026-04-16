import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const registrationId = searchParams.get("registrationId")

  if (!registrationId) {
    return NextResponse.json({ error: "registrationId is required" }, { status: 400 })
  }

  try {
    const members = await sql`
      SELECT
        id,
        first_name,
        last_name,
        age,
        date_of_birth,
        is_baptized
      FROM family_members
      WHERE registration_id = ${parseInt(registrationId)}
      ORDER BY age DESC NULLS LAST
    `
    return NextResponse.json(members)
  } catch (error) {
    console.error("Error fetching family members:", error)
    return NextResponse.json({ error: "Failed to fetch family members" }, { status: 500 })
  }
}
