"use client"

import { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import {
  DEFAULT_REGISTRATION_EVENT_YEAR,
  REGISTRATION_EVENT_YEARS,
  registrationYearOptionLabel,
  type RegistrationEventYear,
} from "@/lib/registration-event-years"

type SlideRow = {
  id: string
  volunteer_signup_id: number
  volunteer_name: string
  volunteer_type: string
  assigned_date: string | null
  time_slot: string | null
  lesson_title: string | null
  scripture_reading: string | null
  claimed_topic_title: string | null
  file_url: string
  file_name: string
  file_type: string
  byte_size: number
  updated_at: string
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

export function LessonSlidesManager({ canEdit }: { canEdit: boolean }) {
  const { toast } = useToast()
  const [year, setYear] = useState<RegistrationEventYear>(DEFAULT_REGISTRATION_EVENT_YEAR)
  const [slides, setSlides] = useState<SlideRow[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/lesson-slides?year=${year}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to load")
      setSlides(data.slides ?? [])
    } catch (error) {
      toast({
        title: "Could not load lesson slides",
        description: error instanceof Error ? error.message : "Try again",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [year])

  useEffect(() => {
    void load()
  }, [load])

  const remove = async (signupId: number) => {
    if (!canEdit) return
    setDeletingId(signupId)
    try {
      const res = await fetch(
        `/api/admin/lesson-slides?volunteerSignupId=${signupId}`,
        { method: "DELETE" },
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Delete failed")
      toast({ title: "Slide removed" })
      await load()
    } catch (error) {
      toast({
        title: "Could not delete",
        description: error instanceof Error ? error.message : "Try again",
        variant: "destructive",
      })
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm text-muted-foreground" htmlFor="lesson-slides-year">
          Event year
        </label>
        <select
          id="lesson-slides-year"
          className="rounded-md border bg-background px-3 py-2 text-sm"
          value={year}
          onChange={(e) => setYear(Number(e.target.value) as RegistrationEventYear)}
        >
          {REGISTRATION_EVENT_YEARS.map((y) => (
            <option key={y} value={y}>
              {registrationYearOptionLabel(y)}
            </option>
          ))}
        </select>
        <Button type="button" variant="outline" size="sm" onClick={() => void load()}>
          Refresh
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        Presenters upload PowerPoint or PDF from More → Your volunteering in the app. Files land
        here for projection prep.
      </p>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : slides.length === 0 ? (
        <p className="text-sm text-muted-foreground">No lesson decks submitted for {year} yet.</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {slides.map((slide) => (
            <li
              key={slide.id}
              className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 space-y-1">
                <p className="font-medium">{slide.volunteer_name}</p>
                <p className="text-sm text-muted-foreground">
                  {[
                    slide.claimed_topic_title,
                    slide.lesson_title,
                    slide.assigned_date,
                    slide.time_slot,
                  ]
                    .filter(Boolean)
                    .join(" · ") || slide.volunteer_type}
                </p>
                <p className="truncate text-sm">
                  <a
                    href={slide.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary underline-offset-2 hover:underline"
                  >
                    {slide.file_name}
                  </a>{" "}
                  <span className="text-muted-foreground">
                    ({slide.file_type.toUpperCase()}, {formatBytes(slide.byte_size)})
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">Updated {slide.updated_at}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button asChild variant="outline" size="sm">
                  <a href={slide.file_url} target="_blank" rel="noreferrer" download>
                    Download
                  </a>
                </Button>
                {canEdit && (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    disabled={deletingId === slide.volunteer_signup_id}
                    onClick={() => void remove(slide.volunteer_signup_id)}
                  >
                    Remove
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
