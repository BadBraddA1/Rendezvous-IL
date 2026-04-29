import { NextResponse } from "next/server"

// Lake Williamson coordinates
const LAT = 39.2795
const LON = -89.8820

// Cache the assistant response for longer (once per day refresh)
let cachedResponse: { data: any; timestamp: number } | null = null
const CACHE_DURATION = 4 * 60 * 60 * 1000 // 4 hours in ms

export async function GET() {
  const apiKey = process.env.OPENWEATHER_API_KEY

  if (!apiKey) {
    return NextResponse.json({ error: "Weather API key not configured" }, { status: 500 })
  }

  // Return cached response if still valid
  if (cachedResponse && Date.now() - cachedResponse.timestamp < CACHE_DURATION) {
    return NextResponse.json(cachedResponse.data)
  }

  try {
    // Get current weather data first
    const weatherRes = await fetch(
      `https://api.openweathermap.org/data/2.5/forecast?lat=${LAT}&lon=${LON}&units=imperial&appid=${apiKey}`
    )
    
    if (!weatherRes.ok) {
      throw new Error("Failed to fetch weather data")
    }

    const weatherData = await weatherRes.json()
    
    // Get today's and tomorrow's forecasts
    const now = new Date()
    const todayStr = now.toISOString().split('T')[0]
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = tomorrow.toISOString().split('T')[0]

    // Extract relevant forecast data
    const todayForecasts = weatherData.list.filter((item: any) => 
      item.dt_txt.startsWith(todayStr)
    )
    const tomorrowForecasts = weatherData.list.filter((item: any) => 
      item.dt_txt.startsWith(tomorrowStr)
    )

    // Analyze conditions
    const analyzeDay = (forecasts: any[]) => {
      if (forecasts.length === 0) return null
      
      const avgTemp = forecasts.reduce((sum, f) => sum + f.main.temp, 0) / forecasts.length
      const maxPop = Math.max(...forecasts.map(f => f.pop || 0))
      const hasRain = forecasts.some(f => f.weather[0].main.toLowerCase().includes('rain'))
      const hasStorm = forecasts.some(f => f.weather[0].id >= 200 && f.weather[0].id < 300)
      const conditions = forecasts[Math.floor(forecasts.length / 2)]?.weather[0]?.description || ''
      
      return { avgTemp, maxPop, hasRain, hasStorm, conditions }
    }

    const todayAnalysis = analyzeDay(todayForecasts)
    const tomorrowAnalysis = analyzeDay(tomorrowForecasts)

    // Generate fun weather summary
    const funnyPhrases = [
      { condition: 'perfect', phrases: [
        "Mother Nature is giving us a high five today!",
        "It's so nice out, even the squirrels are smiling!",
        "Weather's looking chef's kiss - outdoor activities are a GO!",
        "The sun is shining like it got a promotion!",
      ]},
      { condition: 'warm', phrases: [
        "It's warmer than a fresh batch of cookies out there!",
        "Sunscreen is your new best friend today!",
        "Perfect weather for cannonballs at the lake!",
        "The sun's working overtime - stay hydrated, friends!",
      ]},
      { condition: 'cool', phrases: [
        "Hoodie weather alert - looking cozy out there!",
        "The weather's giving autumn vibes!",
        "Perfect weather for hot cocoa by the bonfire!",
        "Layers are your friend today, fashionistas!",
      ]},
      { condition: 'rainy', phrases: [
        "The clouds are feeling emotional today - bring an umbrella!",
        "Looks like the sky needs a good cry - indoor activities might be the move!",
        "Rain, rain... well, you know the rest. Plan B time!",
        "The puddle-jumping championship is ON!",
      ]},
      { condition: 'stormy', phrases: [
        "Thor is practicing his drums today - stay inside!",
        "The sky is throwing a tantrum - outdoor activities postponed!",
        "Lightning wants to be the star today - let it have its moment indoors!",
        "Movie marathon weather! The storm is our excuse!",
      ]},
    ]

    const getPhrase = (analysis: any) => {
      if (!analysis) return "Weather data is still brewing..."
      
      let condition = 'perfect'
      if (analysis.hasStorm) condition = 'stormy'
      else if (analysis.hasRain || analysis.maxPop > 0.5) condition = 'rainy'
      else if (analysis.avgTemp > 85) condition = 'warm'
      else if (analysis.avgTemp < 55) condition = 'cool'
      
      const phraseGroup = funnyPhrases.find(p => p.condition === condition)
      const phrases = phraseGroup?.phrases || funnyPhrases[0].phrases
      return phrases[Math.floor(Math.random() * phrases.length)]
    }

    const getOutdoorAdvice = (analysis: any) => {
      if (!analysis) return { rating: 'unknown', advice: 'Check back later!' }
      
      if (analysis.hasStorm) {
        return { rating: 'poor', advice: 'Indoor activities recommended. Safety first!' }
      }
      if (analysis.hasRain || analysis.maxPop > 0.6) {
        return { rating: 'fair', advice: 'Have a backup plan ready - rain is likely!' }
      }
      if (analysis.maxPop > 0.3) {
        return { rating: 'good', advice: 'Mostly good, but keep an eye on the sky!' }
      }
      if (analysis.avgTemp > 90) {
        return { rating: 'good', advice: 'Great for water activities! Stay hydrated!' }
      }
      if (analysis.avgTemp < 50) {
        return { rating: 'good', advice: 'Bundle up for outdoor fun!' }
      }
      return { rating: 'excellent', advice: 'Perfect conditions for all outdoor activities!' }
    }

    const response = {
      generatedAt: new Date().toISOString(),
      location: "Lake Williamson Christian Center",
      funnyPhrase: getPhrase(todayAnalysis),
      today: todayAnalysis ? {
        temp: Math.round(todayAnalysis.avgTemp),
        conditions: todayAnalysis.conditions,
        rainChance: Math.round(todayAnalysis.maxPop * 100),
        outdoor: getOutdoorAdvice(todayAnalysis),
      } : null,
      tomorrow: tomorrowAnalysis ? {
        temp: Math.round(tomorrowAnalysis.avgTemp),
        conditions: tomorrowAnalysis.conditions,
        rainChance: Math.round(tomorrowAnalysis.maxPop * 100),
        outdoor: getOutdoorAdvice(tomorrowAnalysis),
      } : null,
    }

    // Cache the response
    cachedResponse = { data: response, timestamp: Date.now() }

    return NextResponse.json(response)
  } catch (error) {
    console.error("[v0] Weather assistant error:", error)
    return NextResponse.json({ error: "Failed to generate weather summary" }, { status: 500 })
  }
}
