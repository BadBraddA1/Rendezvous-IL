export interface Announcement {
  id: number
  title: string
  message: string
  priority: string
  is_active: boolean
  show_on_live_updates: boolean
  created_at: string
  expires_at: string | null
}

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
  pop: number
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

export interface ScheduleItem {
  date: string
  day: string
  time: string
  startHour: number
  startMinute: number
  endHour?: number
  endMinute?: number
  title: string
  location?: string
  isMeal?: boolean
}

export interface VolunteerSchedule {
  openingPrayer: string | null
  leadingSingingA: string | null
  leadingSingingB: string | null
  readingScriptureA: string | null
  presentingLessonA: string | null
  readingScriptureB: string | null
  presentingLessonB: string | null
  closingPrayer: string | null
  lessonScriptureA: string | null
  lessonTitleA: string | null
  lessonScriptureB: string | null
  lessonTitleB: string | null
}

export interface MealData {
  id: number
  date: string
  meal_type: string
  main_dish: string | null
  sides: string[] | null
  title: string | null
}

export type ViewType =
  | "all"
  | "weather"
  | "schedule"
  | "meal"
  | "volunteers"
  | "announcements"
  | "map"
  | "wifi"
  | "upcoming"
  | "photoshow"

export interface ScheduleSnapshot {
  nowItem: ScheduleItem | null
  nextItem: ScheduleItem | null
  prevItem: ScheduleItem | null
  nextMeal: ScheduleItem | null
  upcomingToday: ScheduleItem[]
  upcomingAll: ScheduleItem[]
}
