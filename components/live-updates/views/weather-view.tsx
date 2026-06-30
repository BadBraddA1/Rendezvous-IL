"use client"

import { Droplets, Wind } from "lucide-react"
import { getWeatherIcon } from "@/components/live-updates/weather-icon"
import type { WeatherData } from "@/lib/live-updates/types"

export function WeatherView({ weather }: { weather: WeatherData | null }) {
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <div className="relative w-full max-w-5xl lu-panel p-12">
        <div className="relative flex flex-col items-center justify-center">
          {!weather ? (
            <p className="lu-type-board-md lu-text-muted">Loading weather...</p>
          ) : (
            <>
              <div className="flex items-center gap-12 mb-6">
                {getWeatherIcon(weather.current.weather[0].id, weather.current.weather[0].icon, "lg")}
                <span className="lu-type-display">{Math.round(weather.current.temp)}°</span>
              </div>

              <p className="lu-type-board-lg lu-text-body capitalize mb-10 text-center text-balance">
                {weather.current.weather[0].description}
              </p>

              <div className="flex items-center gap-16 lu-type-board-md lu-text-secondary">
                <span className="flex items-center gap-3">
                  <Droplets className="h-9 w-9 lu-text-schedule" aria-hidden="true" />
                  {weather.current.humidity}%
                </span>
                <span className="flex items-center gap-3">
                  <Wind className="h-9 w-9 lu-text-schedule" aria-hidden="true" />
                  {Math.round(weather.current.wind_speed)} mph
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
