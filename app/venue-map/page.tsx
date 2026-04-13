"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, Map, Calendar } from "lucide-react"
import { InteractiveVenueMap } from "@/components/interactive-venue-map"
import { VenueSchedulePanel } from "@/components/venue-schedule-panel"
import { mapLocations, type ScheduleEvent } from "@/lib/venue-map-data"

export default function VenueMapPage() {
  const [highlightedLocationId, setHighlightedLocationId] = useState<string | null>(null)
  const [showSchedule, setShowSchedule] = useState(false)

  const handleEventHover = (locationId: string | null) => {
    setHighlightedLocationId(locationId)
  }

  const handleEventClick = (event: ScheduleEvent) => {
    setHighlightedLocationId(event.locationId)
    
    // On mobile, close the schedule panel to show the map
    if (window.innerWidth < 1024) {
      setShowSchedule(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back to Home</span>
            </Link>
            <div className="hidden h-6 w-px bg-border sm:block" />
            <div className="flex items-center gap-2">
              <Map className="h-5 w-5 text-primary" />
              <h1 className="text-lg font-semibold">Venue Map</h1>
            </div>
          </div>

          {/* Mobile schedule toggle */}
          <button
            onClick={() => setShowSchedule(!showSchedule)}
            className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 lg:hidden"
          >
            <Calendar className="h-4 w-4" />
            <span>{showSchedule ? "View Map" : "Schedule"}</span>
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-7xl p-4">
        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          {/* Map section */}
          <div className={showSchedule ? "hidden lg:block" : "block"}>
            <div className="mb-4">
              <h2 className="text-xl font-semibold">Lake Williamson Christian Center</h2>
              <p className="text-sm text-muted-foreground">
                Explore the venue and find event locations. Tap markers for details.
              </p>
            </div>
            <InteractiveVenueMap
              highlightedLocationId={highlightedLocationId}
              onLocationSelect={(location) => {
                if (location) {
                  setHighlightedLocationId(location.id)
                }
              }}
            />
            
            {/* Location count */}
            <p className="mt-3 text-center text-xs text-muted-foreground">
              {mapLocations.length} locations mapped &bull; Pinch or use controls to zoom
            </p>
          </div>

          {/* Schedule panel */}
          <div className={showSchedule ? "block" : "hidden lg:block"}>
            <div className="lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)]">
              <VenueSchedulePanel
                onEventHover={handleEventHover}
                onEventClick={handleEventClick}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
