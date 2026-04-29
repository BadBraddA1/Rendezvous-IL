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
  const apiKey = process.env.Open_Weather

  if (!apiKey) {
    return NextResponse.json({ error: "Weather API key not configured" }, { status: 500 })
  }

  // Return cached data if still fresh
  if (cachedData && Date.now() - cacheTime < CACHE_DURATION) {
    return NextResponse.json(cachedData)
  }

  try {
    // Using OpenWeather One Call API 3.0
    const response = await fetch(
      `https://api.openweathermap.org/data/3.0/onecall?lat=${LAT}&lon=${LON}&exclude=minutely,daily,alerts&units=imperial&appid=${apiKey}`,
      { next: { revalidate: 300 } } // Cache for 5 minutes
    )

    if (!response.ok) {
      // Try 2.5 API as fallback
      const fallbackResponse = await fetch(
        `https://api.openweathermap.org/data/2.5/forecast?lat=${LAT}&lon=${LON}&units=imperial&appid=${apiKey}`,
        { next: { revalidate: 300 } }
      )

      if (!fallbackResponse.ok) {
        throw new Error("Weather API request failed")
      }

      const fallbackData = await fallbackResponse.json()
      
      // Transform 2.5 API response to match our format
      const transformedData: WeatherData = {
        current: {
          dt: Math.floor(Date.now() / 1000),
          temp: fallbackData.list[0].main.temp,
          feels_like: fallbackData.list[0].main.feels_like,
          humidity: fallbackData.list[0].main.humidity,
          weather: fallbackData.list[0].weather,
          wind_speed: fallbackData.list[0].wind.speed,
        },
        hourly: fallbackData.list.slice(0, 8).map((item: any) => ({
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
    
    // Only keep first 8 hours of hourly data
    const weatherData: WeatherData = {
      current: data.current,
      hourly: data.hourly.slice(0, 8),
    }

    cachedData = weatherData
    cacheTime = Date.now()
    return NextResponse.json(weatherData)
  } catch (error) {
    console.error("Weather API error:", error)
    return NextResponse.json({ error: "Failed to fetch weather data" }, { status: 500 })
  }
}
