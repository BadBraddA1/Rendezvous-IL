import { NextResponse } from "next/server"

export async function GET() {
  const envVars = {
    Open_Weather: process.env.Open_Weather ? "SET" : "NOT SET",
    OPEN_WEATHER: process.env.OPEN_WEATHER ? "SET" : "NOT SET",
    OPENWEATHER_API_KEY: process.env.OPENWEATHER_API_KEY ? "SET" : "NOT SET",
    // Show first/last 4 chars if set (for debugging without exposing full key)
    Open_Weather_preview: process.env.Open_Weather 
      ? `${process.env.Open_Weather.slice(0, 4)}...${process.env.Open_Weather.slice(-4)}` 
      : null,
  }

  return NextResponse.json({
    message: "Environment variable check",
    envVars,
    timestamp: new Date().toISOString()
  })
}
