"use client"

import {
  Clock, MapPin, Users, UtensilsCrossed, ChevronRight, Bed, Droplets,
} from "lucide-react"
import { LuNowDot } from "@/components/live-updates/lu-now-dot"
import { getEventIcon } from "@/components/live-updates/event-icon"
import { getWeatherIcon } from "@/components/live-updates/weather-icon"
import { ScheduleCard } from "@/components/live-updates/schedule-card"
import { formatTime } from "@/lib/live-updates/time"
import type { ScheduleItem, VolunteerSchedule, WeatherData } from "@/lib/live-updates/types"

export function AllView({ 
  weather, 
  nowItem, 
  nextItem, 
  nextMeal,
  upcomingToday,
  upcomingAll,
  volunteerSchedule,
  volunteerTimeSlot
}: { 
  weather: WeatherData | null
  nowItem: ScheduleItem | null
  nextItem: ScheduleItem | null
  nextMeal: ScheduleItem | null
  upcomingToday: ScheduleItem[]
  upcomingAll: ScheduleItem[]
  volunteerSchedule: VolunteerSchedule | null
  volunteerTimeSlot: string
}) {
  // Check if volunteer schedule has any filled items
  const volunteerItems: { label: string; value: string | null; subtitle?: string | null }[] = volunteerSchedule ? [
    { label: "Opening Prayer", value: volunteerSchedule.openingPrayer },
    { label: "Leading Singing [A]", value: volunteerSchedule.leadingSingingA },
    { label: "Leading Singing [B]", value: volunteerSchedule.leadingSingingB },
    { label: "Reading Scripture [A]", value: volunteerSchedule.readingScriptureA, subtitle: volunteerSchedule.lessonScriptureA },
    { label: "Presenting [A]", value: volunteerSchedule.presentingLessonA, subtitle: volunteerSchedule.lessonTitleA },
    { label: "Reading Scripture [B]", value: volunteerSchedule.readingScriptureB, subtitle: volunteerSchedule.lessonScriptureB },
    { label: "Presenting [B]", value: volunteerSchedule.presentingLessonB, subtitle: volunteerSchedule.lessonTitleB },
    { label: "Closing Prayer", value: volunteerSchedule.closingPrayer },
  ].filter(item => item.value) : []

  const hasVolunteers = volunteerItems.length > 0

  // Featured event - prefer "now" then "next"
  const featuredItem = nowItem || nextItem
  const featuredIsNow = !!nowItem

  return (
    <div className="relative w-full h-full mx-auto flex flex-col overflow-hidden">
      {/* Featured event */}
      <div className="relative mb-6 shrink-0 overflow-hidden lu-panel">
        <div className="relative p-6">
          {featuredItem ? (
            <div className="relative lu-panel-soft p-6">
              <div className="flex items-center gap-3 mb-4">
                {featuredIsNow ? (
                  <>
                    <LuNowDot size="md" />
                    <span className="lu-kicker lu-text-now">Happening now</span>
                  </>
                ) : (
                  <>
                    <ChevronRight className="h-5 w-5 lu-text-upcoming" />
                    <span className="lu-type-label lu-text-upcoming">Up Next</span>
                  </>
                )}
              </div>
              <div className="flex items-start gap-6">
                <div className="shrink-0 rounded-2xl bg-white/5 border border-primary/20 p-4">
                  {getEventIcon(featuredItem.title, featuredItem.isMeal, "lg")}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="lu-type-board-lg mb-3 text-balance">{featuredItem.title}</h2>
                  <div className="flex flex-wrap gap-3">
                    <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-primary/20 text-base">
                      <Clock className="h-4 w-4 lu-text-upcoming" />
                      {featuredIsNow ? featuredItem.time : `${featuredItem.day} ${featuredItem.time}`}
                    </span>
                    {featuredItem.location && (
                      <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-primary/20 text-base">
                        <MapPin className="h-4 w-4 lu-text-upcoming" />
                        {featuredItem.location}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-primary/20 bg-white/[0.03] p-8 text-center">
              <Bed className="h-16 w-16 lu-icon-muted mx-auto mb-4" />
              <p className="text-2xl font-semibold lu-text-muted">Free Time</p>
              <p className="text-base lu-text-subtle mt-2">Enjoy the retreat!</p>
            </div>
          )}
        </div>
      </div>

      {/* CARDS GRID */}
      <div className={`grid grid-cols-1 gap-6 flex-1 min-h-0 ${hasVolunteers ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
        {/* Weather Card */}
        <div className="group relative overflow-hidden lu-panel p-7">
          <div className="relative">
            <div className="flex items-center gap-3 mb-6">
              <div className="rounded-xl lu-pin-lake-surface p-2.5 border lu-pin-lake-border">
                <Droplets className="h-5 w-5 lu-text-schedule" />
              </div>
              <span className="lu-type-label lu-text-schedule opacity-90">Weather</span>
            </div>
            {weather ? (
              <div className="space-y-5">
                <div className="flex items-center gap-4">
                  {getWeatherIcon(weather.current.weather[0].id, weather.current.weather[0].icon, "md")}
                  <span className="lu-type-display-sm">{Math.round(weather.current.temp)}°</span>
                </div>
                <p className="lu-text-secondary capitalize text-lg">{weather.current.weather[0].description}</p>
                <div className="grid grid-cols-3 gap-2">
                  {weather.hourly.slice(0, 3).map((hour) => (
                    <div key={hour.dt} className="text-center p-3 rounded-xl bg-white/5 border border-white/5">
                      <p className="text-xs lu-text-muted font-medium">{formatTime(hour.dt)}</p>
                      <div className="flex justify-center my-2">
                        {getWeatherIcon(hour.weather[0].id, hour.weather[0].icon, "sm")}
                      </div>
                      <p className="font-bold text-base tabular-nums">{Math.round(hour.temp)}°</p>
                      {hour.pop > 0.1 && (
                        <p className="text-xs lu-text-schedule flex items-center justify-center gap-1 mt-0.5">
                          <Droplets className="h-3 w-3" />
                          {Math.round(hour.pop * 100)}%
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="lu-text-muted text-lg">Loading weather...</p>
            )}
          </div>
        </div>

        {/* Schedule Card */}
        <ScheduleCard nowItem={nowItem} nextItem={nextItem} upcomingToday={upcomingToday} upcomingAll={upcomingAll} />

        {/* Next Meal Card */}
        <div className="group relative overflow-hidden lu-panel p-7">
          <div className="relative">
            <div className="flex items-center gap-3 mb-6">
              <div className="rounded-xl lu-priority-normal-surface p-2.5 border lu-pin-warm-border">
                <UtensilsCrossed className="h-5 w-5 lu-text-meal" />
              </div>
              <span className="lu-type-label lu-text-meal opacity-90">Next Meal</span>
            </div>
            {nextMeal ? (
              <div className="flex flex-col items-center justify-center text-center pt-2">
                <div className="mb-4 rounded-2xl bg-white/5 border border-primary/20 p-4">
                  {getEventIcon(nextMeal.title, true, "lg")}
                </div>
                <h3 className="lu-type-board-sm mb-3">{nextMeal.title}</h3>
                <p className="lu-text-secondary text-lg flex items-center justify-center gap-2 mb-2">
                  <Clock className="h-4 w-4 lu-text-meal" />
                  {nextMeal.time}
                </p>
                {nextMeal.location && (
                  <p className="lu-text-muted text-sm flex items-center justify-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" />
                    {nextMeal.location}
                  </p>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center pt-4">
                <UtensilsCrossed className="h-16 w-16 lu-icon-muted mb-4" />
                <p className="lu-text-muted text-lg">No upcoming meals</p>
              </div>
            )}
          </div>
        </div>

        {/* Volunteer Schedule Card */}
        {hasVolunteers && (
          <div className="group relative overflow-hidden lu-panel p-7">
            <div className="relative">
              <div className="flex items-center gap-3 mb-6">
                <div className="rounded-xl lu-pin-coral-surface p-2.5 border lu-pin-coral-border">
                  <Users className="h-5 w-5 lu-pin-coral-text" />
                </div>
                <span className="lu-type-label lu-pin-coral-text opacity-90 truncate">{volunteerTimeSlot}</span>
              </div>
              <div className="space-y-2.5">
                {volunteerItems.map((item, index) => (
                  <div key={index} className="text-sm">
                    <p className="lu-type-label-sm lu-text-subtle mb-0.5">{item.label}</p>
                    <p className="font-semibold text-base lu-text-body">{item.value}</p>
                    {item.subtitle && (
                      <p className="lu-text-muted italic text-xs mt-0.5">{item.subtitle}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
