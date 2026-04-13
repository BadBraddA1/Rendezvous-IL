"use client"

import { useState } from "react"
import { Calendar, Clock, MapPin, ChevronRight } from "lucide-react"
import { scheduleEvents, mapLocations, type ScheduleEvent } from "@/lib/venue-map-data"
import { cn } from "@/lib/utils"

interface VenueSchedulePanelProps {
  onEventHover?: (locationId: string | null) => void
  onEventClick?: (event: ScheduleEvent) => void
}

const days = [
  { id: "monday", label: "Mon", fullLabel: "Monday", date: "May 4" },
  { id: "tuesday", label: "Tue", fullLabel: "Tuesday", date: "May 5" },
  { id: "wednesday", label: "Wed", fullLabel: "Wednesday", date: "May 6" },
  { id: "thursday", label: "Thu", fullLabel: "Thursday", date: "May 7" },
  { id: "friday", label: "Fri", fullLabel: "Friday", date: "May 8" },
]

export function VenueSchedulePanel({ onEventHover, onEventClick }: VenueSchedulePanelProps) {
  const [selectedDay, setSelectedDay] = useState("monday")
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)

  const dayEvents = scheduleEvents.filter((event) => event.day === selectedDay)
  const selectedDayInfo = days.find((d) => d.id === selectedDay)

  const getLocationName = (locationId: string) => {
    return mapLocations.find((loc) => loc.id === locationId)?.name || locationId
  }

  const handleEventClick = (event: ScheduleEvent) => {
    setSelectedEventId(event.id)
    onEventClick?.(event)
  }

  return (
    <div className="flex h-full flex-col rounded-xl border border-border bg-card">
      {/* Header */}
      <div className="border-b border-border p-4">
        <div className="flex items-center gap-2 text-primary">
          <Calendar className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Event Schedule</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Tap an event to see its location on the map
        </p>
      </div>

      {/* Day tabs */}
      <div className="flex border-b border-border">
        {days.map((day) => (
          <button
            key={day.id}
            onClick={() => {
              setSelectedDay(day.id)
              setSelectedEventId(null)
            }}
            className={cn(
              "flex-1 px-2 py-3 text-center text-sm font-medium transition-colors",
              selectedDay === day.id
                ? "border-b-2 border-primary bg-primary/5 text-primary"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            )}
          >
            <span className="block md:hidden">{day.label}</span>
            <span className="hidden md:block">{day.fullLabel}</span>
            <span className="mt-0.5 block text-xs opacity-70">{day.date}</span>
          </button>
        ))}
      </div>

      {/* Events list */}
      <div className="flex-1 overflow-y-auto p-2">
        <div className="space-y-2">
          {dayEvents.map((event) => {
            const isSelected = selectedEventId === event.id
            
            return (
              <button
                key={event.id}
                onClick={() => handleEventClick(event)}
                onMouseEnter={() => onEventHover?.(event.locationId)}
                onMouseLeave={() => onEventHover?.(null)}
                className={cn(
                  "w-full rounded-lg border p-3 text-left transition-all",
                  isSelected
                    ? "border-primary bg-primary/10 shadow-sm"
                    : "border-transparent bg-muted/30 hover:border-border hover:bg-muted/50"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{event.time}</span>
                    </div>
                    <p className={cn("font-medium", isSelected && "text-primary")}>
                      {event.title}
                    </p>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      <span>{getLocationName(event.locationId)}</span>
                    </div>
                  </div>
                  <ChevronRight
                    className={cn(
                      "mt-1 h-4 w-4 flex-shrink-0 transition-transform",
                      isSelected ? "rotate-90 text-primary" : "text-muted-foreground"
                    )}
                  />
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-border p-3">
        <p className="text-center text-xs text-muted-foreground">
          {selectedDayInfo?.fullLabel}, {selectedDayInfo?.date} &bull; {dayEvents.length} events
        </p>
      </div>
    </div>
  )
}
