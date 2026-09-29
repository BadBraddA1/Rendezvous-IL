"use client"

import { Droplets, Wind } from "lucide-react"
import { getWeatherIcon } from "@/components/live-updates/weather-icon"
import { formatTime } from "@/lib/live-updates/time"
import type { WeatherData } from "@/lib/live-updates/types"

export function WeatherView({ weather }: { weather: WeatherData | null }) {
  const hourly = weather?.hourly?.slice(0, 6) ?? []

  return (
    <div className="relative flex h-full w-full items-center justify-center">
      <div className="lu-panel relative w-full max-w-6xl p-10 sm:p-12">
        <div className="relative flex flex-col items-center justify-center">
          {!weather ? (
            <p className="lu-type-board-md lu-text-muted">Loading weather...</p>
          ) : (
            <>
              <div className="mb-5 flex items-center gap-12">
                {getWeatherIcon(
                  weather.current.weather[0].id,
                  weather.current.weather[0].icon,
                  "lg",
                )}
                <span className="lu-type-display">{Math.round(weather.current.temp)}°</span>
              </div>

              <p className="lu-type-board-lg lu-text-body mb-8 max-w-3xl text-center text-balance capitalize">
                {weather.current.weather[0].description}
              </p>

              <div className="lu-type-board-md lu-text-secondary mb-10 flex items-center gap-14">
                <span className="flex items-center gap-3">
                  <Droplets className="lu-text-schedule h-9 w-9" aria-hidden="true" />
                  {weather.current.humidity}%
                </span>
                <span className="flex items-center gap-3">
                  <Wind className="lu-text-schedule h-9 w-9" aria-hidden="true" />
                  {Math.round(weather.current.wind_speed)} mph
                </span>
              </div>

              {hourly.length > 0 && (
                <div className="w-full max-w-5xl">
                  <p className="lu-type-label lu-text-schedule mb-4 text-center opacity-85">
                    Next few hours
                  </p>
                  <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
                    {hourly.map((hour) => (
                      <div
                        key={hour.dt}
                        className="lu-panel-inner flex flex-col items-center px-2 py-4 text-center"
                      >
                        <p className="lu-text-muted text-sm font-medium tabular-nums">
                          {formatTime(hour.dt)}
                        </p>
                        <div className="my-2 flex justify-center">
                          {getWeatherIcon(hour.weather[0].id, hour.weather[0].icon, "sm")}
                        </div>
                        <p className="lu-type-board-sm tabular-nums">
                          {Math.round(hour.temp)}°
                        </p>
                        {hour.pop > 0.1 && (
                          <p className="lu-text-schedule mt-1 flex items-center justify-center gap-1 text-xs">
                            <Droplets className="h-3 w-3" aria-hidden="true" />
                            {Math.round(hour.pop * 100)}%
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
