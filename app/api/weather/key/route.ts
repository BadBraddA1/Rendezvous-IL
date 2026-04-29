import { NextResponse } from "next/server"

// This endpoint provides a limited-access key for the radar tiles
// The key is only used client-side for the tile layer
export async function GET() {
  const apiKey = process.env.OPENWEATHER_API_KEY

  if (!apiKey) {
    return NextResponse.json({ error: "API key not configured" }, { status: 500 })
  }

  // Return the key for client-side radar tiles
  return NextResponse.json({ key: apiKey })
}
