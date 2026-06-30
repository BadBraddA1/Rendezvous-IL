"use client"

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { fetchJsonCached } from "@/lib/fetch-json-cache"

export type ScheduleMeal = {
  id: number
  date: string
  meal_type: string
  main_dish: string
  sides: string[] | null
  dessert: string | null
  drinks: string[] | null
  notes: string | null
  title: string | null
}

export type ScheduleVolunteerSlot = {
  openingPrayer: string | null
  leadingSingingA: string | null
  leadingSingingB: string | null
  readingScriptureA: string | null
  presentingLessonA: string | null
  lessonTitleA: string | null
  lessonScriptureA: string | null
  readingScriptureB: string | null
  presentingLessonB: string | null
  lessonTitleB: string | null
  lessonScriptureB: string | null
  closingPrayer: string | null
}

export type ScheduleWeatherHour = {
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
  pop: number
  wind_speed: number
}

export type ScheduleWeatherData = {
  hourly: ScheduleWeatherHour[]
}

type ScheduleDataContextValue = {
  getMeal: (date: string, mealType: string) => ScheduleMeal | null
  getVolunteerSchedule: (date: string, timeSlot: string) => ScheduleVolunteerSlot | null
  weather: ScheduleWeatherData | null
}

const ScheduleDataContext = createContext<ScheduleDataContextValue | null>(null)

const SCHEDULE_WEEK_FROM = "2027-05-03"
const SCHEDULE_WEEK_TO = "2027-05-07"

export function ScheduleDataProvider({ children }: { children: ReactNode }) {
  const [meals, setMeals] = useState<ScheduleMeal[]>([])
  const [volunteerSchedules, setVolunteerSchedules] = useState<
    Record<string, ScheduleVolunteerSlot>
  >({})
  const [weather, setWeather] = useState<ScheduleWeatherData | null>(null)

  useEffect(() => {
    let cancelled = false

    void Promise.all([
      fetchJsonCached<{ meals?: ScheduleMeal[] }>("/api/meals"),
      fetchJsonCached<{ schedules?: Record<string, ScheduleVolunteerSlot> }>(
        `/api/volunteer-schedule?from=${SCHEDULE_WEEK_FROM}&to=${SCHEDULE_WEEK_TO}`,
      ),
      fetchJsonCached<ScheduleWeatherData & { error?: string }>("/api/weather"),
    ])
      .then(([mealsResponse, volunteerResponse, weatherResponse]) => {
        if (cancelled) return
        setMeals(mealsResponse.meals ?? [])
        setVolunteerSchedules(volunteerResponse.schedules ?? {})
        if (!weatherResponse.error && weatherResponse.hourly) {
          setWeather({ hourly: weatherResponse.hourly })
        }
      })
      .catch(() => {
        // Individual widgets fall back to null / hidden state.
      })

    return () => {
      cancelled = true
    }
  }, [])

  const mealsByKey = useMemo(() => {
    const map = new Map<string, ScheduleMeal>()
    for (const meal of meals) {
      map.set(`${meal.date}|${meal.meal_type}`, meal)
    }
    return map
  }, [meals])

  const value = useMemo<ScheduleDataContextValue>(
    () => ({
      getMeal: (date, mealType) => mealsByKey.get(`${date}|${mealType}`) ?? null,
      getVolunteerSchedule: (date, timeSlot) =>
        volunteerSchedules[`${date}|${timeSlot}`] ?? null,
      weather,
    }),
    [mealsByKey, volunteerSchedules, weather],
  )

  return (
    <ScheduleDataContext.Provider value={value}>{children}</ScheduleDataContext.Provider>
  )
}

export function useScheduleData() {
  return useContext(ScheduleDataContext)
}
