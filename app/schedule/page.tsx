"use client"

import type React from "react"
import { Users, Map, X, Printer } from "lucide-react"
import Link from "next/link"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { useState, useRef, useCallback } from "react"
import { useFocusTrap } from "@/lib/use-focus-trap"
import { Button } from "@/components/ui/button"
import { VolunteerSchedule } from "@/components/volunteer-schedule"
import { InlineWeather } from "@/components/weather-forecast"
import { ScheduleMap } from "@/components/schedule-map"
import { LocationLink } from "@/components/location-link"
import { MealMenu } from "@/components/meal-menu"

const scheduleDays = [
  { id: "monday", label: "Monday", letter: "M" },
  { id: "tuesday", label: "Tuesday", letter: "T" },
  { id: "wednesday", label: "Wednesday", letter: "W" },
  { id: "thursday", label: "Thursday", letter: "Th" },
  { id: "friday", label: "Friday", letter: "F" },
] as const

const sectionClass =
  "scroll-mt-[calc(5rem+env(safe-area-inset-top,0px))] rounded-xl border border-primary/15 bg-card p-4 md:p-6"
const eventClass = "rounded-lg border border-border/60 bg-surface-tint/50 p-3 md:p-4"

export default function SchedulePage() {
  const [activeDay, setActiveDay] = useState<string>("")
  const [showMap, setShowMap] = useState(false)
  const [highlightedLocation, setHighlightedLocation] = useState<string | null>(null)
  const mapDialogRef = useRef<HTMLDivElement>(null)

  const showMapWithLocation = (locationId: string) => {
    setHighlightedLocation(locationId)
    setShowMap(true)
  }

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
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main
        id="main-content"
        className="site-container section-sm pb-16 pt-[calc(5.5rem+env(safe-area-inset-top,0px))] md:pb-20"
      >
        <header className="mb-8 text-center md:mb-12">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-warning/30 bg-surface-warm px-4 py-2 text-sm font-medium text-warning">
            Based on the 2026 schedule — may change slightly for 2027
          </p>
          <h1 className="text-page-title mb-3 text-balance md:mb-4">Rendezvous 2027 schedule</h1>
          <p className="text-lead text-muted-foreground">May 3–7, 2027</p>
          <p className="mt-1 text-balance text-sm text-muted-foreground md:text-base">
            Lake Williamson Christian Center, Carlinville, IL
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
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-foreground/60 p-3 md:p-6"
            role="presentation"
            onClick={closeMap}
          >
            <div
              ref={mapDialogRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="venue-map-title"
              className="relative flex w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-primary/15 bg-background shadow-xl"
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
          <aside className="shrink-0 lg:sticky lg:top-[calc(5.5rem+env(safe-area-inset-top,0px))] lg:w-64">
            <nav
              aria-label="Jump to day"
              className="grid grid-cols-2 justify-items-stretch gap-2 rounded-xl border border-primary/15 bg-card p-3 md:grid-cols-5 lg:flex lg:flex-col lg:gap-2 lg:p-4"
            >
              {scheduleDays.map((day) => {
                const isActive = activeDay === day.id
                return (
                  <a
                    key={day.id}
                    href={`#${day.id}`}
                    onClick={(e) => handleDayClick(e, day.id)}
                    aria-current={isActive ? "location" : undefined}
                    className={`focus-ring flex min-h-11 flex-col items-center gap-2 rounded-lg p-3 transition-colors hover:bg-surface-highlight active:bg-surface-highlight lg:flex-row lg:gap-3 ${
                      isActive ? "bg-surface-highlight ring-2 ring-primary/40" : ""
                    }`}
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground lg:h-10 lg:w-10">
                      {day.letter}
                    </div>
                    <span className="text-xs font-medium lg:text-sm lg:whitespace-nowrap">{day.label}</span>
                  </a>
                )
              })}
            </nav>
          </aside>

          <div className="flex-1 space-y-6 lg:space-y-8">
            {/* Monday */}
            <section
              id="monday"
              className={sectionClass}
            >
              <div className="mb-4 flex items-center gap-2 md:mb-6 md:gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-base font-bold text-secondary-foreground md:h-12 md:w-12 md:text-lg">
                  M
                </div>
                <h2 className="font-display text-xl font-bold md:text-2xl">May 3 (Monday)</h2>
              </div>
              <dl className="space-y-4 md:space-y-6">
                <div className={eventClass}>
                  <dt className="mb-2 text-sm font-semibold text-primary md:text-base">1:00 – 5:15 PM</dt>
                  <dd className="text-sm leading-relaxed text-muted-foreground md:text-base">
                    Check-in at <LocationLink locationId="activities-center" onShowMap={showMapWithLocation}>Activity Center (AC)</LocationLink> [upstairs outside Room 207] [mini-fridge available in AC Room 205]
                    <br />
                    [Use this time for setting up RVs & tents, settling into motel rooms, and for visiting]
                  </dd>
                </div>
                <div className={eventClass}>
                  <dt className="mb-2 text-sm font-semibold text-primary md:text-base">4:00 – 5:00 PM</dt>
                  <dd className="text-sm leading-relaxed text-muted-foreground md:text-base">
                    Ice Breaker in <LocationLink locationId="activities-center" onShowMap={showMapWithLocation}>AC Room 205/206</LocationLink>
                  </dd>
                </div>
                <div className={eventClass}>
                  <dt className="mb-2 text-sm font-semibold text-primary md:text-base">5:30 PM</dt>
                  <dd className="text-sm leading-relaxed text-muted-foreground md:text-base">
                    Dinner at the <LocationLink locationId="lakeside-dining" onShowMap={showMapWithLocation}>Lakeside Dining Room</LocationLink> (please gather outside for a prayer prior to each designated meal
                    time)
                    <MealMenu date="2027-05-03" mealType="dinner" />
                  </dd>
                </div>
                <div className={eventClass}>
                  <dt className="mb-2 text-sm font-semibold text-primary md:text-base">7:00 PM</dt>
                  <dd className="text-sm leading-relaxed text-muted-foreground md:text-base">
                    Evening assembly, welcome, family introductions, & announcements in <LocationLink locationId="activities-center" onShowMap={showMapWithLocation}>AC Room 207</LocationLink>
                    <VolunteerSchedule date="2027-05-03" timeSlot="Evening Devotion" />
                  </dd>
                </div>
                <div className={eventClass}>
                  <dt className="mb-3 text-sm font-semibold text-primary md:text-base">
                    Evening activities or free time at the <LocationLink locationId="activities-center" onShowMap={showMapWithLocation}>Activity Center</LocationLink>:
                  </dt>
                  <dd className="ml-4 space-y-2 text-sm leading-relaxed text-muted-foreground md:space-y-3 md:text-base">
                    <p>
                      <span className="font-semibold text-foreground">8:00 PM</span> Black-light* Dodgeball,
                      Bombardment, & Steal the Bacon
                    </p>
                    <p>
                      <span className="font-semibold text-foreground">9:00 PM</span> Nine Square & Knockout
                    </p>
                    <p className="text-xs italic md:text-sm">
                      *It is recommended small children (under age 10) wear light colored clothing to be easily seen
                      (and not "run over" by teens and adults)
                    </p>
                  </dd>
                </div>
              </dl>
            </section>

            {/* Tuesday */}
            <section
              id="tuesday"
              className={sectionClass}
            >
              <div className="mb-4 flex items-center gap-2 md:mb-6 md:gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full text-base font-bold text-primary-foreground md:h-12 md:w-12 md:text-lg bg-primary">
                  T
                </div>
                <h2 className="font-display text-xl font-bold md:text-2xl">May 4 (Tuesday)</h2>
              </div>
              <dl className="space-y-4 md:space-y-6">
                <div className={eventClass}>
                  <dt className="mb-2 text-sm font-semibold text-primary md:text-base">7:30 AM</dt>
                  <dd className="text-sm leading-relaxed text-muted-foreground md:text-base">
                    Breakfast at the <LocationLink locationId="lakeside-dining" onShowMap={showMapWithLocation}>Lakeside Dining Room</LocationLink>
                    <MealMenu date="2027-05-04" mealType="breakfast" />
                  </dd>
                </div>
                <div className={eventClass}>
                  <dt className="mb-2 text-sm font-semibold text-primary md:text-base">9:00 AM</dt>
                  <dd className="text-sm leading-relaxed text-muted-foreground md:text-base">
                    Morning assembly & announcements in <LocationLink locationId="activities-center" onShowMap={showMapWithLocation}>AC Room 207</LocationLink>
                    <VolunteerSchedule date="2027-05-04" timeSlot="Morning Devotion" />
                  </dd>
                </div>
                <div className={eventClass}>
                  <dt className="mb-2 text-sm font-semibold text-primary md:text-base">10:00 AM</dt>
                  <dd className="text-sm leading-relaxed text-muted-foreground md:text-base">
                    Young Adult session at the <LocationLink locationId="activities-center" onShowMap={showMapWithLocation}>Activity Center</LocationLink> (non-parent graduates; meet in Ping Pong Room)
                    <br />
                    Mom&apos;s session in <LocationLink locationId="activities-center" onShowMap={showMapWithLocation}>AC Room 207</LocationLink> (free time for everyone else; black-light activities & nine square)
                  </dd>
                </div>
                <div className={eventClass}>
                  <dt className="mb-2 text-sm font-semibold text-primary md:text-base">10:00 AM – 11:30 AM</dt>
                  <dd className="text-sm leading-relaxed text-muted-foreground md:text-base">
                    <span className="inline-flex items-center gap-1">
                      Miniature Painting at the <LocationLink locationId="activities-center" onShowMap={showMapWithLocation}>Activity Center</LocationLink>
                      <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">Pre-registration required</span>
                    </span>
                  </dd>
                </div>
                <div className={eventClass}>
                  <dt className="mb-2 text-sm font-semibold text-primary md:text-base">12:00 PM</dt>
                  <dd className="text-sm leading-relaxed text-muted-foreground md:text-base">
                    Lunch at the <LocationLink locationId="lakeside-dining" onShowMap={showMapWithLocation}>Lakeside Dining Room</LocationLink>
                    <MealMenu date="2027-05-04" mealType="lunch" />
                  </dd>
                </div>
                <div className={eventClass}>
                  <dt className="mb-3 text-sm font-semibold text-primary md:text-base flex items-center flex-wrap gap-2">
                    Outside afternoon activities (weather permitting) or free time:
                    <InlineWeather date="2027-05-04" hour={14} />
                  </dt>
                  <dd className="ml-4 space-y-2 text-sm leading-relaxed text-muted-foreground md:space-y-3 md:text-base">
                    <p>
                      <span className="font-semibold text-foreground">1:30 PM</span> <LocationLink locationId="archery" onShowMap={showMapWithLocation}>Archery</LocationLink>, Obstacle course, & rope
                      games (Tug of War / Kajabe Cancan / Hoosker Doosker)
                    </p>
                    <p>
                      <span className="font-semibold text-foreground">3:30 PM</span> Kids&apos; movie in <LocationLink locationId="activities-center" onShowMap={showMapWithLocation}>AC Room 207</LocationLink>
                    </p>
                    <p>
                      <span className="font-semibold text-foreground">3:30 PM</span> <LocationLink locationId="human-foosball" onShowMap={showMapWithLocation}>Human Foosball</LocationLink>
                    </p>
                  </dd>
                </div>
                <div className={eventClass}>
                  <dt className="mb-2 text-sm font-semibold text-primary md:text-base">5:30 PM</dt>
                  <dd className="text-sm leading-relaxed text-muted-foreground md:text-base">
                    Dinner at the <LocationLink locationId="lakeside-dining" onShowMap={showMapWithLocation}>Lakeside Dining Room</LocationLink>
                    <MealMenu date="2027-05-04" mealType="dinner" />
                  </dd>
                </div>
                <div className={eventClass}>
                  <dt className="mb-2 text-sm font-semibold text-primary md:text-base">7:00 PM</dt>
                  <dd className="text-sm leading-relaxed text-muted-foreground md:text-base">
                    Evening assembly & announcements in <LocationLink locationId="activities-center" onShowMap={showMapWithLocation}>AC Room 207</LocationLink>
                    <VolunteerSchedule date="2027-05-04" timeSlot="Evening Devotion" />
                  </dd>
                </div>
                <div className={eventClass}>
                  <dt className="mb-3 text-sm font-semibold text-primary md:text-base">
                    Evening activities or free time at the <LocationLink locationId="activities-center" onShowMap={showMapWithLocation}>Activity Center</LocationLink>:
                  </dt>
                  <dd className="ml-4 space-y-2 text-sm leading-relaxed text-muted-foreground md:space-y-3 md:text-base">
                    <p>
                      <span className="font-semibold text-foreground">8:00 PM</span> Main gym time & table games
                    </p>
                    <p>
                      <span className="font-semibold text-foreground">8:00 – 10:00 PM</span> Indoor pool time for
                      females (with female lifeguard) – bring your own towel from home
                    </p>
                  </dd>
                </div>
              </dl>
            </section>

            {/* Wednesday */}
            <section
              id="wednesday"
              className={sectionClass}
            >
              <div className="mb-4 flex items-center gap-2 md:mb-6 md:gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-foreground text-base font-bold text-background md:h-12 md:w-12 md:text-lg">
                  W
                </div>
                <h2 className="font-display text-xl font-bold md:text-2xl">May 5 (Wednesday)</h2>
              </div>
              <dl className="space-y-4 md:space-y-6">
                <div className={eventClass}>
                  <dt className="mb-2 text-sm font-semibold text-primary md:text-base">7:30 AM</dt>
                  <dd className="text-sm leading-relaxed text-muted-foreground md:text-base">
                    Breakfast at the <LocationLink locationId="lakeside-dining" onShowMap={showMapWithLocation}>Lakeside Dining Room</LocationLink>
                    <MealMenu date="2027-05-05" mealType="breakfast" />
                  </dd>
                </div>
                <div className={eventClass}>
                  <dt className="mb-2 text-sm font-semibold text-primary md:text-base">9:00 AM</dt>
                  <dd className="text-sm leading-relaxed text-muted-foreground md:text-base">
                    Morning assembly, group picture, & announcements in <LocationLink locationId="activities-center" onShowMap={showMapWithLocation}>AC Room 207</LocationLink>
                    <VolunteerSchedule date="2027-05-05" timeSlot="Morning Devotion" />
                  </dd>
                </div>
                <div className={eventClass}>
                  <dt className="mb-2 text-sm font-semibold text-primary md:text-base">10:00 AM</dt>
                  <dd className="text-sm leading-relaxed text-muted-foreground md:text-base">
                    Dad&apos;s session in <LocationLink locationId="activities-center" onShowMap={showMapWithLocation}>AC Room 207</LocationLink> (free time for everyone else; black-light activities & nine square)
                  </dd>
                </div>
                <div className={eventClass}>
                  <dt className="mb-2 text-sm font-semibold text-primary md:text-base">12:00 PM</dt>
                  <dd className="text-sm leading-relaxed text-muted-foreground md:text-base">
                    Lunch at the <LocationLink locationId="lakeside-dining" onShowMap={showMapWithLocation}>Lakeside Dining Room</LocationLink>
                    <MealMenu date="2027-05-05" mealType="lunch" />
                  </dd>
                </div>
                <div className={eventClass}>
                  <dt className="mb-3 text-sm font-semibold text-primary md:text-base flex items-center flex-wrap gap-2">
                    Outside afternoon activities (weather permitting) or free time:
                    <InlineWeather date="2027-05-05" hour={14} />
                  </dt>
                  <dd className="ml-4 space-y-2 text-sm leading-relaxed text-muted-foreground md:space-y-3 md:text-base">
                    <p>
                      <span className="font-semibold text-foreground">1:30 PM</span> <LocationLink locationId="rec-field-kickball" onShowMap={showMapWithLocation}>Kickball</LocationLink>
                    </p>
                    <p>
                      <span className="font-semibold text-foreground">2:30 PM</span> Gaga Ball Tournament
                    </p>
                    <p>
                      <span className="font-semibold text-foreground">2:30 PM</span> <a href="/scrabble" className="focus-ring rounded-sm text-primary hover:underline">Scrabble tournament</a> in <LocationLink locationId="activities-center" onShowMap={showMapWithLocation}>AC Room 205/206</LocationLink>
                    </p>
                    <p>
                      <span className="font-semibold text-foreground">3:30 PM</span> Kids&apos; movie & craft (Painting rocks) in <LocationLink locationId="activities-center" onShowMap={showMapWithLocation}>AC Room 207</LocationLink>
                    </p>
                    <p>
                      <span className="font-semibold text-foreground">3:30 PM</span> <LocationLink locationId="disc-golf" onShowMap={showMapWithLocation}>Disc golf</LocationLink> (begins behind <LocationLink locationId="activities-center" onShowMap={showMapWithLocation}>Activity Center</LocationLink>)
                    </p>
                  </dd>
                </div>
                <div className={eventClass}>
                  <dt className="mb-2 text-sm font-semibold text-primary md:text-base">5:30 PM</dt>
                  <dd className="text-sm leading-relaxed text-muted-foreground md:text-base">
                    Dinner at the <LocationLink locationId="lakeside-dining" onShowMap={showMapWithLocation}>Lakeside Dining Room</LocationLink>
                    <MealMenu date="2027-05-05" mealType="dinner" />
                  </dd>
                </div>
                <div className={eventClass}>
                  <dt className="mb-2 text-sm font-semibold text-primary md:text-base">7:00 PM</dt>
                  <dd className="text-sm leading-relaxed text-muted-foreground md:text-base">
                    Evening assembly & announcements in <LocationLink locationId="activities-center" onShowMap={showMapWithLocation}>Room 207 at the Activity Center</LocationLink>
                    <VolunteerSchedule date="2027-05-05" timeSlot="Evening Devotion" />
                  </dd>
                </div>
                <div className={eventClass}>
                  <dt className="mb-3 text-sm font-semibold text-primary md:text-base">
                    Evening activities or free time at the <LocationLink locationId="activities-center" onShowMap={showMapWithLocation}>Activity Center</LocationLink>:
                  </dt>
                  <dd className="ml-4 space-y-2 text-sm leading-relaxed text-muted-foreground md:space-y-3 md:text-base">
                    <p>
                      <span className="font-semibold text-foreground">8:00 PM</span> Main gym time & table games
                    </p>
                    <p>
                      <span className="font-semibold text-foreground">8:00 – 10:00 PM</span> Indoor pool time for males
                      (with male lifeguard) – bring your own towel from home
                    </p>
                  </dd>
                </div>
              </dl>
            </section>

            {/* Thursday */}
            <section
              id="thursday"
              className={sectionClass}
            >
              <div className="mb-4 flex items-center gap-2 md:mb-6 md:gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full text-base font-bold text-primary-foreground md:h-12 md:w-12 md:text-lg bg-primary">
                  Th
                </div>
                <h2 className="font-display text-xl font-bold md:text-2xl">May 6 (Thursday)</h2>
              </div>
              <dl className="space-y-4 md:space-y-6">
                <div className={eventClass}>
                  <dt className="mb-2 text-sm font-semibold text-primary md:text-base">7:30 AM</dt>
                  <dd className="text-sm leading-relaxed text-muted-foreground md:text-base">
                    Breakfast at the <LocationLink locationId="lakeside-dining" onShowMap={showMapWithLocation}>Lakeside Dining Room</LocationLink>
                    <MealMenu date="2027-05-06" mealType="breakfast" />
                  </dd>
                </div>
                <div className={eventClass}>
                  <dt className="mb-2 text-sm font-semibold text-primary md:text-base">9:00 AM</dt>
                  <dd className="text-sm leading-relaxed text-muted-foreground md:text-base">
                    Morning assembly & announcements in <LocationLink locationId="activities-center" onShowMap={showMapWithLocation}>AC Room 207</LocationLink>
                    <VolunteerSchedule date="2027-05-06" timeSlot="Morning Devotion" />
                  </dd>
                </div>
                <div className={eventClass}>
                  <dt className="mb-2 text-sm font-semibold text-primary md:text-base">10:00 AM</dt>
                  <dd className="text-sm leading-relaxed text-muted-foreground md:text-base">
                    Bible bowl (everyone is encouraged to participate:{" "}
                    <a href="/biblebowl" className="focus-ring inline-flex items-center gap-1 rounded-sm text-primary hover:underline">
                      Bible Bowl info
                      <Users className="h-3 w-3" />
                    </a>
                    )
                  </dd>
                </div>
                <div className={eventClass}>
                  <dt className="mb-2 text-sm font-semibold text-primary md:text-base">10:20 AM</dt>
                  <dd className="text-sm leading-relaxed text-muted-foreground md:text-base">
                    Ping Pong tournament at the <LocationLink locationId="activities-center" onShowMap={showMapWithLocation}>Activity Center</LocationLink>
                  </dd>
                </div>
                <div className={eventClass}>
                  <dt className="mb-2 text-sm font-semibold text-primary md:text-base">12:00 PM</dt>
                  <dd className="text-sm leading-relaxed text-muted-foreground md:text-base">
                    Lunch at the <LocationLink locationId="lakeside-dining" onShowMap={showMapWithLocation}>Lakeside Dining Room</LocationLink>
                    <MealMenu date="2027-05-06" mealType="lunch" />
                  </dd>
                </div>
                <div className={eventClass}>
                  <dt className="mb-3 text-sm font-semibold text-primary md:text-base flex items-center flex-wrap gap-2">
                    Outside afternoon activities (weather permitting) or free time:
                    <InlineWeather date="2027-05-06" hour={14} />
                  </dt>
                  <dd className="ml-4 space-y-2 text-sm leading-relaxed text-muted-foreground md:space-y-3 md:text-base">
                    <p>
                      <span className="font-semibold text-foreground">1:30 – 3:30 PM</span> Paddle boats & canoes at the beachfront
                    </p>

                    <p>
                      <span className="font-semibold text-foreground">3:30 PM</span> Kids&apos; movie in <LocationLink locationId="activities-center" onShowMap={showMapWithLocation}>AC Room 207</LocationLink>
                    </p>
                    <p>
                      <span className="font-semibold text-foreground">3:30 PM</span> Billiards & air hockey tournaments
                      at the <LocationLink locationId="activities-center" onShowMap={showMapWithLocation}>Activity Center</LocationLink> [if needed, finish up any other tourneys]
                    </p>
                    <p>
                      <span className="font-semibold text-foreground">3:00 – 5:00 PM</span> Miniature Painting
                      <span className="ml-1 text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">Pre-registration required</span>
                    </p>
                  </dd>
                </div>
                <div className={eventClass}>
                  <dt className="mb-2 text-sm font-semibold text-primary md:text-base flex items-center flex-wrap gap-2">
                    5:30 PM
                    <InlineWeather date="2027-05-06" hour={17} />
                  </dt>
                  <dd className="text-sm leading-relaxed text-muted-foreground md:text-base">
                    Cookout by the lake (weather permitting)
                    <MealMenu date="2027-05-06" mealType="dinner" />
                  </dd>
                </div>
                <div className={eventClass}>
                  <dt className="mb-2 text-sm font-semibold text-primary md:text-base flex items-center flex-wrap gap-2">
                    6:30 PM
                    <InlineWeather date="2027-05-06" hour={18} />
                  </dt>
                  <dd className="text-sm leading-relaxed text-muted-foreground md:text-base">
                    Hayrides (starting by the lake)
                  </dd>
                </div>
                <div className={eventClass}>
                  <dt className="mb-2 text-sm font-semibold text-primary md:text-base flex items-center flex-wrap gap-2">
                    7:00 PM
                    <InlineWeather date="2027-05-06" hour={19} />
                  </dt>
                  <dd className="text-sm leading-relaxed text-muted-foreground md:text-base">
                    Evening assembly & announcements at the <LocationLink locationId="bonfire-site" onShowMap={showMapWithLocation}>bonfire</LocationLink> [no song books or projector]
                    <VolunteerSchedule date="2027-05-06" timeSlot="Evening Devotion" />
                  </dd>
                </div>
                <div className={eventClass}>
                  <dt className="mb-3 text-sm font-semibold text-primary md:text-base flex items-center flex-wrap gap-2">
                    Evening activities or free time at the <LocationLink locationId="activities-center" onShowMap={showMapWithLocation}>Activity Center</LocationLink>:
                    <InlineWeather date="2027-05-06" hour={20} />
                  </dt>
                  <dd className="ml-4 space-y-2 text-sm leading-relaxed text-muted-foreground md:space-y-3 md:text-base">
                    <p>
                      <span className="font-semibold text-foreground">8:00 PM</span> Glow-in-the-Dark <LocationLink locationId="rec-field-kickball" onShowMap={showMapWithLocation}>Capture the Flag</LocationLink>
                      [2 simultaneous games]
                    </p>
                    <p>
                      <span className="font-semibold text-foreground">9:00 PM</span> Adult/Teen Volleyball
                    </p>
                    <p>
                      <span className="font-semibold text-foreground">10:00 PM</span> Racquetball Court Singing
                    </p>
                  </dd>
                </div>
              </dl>
            </section>

            {/* Friday */}
            <section
              id="friday"
              className={sectionClass}
            >
              <div className="mb-4 flex items-center gap-2 md:mb-6 md:gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-base font-bold text-secondary-foreground md:h-12 md:w-12 md:text-lg">
                  F
                </div>
                <h2 className="font-display text-xl font-bold md:text-2xl">May 7 (Friday)</h2>
              </div>
              <dl className="space-y-4 md:space-y-6">
                <div className={eventClass}>
                  <dt className="mb-2 text-sm font-semibold text-primary md:text-base">7:30 AM</dt>
                  <dd className="text-sm leading-relaxed text-muted-foreground md:text-base">
                    Breakfast at the <LocationLink locationId="lakeside-dining" onShowMap={showMapWithLocation}>Lakeside Dining Room</LocationLink>
                    <MealMenu date="2027-05-07" mealType="breakfast" />
                  </dd>
                </div>
                <div className={eventClass}>
                  <dt className="mb-2 text-sm font-semibold text-primary md:text-base">9:00 AM</dt>
                  <dd className="text-sm leading-relaxed text-muted-foreground md:text-base">
                    Morning assembly, Bible bowl awards, & brainstorming for next year in <LocationLink locationId="activities-center" onShowMap={showMapWithLocation}>AC Room 207</LocationLink>
                    <VolunteerSchedule date="2027-05-07" timeSlot="Morning Devotion" />
                  </dd>
                </div>
                <div className={eventClass}>
                  <dt className="mb-2 text-sm font-semibold text-primary md:text-base">10:30 AM</dt>
                  <dd className="text-sm leading-relaxed text-muted-foreground md:text-base">
                    Pack up & clean up lodging areas (return motel keys to our meeting room by 11:30 AM)
                  </dd>
                </div>
                <div className={eventClass}>
                  <dt className="mb-2 text-sm font-semibold text-primary md:text-base">12:00 PM</dt>
                  <dd className="text-sm leading-relaxed text-muted-foreground md:text-base">
                    Lunch at the Lakeside Dining Room & then depart for home
                    <MealMenu date="2027-05-07" mealType="lunch" />
                  </dd>
                </div>
              </dl>
            </section>

            {/* Plan B */}
          </div>
        </div>
      </main>

      {/* Footer */}
      <SiteFooter />
    </div>
  )
}
