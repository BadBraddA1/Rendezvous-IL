"use client"

import type React from "react"
import dynamic from "next/dynamic"
import { Map, X, Printer, ExternalLink } from "lucide-react"
import Link from "next/link"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { useState, useRef, useCallback, useEffect } from "react"
import { useFocusTrap } from "@/lib/use-focus-trap"
import { Button } from "@/components/ui/button"
import { VolunteerSchedule } from "@/components/volunteer-schedule"
import { InlineWeather } from "@/components/weather-forecast"
import { LocationLink } from "@/components/location-link"
import { MealMenu } from "@/components/meal-menu"
import { ScheduleDataProvider } from "@/components/schedule/schedule-data-context"
import { parseTimeString } from "@/lib/schedule-data"
import type { PublicScheduleDay, PublicScheduleEvent } from "@/lib/event-schedule"

/** Today's calendar date in America/Chicago as yyyy-MM-dd. */
function chicagoISODate(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now)
}

function preferredScheduleDay(days: PublicScheduleDay[]): PublicScheduleDay | null {
  if (days.length === 0) return null
  const today = chicagoISODate()
  return (
    days.find((day) => day.date === today) ??
    days.find((day) => day.date >= today) ??
    days[days.length - 1] ??
    null
  )
}

const ScheduleMap = dynamic(
  () => import("@/components/schedule-map").then((mod) => mod.ScheduleMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Loading map…
      </div>
    ),
  },
)

const DAY_LETTERS: Record<string, string> = {
  Sunday: "Su",
  Monday: "M",
  Tuesday: "T",
  Wednesday: "W",
  Thursday: "Th",
  Friday: "F",
  Saturday: "Sa",
}

function displayWeekday(day: PublicScheduleDay): string {
  if (day.weekday) return day.weekday
  if (/^\d{4}-\d{2}-\d{2}$/.test(day.day)) {
    const date = new Date(`${day.day}T00:00:00.000Z`)
    return date.toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" })
  }
  return day.day
}

function dayLetter(day: PublicScheduleDay): string {
  const weekday = displayWeekday(day)
  return DAY_LETTERS[weekday] ?? weekday.charAt(0)
}

const DAY_BADGE_CLASSES: Record<string, string> = {
  secondary: "bg-secondary text-secondary-foreground",
  primary: "bg-primary text-primary-foreground",
  foreground: "bg-foreground text-background",
}

const sectionClass =
  "schedule-day-section site-scroll-mt rounded-xl border border-primary/15 bg-card p-4 md:p-6"
const eventClass =
  "min-w-0 rounded-lg border border-border/60 bg-surface-tint/50 p-3 break-words md:p-4"

function weatherHour(time: string): number {
  try {
    return parseTimeString(time).startHour
  } catch {
    return 14
  }
}

type Props = {
  year: number
  dateRangeLabel: string
  location: string
  /** Empty = hide the draft/disclaimer banner (admin-controlled). */
  draftNotice: string
  days: PublicScheduleDay[]
}

function ScheduleEventRow({
  event,
  date,
  onShowMap,
}: {
  event: PublicScheduleEvent
  date: string
  onShowMap: (locationId: string) => void
}) {
  const mealType =
    event.mealType === "breakfast" || event.mealType === "lunch" || event.mealType === "dinner"
      ? event.mealType
      : null
  const volunteerSlot =
    event.volunteerSlot === "Morning Devotion" || event.volunteerSlot === "Evening Devotion"
      ? event.volunteerSlot
      : null

  return (
    <div className={eventClass}>
      <dt className="mb-2 flex flex-wrap items-center gap-2 text-sm font-medium text-primary md:text-base">
        {event.time}
        {event.showWeather && <InlineWeather date={date} hour={weatherHour(event.time)} />}
      </dt>
      <dd className="text-sm leading-relaxed text-muted-foreground md:text-base">
        <span className="text-foreground/90">{event.title}</span>
        {event.location && (
          <>
            {" — "}
            {event.locationId ? (
              <LocationLink locationId={event.locationId} onShowMap={onShowMap}>
                {event.location}
              </LocationLink>
            ) : (
              event.location
            )}
          </>
        )}
        {event.linkHref && (
          <>
            {" · "}
            <a
              href={event.linkHref}
              className="focus-ring inline-flex items-center gap-1 rounded-sm text-primary hover:underline"
            >
              More info
              <ExternalLink className="h-3 w-3" aria-hidden="true" />
            </a>
          </>
        )}
        {event.note && (
          <span className="mt-1 block text-xs italic md:text-sm">{event.note}</span>
        )}
        {mealType && <MealMenu date={date} mealType={mealType} />}
        {volunteerSlot && <VolunteerSchedule date={date} timeSlot={volunteerSlot} />}
      </dd>
    </div>
  )
}

