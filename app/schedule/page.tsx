"use client"

import type React from "react"
import { Users, Map, X, Printer } from "lucide-react"
import Link from "next/link"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { useState } from "react"
import { NowNextSchedule } from "@/components/now-next-schedule"
import { VolunteerSchedule } from "@/components/volunteer-schedule"
import { InlineWeather } from "@/components/weather-forecast"
import { ScheduleMap } from "@/components/schedule-map"
import { LocationLink } from "@/components/location-link"
import { ScheduleAnnouncements } from "@/components/schedule-announcements"
import { MealMenu } from "@/components/meal-menu"

export default function SchedulePage() {
  const [activeDay, setActiveDay] = useState<string>("")
  const [showMap, setShowMap] = useState(false)
  const [highlightedLocation, setHighlightedLocation] = useState<string | null>(null)

  const showMapWithLocation = (locationId: string) => {
    setHighlightedLocation(locationId)
    setShowMap(true)
  }

  const handleDayClick = (e: React.MouseEvent<HTMLAnchorElement>, day: string) => {
    e.preventDefault()
    setActiveDay(day)

    setTimeout(() => {
      const element = document.getElementById(day)
      if (element) {
        const offset = 100
        const elementPosition = element.getBoundingClientRect().top
        const offsetPosition = elementPosition + window.pageYOffset - offset

        window.scrollTo({
          top: offsetPosition,
          behavior: "smooth",
        })
      }
    }, 100)
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main className="container mx-auto px-4 py-8 md:py-12">
        <div className="mb-8 space-y-4">
          <ScheduleAnnouncements />
          <NowNextSchedule />
        </div>

        <div className="mb-8 text-center md:mb-12">
          <h1 className="mb-3 text-balance text-3xl font-bold tracking-tight text-foreground md:mb-4 md:text-5xl">
            Rendezvous 2026 Schedule
          </h1>
          <p className="text-balance text-base text-muted-foreground md:text-lg">May 4-8, 2026</p>
          <p className="text-balance text-sm text-muted-foreground md:text-base">
            Lake Williamson Christian Center, Carlinville, IL
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => setShowMap(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Map className="h-4 w-4" />
              View Venue Map
            </button>
            <Link
              href="/schedule/print"
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
            >
              <Printer className="h-4 w-4" />
              Download PDF
            </Link>
          </div>
        </div>

        {/* Map Modal */}
        {showMap && (
          <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/60 p-3 md:p-6">
            <div className="relative w-full max-w-4xl flex flex-col bg-background rounded-xl overflow-hidden shadow-2xl" style={{ height: "min(85vh, 600px)" }}>
              {/* Thin title bar */}
              <div className="flex items-center justify-between px-4 py-2.5 border-b shrink-0">
                <h2 className="font-semibold text-sm">Lake Williamson Venue Map</h2>
                <button
                  onClick={() => { setShowMap(false); setHighlightedLocation(null) }}
                  className="p-2 hover:bg-muted rounded-md transition-colors touch-manipulation"
                  aria-label="Close map"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              {/* Map fills remaining space exactly */}
              <div className="flex-1 min-h-0">
                <ScheduleMap
                  highlightedLocationId={highlightedLocation}
                  onClose={() => { setShowMap(false); setHighlightedLocation(null) }}
                />
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
          <aside className="lg:sticky lg:top-24 lg:w-64 shrink-0">
            <nav className="grid grid-cols-2 gap-2 rounded-xl border bg-card p-3 md:grid-cols-5 lg:flex lg:flex-col lg:gap-2 lg:p-4 justify-items-center">
              <a
                href="#monday"
                onClick={(e) => handleDayClick(e, "monday")}
                className={`flex flex-col items-center gap-2 rounded-lg p-3 transition-all hover:bg-secondary/10 lg:flex-row lg:gap-3 ${
                  activeDay === "monday" ? "bg-secondary/20 ring-2 ring-secondary" : ""
                }`}
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-secondary text-base font-bold text-secondary-foreground lg:h-10 lg:w-10 lg:text-sm">
                  M
                </div>
                <span className="text-xs font-medium lg:text-sm lg:whitespace-nowrap">Monday</span>
              </a>
              <a
                href="#tuesday"
                onClick={(e) => handleDayClick(e, "tuesday")}
                className={`flex flex-col items-center gap-2 rounded-lg p-3 transition-all hover:bg-primary/10 lg:flex-row lg:gap-3 ${
                  activeDay === "tuesday" ? "bg-primary/20 ring-2 ring-primary" : ""
                }`}
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-base font-bold text-primary-foreground lg:h-10 lg:w-10 lg:text-sm bg-[rgba(18,27,41,1)]">
                  T
                </div>
                <span className="text-xs font-medium lg:text-sm lg:whitespace-nowrap">Tuesday</span>
              </a>
              <a
                href="#wednesday"
                onClick={(e) => handleDayClick(e, "wednesday")}
                className={`flex flex-col items-center gap-2 rounded-lg p-3 transition-all hover:bg-foreground/10 lg:flex-row lg:gap-3 ${
                  activeDay === "wednesday" ? "bg-foreground/20 ring-2 ring-foreground" : ""
                }`}
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-foreground text-base font-bold text-background lg:h-10 lg:w-10 lg:text-sm">
                  W
                </div>
                <span className="text-xs font-medium lg:text-sm lg:whitespace-nowrap">Wednesday</span>
              </a>
              <a
                href="#thursday"
                onClick={(e) => handleDayClick(e, "thursday")}
                className={`flex flex-col items-center gap-2 rounded-lg p-3 transition-all hover:bg-primary/10 lg:flex-row lg:gap-3 ${
                  activeDay === "thursday" ? "bg-primary/20 ring-2 ring-primary" : ""
                }`}
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-base font-bold text-primary-foreground lg:h-10 lg:w-10 lg:text-sm bg-[rgba(18,27,41,1)]">
                  T
                </div>
                <span className="text-xs font-medium lg:text-sm lg:whitespace-nowrap">Thursday</span>
              </a>
              <a
                href="#friday"
                onClick={(e) => handleDayClick(e, "friday")}
                className={`flex flex-col items-center gap-2 rounded-lg p-3 transition-all hover:bg-secondary/10 lg:flex-row lg:gap-3 ${
                  activeDay === "friday" ? "bg-secondary/20 ring-2 ring-secondary" : ""
                }`}
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-secondary text-base font-bold text-secondary-foreground lg:h-10 lg:w-10 lg:text-sm">
                  F
                </div>
                <span className="text-xs font-medium lg:text-sm lg:whitespace-nowrap">Friday</span>
              </a>
            </nav>
          </aside>

          <div className="flex-1 space-y-6 lg:space-y-8">
            {/* Monday */}
            <section
              id="monday"
              className="scroll-mt-24 rounded-xl border-2 border-secondary/20 bg-card p-4 shadow-sm md:p-6"
            >
              <div className="mb-4 flex items-center gap-2 md:mb-6 md:gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-base font-bold text-secondary-foreground md:h-12 md:w-12 md:text-lg">
                  M
                </div>
                <h2 className="text-xl font-bold md:text-2xl">May 4 (Monday)</h2>
              </div>
              <dl className="space-y-4 md:space-y-6">
                <div className="rounded-lg border border-border/50 bg-background/50 p-3 md:p-4">
                  <dt className="mb-2 text-sm font-semibold text-primary md:text-base">1:00 – 5:15 PM</dt>
                  <dd className="text-sm leading-relaxed text-muted-foreground md:text-base">
                    Check-in at <LocationLink locationId="activities-center" onShowMap={showMapWithLocation}>Activity Center (AC)</LocationLink> [upstairs outside Room 207] [mini-fridge available in AC Room 205]
                    <br />
                    [Use this time for setting up RVs & tents, settling into motel rooms, and for visiting]
                  </dd>
                </div>
                <div className="rounded-lg border border-border/50 bg-background/50 p-3 md:p-4">
                  <dt className="mb-2 text-sm font-semibold text-primary md:text-base">4:00 – 5:00 PM</dt>
                  <dd className="text-sm leading-relaxed text-muted-foreground md:text-base">
                    Ice Breaker in <LocationLink locationId="activities-center" onShowMap={showMapWithLocation}>AC Room 205/206</LocationLink>
                  </dd>
                </div>
                <div className="rounded-lg border border-border/50 bg-background/50 p-3 md:p-4">
                  <dt className="mb-2 text-sm font-semibold text-primary md:text-base">5:30 PM</dt>
                  <dd className="text-sm leading-relaxed text-muted-foreground md:text-base">
                    Dinner at the <LocationLink locationId="lakeside-dining" onShowMap={showMapWithLocation}>Lakeside Dining Room</LocationLink> (please gather outside for a prayer prior to each designated meal
                    time)
                    <MealMenu date="2026-05-04" mealType="dinner" />
                  </dd>
                </div>
                <div className="rounded-lg border border-border/50 bg-background/50 p-3 md:p-4">
                  <dt className="mb-2 text-sm font-semibold text-primary md:text-base">7:00 PM</dt>
                  <dd className="text-sm leading-relaxed text-muted-foreground md:text-base">
                    Evening assembly, welcome, family introductions, & announcements in <LocationLink locationId="activities-center" onShowMap={showMapWithLocation}>AC Room 207</LocationLink>
                    <VolunteerSchedule date="2026-05-04" timeSlot="Evening Devotion" />
                  </dd>
                </div>
                <div className="rounded-lg border border-border/50 bg-background/50 p-3 md:p-4">
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
              className="scroll-mt-24 rounded-xl border-2 border-primary/20 bg-card p-4 shadow-sm md:p-6"
            >
              <div className="mb-4 flex items-center gap-2 md:mb-6 md:gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full text-base font-bold text-primary-foreground md:h-12 md:w-12 md:text-lg bg-[rgba(18,27,41,1)]">
                  T
                </div>
                <h2 className="text-xl font-bold md:text-2xl">May 5 (Tuesday)</h2>
              </div>
              <dl className="space-y-4 md:space-y-6">
                <div className="rounded-lg border border-border/50 bg-background/50 p-3 md:p-4">
                  <dt className="mb-2 text-sm font-semibold text-primary md:text-base">7:30 AM</dt>
                  <dd className="text-sm leading-relaxed text-muted-foreground md:text-base">
                    Breakfast at the <LocationLink locationId="lakeside-dining" onShowMap={showMapWithLocation}>Lakeside Dining Room</LocationLink>
                    <MealMenu date="2026-05-05" mealType="breakfast" />
                  </dd>
                </div>
                <div className="rounded-lg border border-border/50 bg-background/50 p-3 md:p-4">
                  <dt className="mb-2 text-sm font-semibold text-primary md:text-base">9:00 AM</dt>
                  <dd className="text-sm leading-relaxed text-muted-foreground md:text-base">
                    Morning assembly & announcements in <LocationLink locationId="activities-center" onShowMap={showMapWithLocation}>AC Room 207</LocationLink>
                    <VolunteerSchedule date="2026-05-05" timeSlot="Morning Devotion" />
                  </dd>
                </div>
                <div className="rounded-lg border border-border/50 bg-background/50 p-3 md:p-4">
                  <dt className="mb-2 text-sm font-semibold text-primary md:text-base">10:00 AM</dt>
                  <dd className="text-sm leading-relaxed text-muted-foreground md:text-base">
                    Young Adult session at the <LocationLink locationId="activities-center" onShowMap={showMapWithLocation}>Activity Center</LocationLink> (non-parent graduates; meet in Ping Pong Room)
                    <br />
                    Mom&apos;s session in <LocationLink locationId="activities-center" onShowMap={showMapWithLocation}>AC Room 207</LocationLink> (free time for everyone else; black-light activities & nine square)
                  </dd>
                </div>
                <div className="rounded-lg border border-border/50 bg-background/50 p-3 md:p-4">
                  <dt className="mb-2 text-sm font-semibold text-primary md:text-base">12:00 PM</dt>
                  <dd className="text-sm leading-relaxed text-muted-foreground md:text-base">
                    Lunch at the <LocationLink locationId="lakeside-dining" onShowMap={showMapWithLocation}>Lakeside Dining Room</LocationLink>
                    <MealMenu date="2026-05-05" mealType="lunch" />
                  </dd>
                </div>
                <div className="rounded-lg border border-border/50 bg-background/50 p-3 md:p-4">
                  <dt className="mb-3 text-sm font-semibold text-primary md:text-base flex items-center flex-wrap gap-2">
                    Outside afternoon activities (weather permitting) or free time:
                    <InlineWeather date="2026-05-05" hour={14} />
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
                <div className="rounded-lg border border-border/50 bg-background/50 p-3 md:p-4">
                  <dt className="mb-2 text-sm font-semibold text-primary md:text-base">5:30 PM</dt>
                  <dd className="text-sm leading-relaxed text-muted-foreground md:text-base">
                    Dinner at the <LocationLink locationId="lakeside-dining" onShowMap={showMapWithLocation}>Lakeside Dining Room</LocationLink>
                    <MealMenu date="2026-05-05" mealType="dinner" />
                  </dd>
                </div>
                <div className="rounded-lg border border-border/50 bg-background/50 p-3 md:p-4">
                  <dt className="mb-2 text-sm font-semibold text-primary md:text-base">7:00 PM</dt>
                  <dd className="text-sm leading-relaxed text-muted-foreground md:text-base">
                    Evening assembly & announcements in <LocationLink locationId="activities-center" onShowMap={showMapWithLocation}>AC Room 207</LocationLink>
                    <VolunteerSchedule date="2026-05-05" timeSlot="Evening Devotion" />
                  </dd>
                </div>
                <div className="rounded-lg border border-border/50 bg-background/50 p-3 md:p-4">
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
              className="scroll-mt-24 rounded-xl border-2 border-accent/20 bg-card p-4 shadow-sm md:p-6"
            >
              <div className="mb-4 flex items-center gap-2 md:mb-6 md:gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-foreground text-base font-bold text-background md:h-12 md:w-12 md:text-lg">
                  W
                </div>
                <h2 className="text-xl font-bold md:text-2xl">May 6 (Wednesday)</h2>
              </div>
              <dl className="space-y-4 md:space-y-6">
                <div className="rounded-lg border border-border/50 bg-background/50 p-3 md:p-4">
                  <dt className="mb-2 text-sm font-semibold text-primary md:text-base">7:30 AM</dt>
                  <dd className="text-sm leading-relaxed text-muted-foreground md:text-base">
                    Breakfast at the <LocationLink locationId="lakeside-dining" onShowMap={showMapWithLocation}>Lakeside Dining Room</LocationLink>
                    <MealMenu date="2026-05-06" mealType="breakfast" />
                  </dd>
                </div>
                <div className="rounded-lg border border-border/50 bg-background/50 p-3 md:p-4">
                  <dt className="mb-2 text-sm font-semibold text-primary md:text-base">9:00 AM</dt>
                  <dd className="text-sm leading-relaxed text-muted-foreground md:text-base">
                    Morning assembly, group picture, & announcements in <LocationLink locationId="activities-center" onShowMap={showMapWithLocation}>AC Room 207</LocationLink>
                    <VolunteerSchedule date="2026-05-06" timeSlot="Morning Devotion" />
                  </dd>
                </div>
                <div className="rounded-lg border border-border/50 bg-background/50 p-3 md:p-4">
                  <dt className="mb-2 text-sm font-semibold text-primary md:text-base">10:00 AM</dt>
                  <dd className="text-sm leading-relaxed text-muted-foreground md:text-base">
                    Dad&apos;s session in <LocationLink locationId="activities-center" onShowMap={showMapWithLocation}>AC Room 207</LocationLink> (free time for everyone else; black-light activities & nine square)
                  </dd>
                </div>
                <div className="rounded-lg border border-border/50 bg-background/50 p-3 md:p-4">
<dt className="mb-2 text-sm font-semibold text-primary md:text-base">12:00 PM</dt>
                  <dd className="text-sm leading-relaxed text-muted-foreground md:text-base">
                    Lunch at the <LocationLink locationId="lakeside-dining" onShowMap={showMapWithLocation}>Lakeside Dining Room</LocationLink>
                    <MealMenu date="2026-05-06" mealType="lunch" />
                  </dd>
                </div>
                <div className="rounded-lg border border-border/50 bg-background/50 p-3 md:p-4">
                  <dt className="mb-3 text-sm font-semibold text-primary md:text-base flex items-center flex-wrap gap-2">
                    Outside afternoon activities (weather permitting) or free time:
                    <InlineWeather date="2026-05-06" hour={14} />
                  </dt>
                  <dd className="ml-4 space-y-2 text-sm leading-relaxed text-muted-foreground md:space-y-3 md:text-base">
                    <p>
                      <span className="font-semibold text-foreground">1:30 PM</span> <LocationLink locationId="rec-field-kickball" onShowMap={showMapWithLocation}>Kickball</LocationLink>
                    </p>
                    <p>
                      <span className="font-semibold text-foreground">2:30 PM</span> Gaga Ball Tournament
                    </p>
                    <p>
                      <span className="font-semibold text-foreground">3:30 PM</span> Kids&apos; movie & craft (Painting rocks) in <LocationLink locationId="activities-center" onShowMap={showMapWithLocation}>AC Room 207</LocationLink>
                    </p>
                    <p>
                      <span className="font-semibold text-foreground">3:30 PM</span> <LocationLink locationId="disc-golf" onShowMap={showMapWithLocation}>Disc golf</LocationLink> (begins behind <LocationLink locationId="activities-center" onShowMap={showMapWithLocation}>Activity Center</LocationLink>)
                    </p>
                  </dd>
                </div>
                <div className="rounded-lg border border-border/50 bg-background/50 p-3 md:p-4">
                  <dt className="mb-2 text-sm font-semibold text-primary md:text-base">5:30 PM</dt>
                  <dd className="text-sm leading-relaxed text-muted-foreground md:text-base">
                    Dinner at the <LocationLink locationId="lakeside-dining" onShowMap={showMapWithLocation}>Lakeside Dining Room</LocationLink>
                    <MealMenu date="2026-05-06" mealType="dinner" />
                  </dd>
                </div>
                <div className="rounded-lg border border-border/50 bg-background/50 p-3 md:p-4">
                  <dt className="mb-2 text-sm font-semibold text-primary md:text-base">7:00 PM</dt>
                  <dd className="text-sm leading-relaxed text-muted-foreground md:text-base">
                    Evening assembly & announcements in <LocationLink locationId="activities-center" onShowMap={showMapWithLocation}>Room 207 at the Activity Center</LocationLink>
                    <VolunteerSchedule date="2026-05-06" timeSlot="Evening Devotion" />
                  </dd>
                </div>
                <div className="rounded-lg border border-border/50 bg-background/50 p-3 md:p-4">
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
              className="scroll-mt-24 rounded-xl border-2 border-primary/20 bg-card p-4 shadow-sm md:p-6"
            >
              <div className="mb-4 flex items-center gap-2 md:mb-6 md:gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-base font-bold text-primary-foreground lg:h-10 lg:w-10 lg:text-sm bg-[rgba(18,27,41,1)]">
                  T
                </div>
                <h2 className="text-xl font-bold md:text-2xl">May 7 (Thursday)</h2>
              </div>
              <dl className="space-y-4 md:space-y-6">
                <div className="rounded-lg border border-border/50 bg-background/50 p-3 md:p-4">
                  <dt className="mb-2 text-sm font-semibold text-primary md:text-base">7:30 AM</dt>
                  <dd className="text-sm leading-relaxed text-muted-foreground md:text-base">
                    Breakfast at the <LocationLink locationId="lakeside-dining" onShowMap={showMapWithLocation}>Lakeside Dining Room</LocationLink>
                    <MealMenu date="2026-05-07" mealType="breakfast" />
                  </dd>
                </div>
                <div className="rounded-lg border border-border/50 bg-background/50 p-3 md:p-4">
                  <dt className="mb-2 text-sm font-semibold text-primary md:text-base">9:00 AM</dt>
                  <dd className="text-sm leading-relaxed text-muted-foreground md:text-base">
                    Morning assembly & announcements in <LocationLink locationId="activities-center" onShowMap={showMapWithLocation}>AC Room 207</LocationLink>
                    <VolunteerSchedule date="2026-05-07" timeSlot="Morning Devotion" />
                  </dd>
                </div>
                <div className="rounded-lg border border-border/50 bg-background/50 p-3 md:p-4">
                  <dt className="mb-2 text-sm font-semibold text-primary md:text-base">10:00 AM</dt>
                  <dd className="text-sm leading-relaxed text-muted-foreground md:text-base">
                    Bible bowl (everyone is encouraged to participate:{" "}
                    <a href="/biblebowl" className="inline-flex items-center gap-1 text-primary hover:underline">
                      Bible Bowl Info
                      <Users className="h-3 w-3" />
                    </a>
                    )
                  </dd>
                </div>
                <div className="rounded-lg border border-border/50 bg-background/50 p-3 md:p-4">
                  <dt className="mb-2 text-sm font-semibold text-primary md:text-base">10:20 AM</dt>
                  <dd className="text-sm leading-relaxed text-muted-foreground md:text-base">
                    Ping Pong tournament at the <LocationLink locationId="activities-center" onShowMap={showMapWithLocation}>Activity Center</LocationLink>
                  </dd>
                </div>
                <div className="rounded-lg border border-border/50 bg-background/50 p-3 md:p-4">
                  <dt className="mb-2 text-sm font-semibold text-primary md:text-base">12:00 PM</dt>
                  <dd className="text-sm leading-relaxed text-muted-foreground md:text-base">
                    Lunch at the <LocationLink locationId="lakeside-dining" onShowMap={showMapWithLocation}>Lakeside Dining Room</LocationLink>
                    <MealMenu date="2026-05-07" mealType="lunch" />
                  </dd>
                </div>
                <div className="rounded-lg border border-border/50 bg-background/50 p-3 md:p-4">
                  <dt className="mb-3 text-sm font-semibold text-primary md:text-base flex items-center flex-wrap gap-2">
                    Outside afternoon activities (weather permitting) or free time:
                    <InlineWeather date="2026-05-07" hour={14} />
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
                  </dd>
                </div>
                <div className="rounded-lg border border-border/50 bg-background/50 p-3 md:p-4">
                  <dt className="mb-2 text-sm font-semibold text-primary md:text-base flex items-center flex-wrap gap-2">
                    5:30 PM
                    <InlineWeather date="2026-05-07" hour={17} />
                  </dt>
                  <dd className="text-sm leading-relaxed text-muted-foreground md:text-base">
                    Cookout by the lake (weather permitting)
                    <MealMenu date="2026-05-07" mealType="dinner" />
                  </dd>
                </div>
                <div className="rounded-lg border border-border/50 bg-background/50 p-3 md:p-4">
                  <dt className="mb-2 text-sm font-semibold text-primary md:text-base flex items-center flex-wrap gap-2">
                    6:30 PM
                    <InlineWeather date="2026-05-07" hour={18} />
                  </dt>
                  <dd className="text-sm leading-relaxed text-muted-foreground md:text-base">
                    Hayrides (starting by the lake)
                  </dd>
                </div>
                <div className="rounded-lg border border-border/50 bg-background/50 p-3 md:p-4">
                  <dt className="mb-2 text-sm font-semibold text-primary md:text-base flex items-center flex-wrap gap-2">
                    7:00 PM
                    <InlineWeather date="2026-05-07" hour={19} />
                  </dt>
                  <dd className="text-sm leading-relaxed text-muted-foreground md:text-base">
                    Evening assembly & announcements at the <LocationLink locationId="bonfire-site" onShowMap={showMapWithLocation}>bonfire</LocationLink> [no song books or projector]
                    <VolunteerSchedule date="2026-05-07" timeSlot="Evening Devotion" />
                  </dd>
                </div>
                <div className="rounded-lg border border-border/50 bg-background/50 p-3 md:p-4">
                  <dt className="mb-3 text-sm font-semibold text-primary md:text-base flex items-center flex-wrap gap-2">
                    Evening activities or free time at the <LocationLink locationId="activities-center" onShowMap={showMapWithLocation}>Activity Center</LocationLink>:
                    <InlineWeather date="2026-05-07" hour={20} />
                  </dt>
                  <dd className="ml-4 space-y-2 text-sm leading-relaxed text-muted-foreground md:space-y-3 md:text-base">
                    <p>
                      <span className="font-semibold text-foreground">8:00 PM</span> Glow-in-the-Dark <LocationLink locationId="rec-field-kickball" onShowMap={showMapWithLocation}>Capture the Flag</LocationLink>
                      [2 simultaneous games]
                    </p>
                    <p>
                      <span className="font-semibold text-foreground">9:00 PM</span> Adult/Teen Volleyball
                    </p>
                  </dd>
                </div>
              </dl>
            </section>

            {/* Friday */}
            <section
              id="friday"
              className="scroll-mt-24 rounded-xl border-2 border-secondary/20 bg-card p-4 shadow-sm md:p-6"
            >
              <div className="mb-4 flex items-center gap-2 md:mb-6 md:gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-base font-bold text-secondary-foreground md:h-12 md:w-12 md:text-lg">
                  F
                </div>
                <h2 className="text-xl font-bold md:text-2xl">May 8 (Friday)</h2>
              </div>
              <dl className="space-y-4 md:space-y-6">
                <div className="rounded-lg border border-border/50 bg-background/50 p-3 md:p-4">
                  <dt className="mb-2 text-sm font-semibold text-primary md:text-base">7:30 AM</dt>
                  <dd className="text-sm leading-relaxed text-muted-foreground md:text-base">
                    Breakfast at the <LocationLink locationId="lakeside-dining" onShowMap={showMapWithLocation}>Lakeside Dining Room</LocationLink>
                    <MealMenu date="2026-05-08" mealType="breakfast" />
                  </dd>
                </div>
                <div className="rounded-lg border border-border/50 bg-background/50 p-3 md:p-4">
                  <dt className="mb-2 text-sm font-semibold text-primary md:text-base">9:00 AM</dt>
                  <dd className="text-sm leading-relaxed text-muted-foreground md:text-base">
                    Morning assembly, Bible bowl awards, & brainstorming for next year in <LocationLink locationId="activities-center" onShowMap={showMapWithLocation}>AC Room 207</LocationLink>
                    <VolunteerSchedule date="2026-05-08" timeSlot="Morning Devotion" />
                  </dd>
                </div>
                <div className="rounded-lg border border-border/50 bg-background/50 p-3 md:p-4">
                  <dt className="mb-2 text-sm font-semibold text-primary md:text-base">10:30 AM</dt>
                  <dd className="text-sm leading-relaxed text-muted-foreground md:text-base">
                    Pack up & clean up lodging areas (return motel keys to our meeting room by 11:30 AM)
                  </dd>
                </div>
                <div className="rounded-lg border border-border/50 bg-background/50 p-3 md:p-4">
                  <dt className="mb-2 text-sm font-semibold text-primary md:text-base">12:00 PM</dt>
                  <dd className="text-sm leading-relaxed text-muted-foreground md:text-base">
                    Lunch at the Lakeside Dining Room & then depart for home
                    <MealMenu date="2026-05-08" mealType="lunch" />
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
