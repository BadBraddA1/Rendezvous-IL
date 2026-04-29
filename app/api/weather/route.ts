import { NextResponse } from "next/server"

// Lake Williamson Christian Center, Carlinville, IL coordinates
const LAT = 39.2795
const LON = -89.8820

export interface HourlyForecast {
  dt: number
  temp: number
  feels_like: number
  humidity: number
  weather: {
    id: number
    main: string
    description: string
    icon: string
  }[]
  pop: number // Probability of precipitation
  wind_speed: number
}

export interface WeatherData {
  current: {
    dt: number
    temp: number
    feels_like: number
    humidity: number
    weather: {
      id: number
      main: string
      description: string
      icon: string
    }[]
    wind_speed: number
  }
  hourly: HourlyForecast[]
}

// Cache weather data for 5 minutes
let cachedData: WeatherData | null = null
let cacheTime = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export async function GET() {
  // Try multiple possible env var names
  const apiKey = process.env.Open_Weather || process.env.OPEN_WEATHER || process.env.OPENWEATHER_API_KEY

  if (!apiKey) {
    console.error("[v0] Weather API key not found. Checked: Open_Weather, OPEN_WEATHER, OPENWEATHER_API_KEY")
    return NextResponse.json({ error: "Weather API key not configured" }, { status: 500 })
  }

  // Return cached data if still fresh
  if (cachedData && Date.now() - cacheTime < CACHE_DURATION) {
    return NextResponse.json(cachedData)
  }

  try {
    // Using OpenWeather One Call API 3.0
    console.log("[v0] Fetching weather from OpenWeather API...")
    const response = await fetch(
      `https://api.openweathermap.org/data/3.0/onecall?lat=${LAT}&lon=${LON}&exclude=minutely,daily,alerts&units=imperial&appid=${apiKey}`,
      { next: { revalidate: 300 } } // Cache for 5 minutes
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.log(`[v0] One Call API 3.0 failed (${response.status}): ${errorText}`)
      console.log("[v0] Trying 2.5 API as fallback...")
      
      // Try 2.5 API as fallback
      const fallbackResponse = await fetch(
        `https://api.openweathermap.org/data/2.5/forecast?lat=${LAT}&lon=${LON}&units=imperial&appid=${apiKey}`,
        { next: { revalidate: 300 } }
      )

      if (!fallbackResponse.ok) {
        const fallbackError = await fallbackResponse.text()
        console.error(`[v0] 2.5 API also failed (${fallbackResponse.status}): ${fallbackError}`)
        return NextResponse.json({ 
          error: "Weather API request failed", 
          details: fallbackError,
          status: fallbackResponse.status 
        }, { status: 500 })
      }

      const fallbackData = await fallbackResponse.json()
      
      // Transform 2.5 API response to match our format
      // Keep all forecast data (up to 5 days) for event date lookups
      const transformedData: WeatherData = {
        current: {
          dt: Math.floor(Date.now() / 1000),
          temp: fallbackData.list[0].main.temp,
          feels_like: fallbackData.list[0].main.feels_like,
          humidity: fallbackData.list[0].main.humidity,
          weather: fallbackData.list[0].weather,
          wind_speed: fallbackData.list[0].wind.speed,
        },
        hourly: fallbackData.list.map((item: any) => ({
          dt: item.dt,
          temp: item.main.temp,
          feels_like: item.main.feels_like,
          humidity: item.main.humidity,
          weather: item.weather,
          pop: item.pop || 0,
          wind_speed: item.wind.speed,
        })),
      }

      cachedData = transformedData
      cacheTime = Date.now()
      return NextResponse.json(transformedData)
    }

    const data = await response.json()
    
    // Keep more hourly data for event date lookups (48 hours available in One Call)
    const weatherData: WeatherData = {
      current: data.current,
      hourly: data.hourly.slice(0, 48),
    }

    cachedData = weatherData
    cacheTime = Date.now()
    return NextResponse.json(weatherData)
  } catch (error) {
    console.error("Weather API error:", error)
    return NextResponse.json({ error: "Failed to fetch weather data" }, { status: 500 })
  }
}
