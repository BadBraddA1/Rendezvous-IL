"use client"

import { useState, useEffect } from "react"
import {
  useScheduleData,
  type ScheduleVolunteerSlot,
} from "@/components/schedule/schedule-data-context"
import { fetchJsonCached } from "@/lib/fetch-json-cache"

interface VolunteerScheduleProps {
  date: string // Format: YYYY-MM-DD
  timeSlot: "Morning Devotion" | "Evening Devotion"
}

export function VolunteerSchedule({ date, timeSlot }: VolunteerScheduleProps) {
  const scheduleData = useScheduleData()
  const [schedule, setSchedule] = useState<ScheduleVolunteerSlot | null>(
    () => scheduleData?.getVolunteerSchedule(date, timeSlot) ?? null,
  )
  const [isLoading, setIsLoading] = useState(!scheduleData && schedule === null)

  useEffect(() => {
    const cached = scheduleData?.getVolunteerSchedule(date, timeSlot)
    if (cached) {
      setSchedule(cached)
      setIsLoading(false)
      return
    }

    if (scheduleData) {
      setIsLoading(false)
      return
    }

    let cancelled = false
    void fetchJsonCached<{ schedule?: ScheduleVolunteerSlot }>(
      `/api/volunteer-schedule?date=${date}&timeSlot=${encodeURIComponent(timeSlot)}`,
    )
      .then((data) => {
        if (cancelled) return
        setSchedule(data.schedule ?? null)
      })
      .catch(() => {
        if (!cancelled) setSchedule(null)
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [date, timeSlot, scheduleData])

  if (isLoading) {
    return (
      <div className="mt-3 animate-pulse rounded-md bg-muted/50 p-3">
        <div className="mb-2 h-4 w-3/4 rounded bg-muted" />
        <div className="h-4 w-1/2 rounded bg-muted" />
      </div>
    )
  }

  if (!schedule) {
    return null
  }

  const scheduleItems = [
    { label: "Opening Prayer", value: schedule.openingPrayer },
    { label: "[A] Leading singing", value: schedule.leadingSingingA },
    { label: "[B] Leading singing", value: schedule.leadingSingingB },
    { label: "[A] Reading scripture", value: schedule.readingScriptureA, scripture: schedule.lessonScriptureA },
    { label: "[A] Presenting a lesson", value: schedule.presentingLessonA, lessonTitle: schedule.lessonTitleA },
    { label: "[B] Reading scripture", value: schedule.readingScriptureB, scripture: schedule.lessonScriptureB },
    { label: "[B] Presenting a lesson", value: schedule.presentingLessonB, lessonTitle: schedule.lessonTitleB },
    { label: "Closing Prayer", value: schedule.closingPrayer },
  ]

  const filledItems = scheduleItems.filter((item) => item.value)

  if (filledItems.length === 0) {
    return null
  }

  return (
    <div className="mt-3 rounded-md border border-primary/20 bg-primary/5 p-3">
      <p className="mb-2 text-xs font-semibold text-primary">Volunteer schedule</p>
      <ul className="space-y-1 text-xs text-muted-foreground md:text-sm">
        {filledItems.map((item) => (
          <li key={item.label} className="flex justify-between gap-2">
            <span className="text-foreground/70">
              {item.label}
              {item.lessonTitle && (
                <span className="italic text-muted-foreground"> - {item.lessonTitle}</span>
              )}
              {item.scripture && (
                <span className="italic text-muted-foreground"> - {item.scripture}</span>
              )}
              :
            </span>
            <span className="font-medium text-foreground">{item.value}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