export function ScheduleClient({ year, dateRangeLabel, location, draftNotice, days }: Props) {
  const [activeDay, setActiveDay] = useState<string>("")
  const [showMap, setShowMap] = useState(false)
  const [highlightedLocation, setHighlightedLocation] = useState<string | null>(null)
  const mapDialogRef = useRef<HTMLDivElement>(null)

  const showMapWithLocation = (locationId: string) => {
    setHighlightedLocation(locationId)
    setShowMap(true)
  }

  // Open on today (Central Time), or the next upcoming day outside retreat week.
  useEffect(() => {
    const preferred = preferredScheduleDay(days)
    if (!preferred) return
    const dayId = preferred.day.toLowerCase()
    setActiveDay(dayId)
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    // Wait a tick so the day sections are in the DOM.
    const timer = window.setTimeout(() => {
      document.getElementById(dayId)?.scrollIntoView({
        behavior: reduceMotion ? "auto" : "smooth",
        block: "start",
      })
    }, 80)
    return () => window.clearTimeout(timer)
  }, [days])

  const handleDayClick = (e: React.MouseEvent<HTMLAnchorElement>, day: string) => {
    e.preventDefault()
    setActiveDay(day)

    // scrollIntoView respects scroll-margin on each day section (safe-area + header offset).
    const element = document.getElementById(day)
    if (element) {
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
      element.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" })
    }
  }

  const closeMap = useCallback(() => {
    setShowMap(false)
    setHighlightedLocation(null)
  }, [])

  useFocusTrap(showMap, mapDialogRef, closeMap)

  return (
    <ScheduleDataProvider>
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main
        id="main-content"
        className="site-container site-below-header-loose site-page-intro pb-16 md:pb-20"
      >
        <header className="mb-6 text-center md:mb-12">
          <h1 className="text-page-title mb-3 text-balance md:mb-4">Rendezvous {year} schedule</h1>
          {draftNotice ? (
            <p className="schedule-draft-notice" role="note">
              <span aria-hidden="true">⚠</span>
              <span>{draftNotice}</span>
            </p>
          ) : null}
          <p className="text-lead text-muted-foreground">{dateRangeLabel}</p>
          <p className="mt-1 text-balance text-sm text-muted-foreground md:text-base">
            {location}
          </p>
          <div className="mt-5 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            <Button type="button" onClick={() => setShowMap(true)} className="h-11 gap-2">
              <Map className="h-4 w-4" aria-hidden="true" />
              View venue map
            </Button>
            <Button variant="outline" asChild className="h-11 gap-2 border-primary/25">
              <Link href="/schedule/print">
                <Printer className="h-4 w-4" aria-hidden="true" />
                Download PDF
              </Link>
            </Button>
          </div>
        </header>

        {showMap && (
          <div
            className="z-layer-modal-backdrop fixed inset-0 flex flex-col items-center justify-center bg-foreground/60 p-3 md:p-6"
            role="presentation"
            onClick={closeMap}
          >
            <div
              ref={mapDialogRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="venue-map-title"
              className="relative z-layer-modal flex w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-primary/15 bg-background shadow-md"
              style={{ height: "min(85dvh, 600px)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
                <h2 id="venue-map-title" className="text-sm font-semibold">
                  Lake Williamson venue map
                </h2>
                <button
                  type="button"
                  onClick={closeMap}
                  className="focus-ring touch-target rounded-md p-2 transition-colors hover:bg-secondary active:bg-secondary"
                  aria-label="Close map"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
              {/* Map fills remaining space exactly */}
              <div className="flex-1 min-h-0">
                <ScheduleMap highlightedLocationId={highlightedLocation} onClose={closeMap} />
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
          <aside className="site-sticky-top shrink-0 lg:sticky lg:w-64">
            <nav
              aria-label="Jump to day"
              className="schedule-day-nav grid grid-cols-2 justify-items-stretch gap-2 rounded-xl border border-primary/15 bg-card p-3 sm:grid-cols-5 lg:flex lg:flex-col lg:gap-2 lg:p-4"
            >
              {days.map((day) => {
                const dayId = day.day.toLowerCase()
                const isActive = activeDay === dayId
                const weekday = displayWeekday(day)
                return (
                  <a
                    key={dayId}
                    href={`#${dayId}`}
                    onClick={(e) => handleDayClick(e, dayId)}
                    aria-current={isActive ? "location" : undefined}
                    className={`focus-ring flex min-h-11 flex-col items-center gap-2 rounded-lg p-3 transition-colors hover:bg-surface-highlight active:bg-surface-highlight lg:flex-row lg:gap-3 ${
                      isActive ? "bg-surface-highlight ring-1 ring-primary/25" : ""
                    }`}
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground lg:h-10 lg:w-10">
                      {dayLetter(day)}
                    </div>
                    <span className="text-xs font-medium lg:text-sm lg:whitespace-nowrap">
                      {day.dateLabel}
                      <span className="hidden text-muted-foreground lg:inline"> · {weekday}</span>
                    </span>
                  </a>
                )
              })}
            </nav>
          </aside>

          <div className="flex-1 space-y-6 lg:space-y-8">
            {days.map((day) => (
              <section key={day.day} id={day.day.toLowerCase()} className={sectionClass}>
                <div className="mb-4 flex items-center gap-2 md:mb-6 md:gap-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full text-base font-bold md:h-12 md:w-12 md:text-lg ${
                      DAY_BADGE_CLASSES[day.color] ?? DAY_BADGE_CLASSES.primary
                    }`}
                  >
                    {dayLetter(day)}
                  </div>
                  <h2 className="text-day-title">
                    {day.dateLabel} ({displayWeekday(day)})
                  </h2>
                </div>
                <dl className="space-y-4 md:space-y-6">
                  {day.events.map((event, index) => (
                    <ScheduleEventRow
                      key={`${day.day}-${index}`}
                      event={event}
                      date={day.date}
                      onShowMap={showMapWithLocation}
                    />
                  ))}
                </dl>
              </section>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <SiteFooter />
    </div>
    </ScheduleDataProvider>
  )
}
