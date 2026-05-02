"use client"

import { useState, useEffect } from "react"

interface VolunteerScheduleProps {
  date: string // Format: YYYY-MM-DD
  timeSlot: "Morning Devotion" | "Evening Devotion"
}

interface Schedule {
  openingPrayer: string | null
  leadingSingingA: string | null
  leadingSingingB: string | null
  readingScriptureA: string | null
  presentingLessonA: string | null
  lessonTitleA: string | null
  readingScriptureB: string | null
  presentingLessonB: string | null
  lessonTitleB: string | null
  closingPrayer: string | null
}

export function VolunteerSchedule({ date, timeSlot }: VolunteerScheduleProps) {
  const [schedule, setSchedule] = useState<Schedule | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const fetchSchedule = async () => {
      try {
        setIsLoading(true)
        const url = `/api/volunteer-schedule?date=${date}&timeSlot=${encodeURIComponent(timeSlot)}`
        const res = await fetch(url)
        if (!res.ok) throw new Error("Failed to fetch schedule")
        const data = await res.json()
        setSchedule(data.schedule)
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Unknown error"))
      } finally {
        setIsLoading(false)
      }
    }

    fetchSchedule()
  }, [date, timeSlot])

  if (isLoading) {
    return (
      <div className="mt-3 rounded-md bg-muted/50 p-3 animate-pulse">
        <div className="h-4 bg-muted rounded w-3/4 mb-2" />
        <div className="h-4 bg-muted rounded w-1/2" />
      </div>
    )
  }

  if (error || !schedule) {
    return null
  }

  const scheduleItems = [
    { label: "Opening Prayer", value: schedule.openingPrayer },
    { label: "[A] Leading singing", value: schedule.leadingSingingA },
    { label: "[B] Leading singing", value: schedule.leadingSingingB },
    { label: "[A] Reading scripture", value: schedule.readingScriptureA },
    { label: "[A] Presenting a lesson", value: schedule.presentingLessonA, lessonTitle: schedule.lessonTitleA },
    { label: "[B] Reading scripture", value: schedule.readingScriptureB },
    { label: "[B] Presenting a lesson", value: schedule.presentingLessonB, lessonTitle: schedule.lessonTitleB },
    { label: "Closing Prayer", value: schedule.closingPrayer },
  ]

  // Filter out items that don't have a value assigned (hide TBD entries)
  const filledItems = scheduleItems.filter((item) => item.value)

  // Don't show the schedule section if no items are filled
  if (filledItems.length === 0) {
    return null
  }

  // Extract lessons with their presenters
  const lessons = [
    { title: schedule.lessonTitleA, presenter: schedule.presentingLessonA },
    { title: schedule.lessonTitleB, presenter: schedule.presentingLessonB },
  ].filter(l => l.title && l.presenter)

  return (
    <div className="mt-3 rounded-md border border-primary/20 bg-primary/5 p-3 space-y-3">
      {/* Lessons section */}
      {lessons.length > 0 && (
        <div className="space-y-1.5">
          {lessons.map((lesson, idx) => (
            <div key={idx}>
              <p className="font-medium text-foreground text-sm">Lesson: &quot;{lesson.title}&quot;</p>
              <p className="text-xs text-muted-foreground">Speaker: {lesson.presenter}</p>
            </div>
          ))}
        </div>
      )}
      
      {/* Divider if we have both lessons and volunteer items */}
      {lessons.length > 0 && filledItems.length > 0 && (
        <div className="border-t border-primary/10" />
      )}
      
      {/* Volunteer Schedule */}
      <div>
        <p className="text-xs font-semibold text-primary mb-2">Volunteer Schedule</p>
        <ul className="space-y-1 text-xs md:text-sm text-muted-foreground">
          {filledItems.map((item) => (
            <li key={item.label} className="flex justify-between gap-2">
              <span className="text-foreground/70">
                {item.label}
                {item.lessonTitle && (
                  <span className="italic text-muted-foreground"> - {item.lessonTitle}</span>
                )}
                :
              </span>
              <span className="font-medium text-foreground">{item.value}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
