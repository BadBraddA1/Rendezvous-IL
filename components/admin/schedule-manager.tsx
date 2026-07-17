"use client"

import { Fragment, useCallback, useEffect, useRef, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { AdminListSkeleton, AdminRetryButton } from "./admin-panel-states"
import { useToast } from "@/hooks/use-toast"
import {
  ArrowDown,
  ArrowUp,
  CalendarDays,
  CloudSun,
  Download,
  Link2,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  Trash2,
  Utensils,
  Church,
} from "lucide-react"

type ScheduleEvent = {
  id: number
  day: string
  event_date: string | null
  sort_order: number
  time: string
  title: string
  location: string | null
  note: string | null
  location_id: string | null
  meal_type: string | null
  volunteer_slot: string | null
  link_href: string | null
  show_weather: number
}

type Props = {
  canManage: boolean
  eventYear: number
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] as const
const CUSTOM_DAY = "Custom"

const LOCATION_OPTIONS: { id: string; label: string }[] = [
  { id: "activities-center", label: "Activity Center" },
  { id: "lakeside-dining", label: "Lakeside Dining Room" },
  { id: "bonfire-site", label: "Bonfire site" },
  { id: "archery", label: "Archery range" },
  { id: "human-foosball", label: "Human Foosball court" },
  { id: "gaga-ball", label: "Gaga Ball / Nine Square" },
  { id: "disc-golf", label: "Disc golf course" },
  { id: "rec-field-kickball", label: "Rec Field" },
  { id: "beachfront", label: "Beachfront" },
]

const NONE = "none"

type FormState = {
  day: string
  eventDate: string
  time: string
  title: string
  location: string
  note: string
  locationId: string
  mealType: string
  volunteerSlot: string
  linkHref: string
  showWeather: boolean
}

const EMPTY_FORM: FormState = {
  day: "Monday",
  eventDate: "",
  time: "",
  title: "",
  location: "",
  note: "",
  locationId: NONE,
  mealType: NONE,
  volunteerSlot: NONE,
  linkHref: "",
  showWeather: false,
}

/** Admin editor for the public event schedule (web page, print, PDF, apps). */
export function ScheduleManager({ canManage, eventYear }: Props) {
  const [events, setEvents] = useState<ScheduleEvent[] | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<number | "new" | null>(null)
  // Which day an in-progress "add" belongs to (null = the top-of-card add button).
  const [newForDay, setNewForDay] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [busyId, setBusyId] = useState<string | null>(null)
  const { toast } = useToast()
  const formRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setEvents(null)
    setEditingId(null)
  }, [eventYear])

  // The form renders inline (top of card for adds, under the row for edits) —
  // make sure it's actually on screen when it opens.
  useEffect(() => {
    if (editingId !== null) {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" })
    }
  }, [editingId, newForDay])

  const fetchEvents = useCallback(async () => {
    setFetchError(null)
    try {
      const res = await fetch(`/api/admin/schedule?year=${eventYear}`)
      if (!res.ok) throw new Error(`Could not load the schedule (${res.status})`)
      const data = await res.json()
      setEvents(Array.isArray(data.events) ? data.events : [])
    } catch (error) {
      console.error("[schedule-manager] Fetch failed:", error)
      setEvents([])
      setFetchError(error instanceof Error ? error.message : "Could not load the schedule")
    }
  }, [eventYear])

  useEffect(() => {
    void fetchEvents()
  }, [fetchEvents])

  const applyResponse = (data: { events?: unknown }) => {
    if (Array.isArray(data.events)) setEvents(data.events as ScheduleEvent[])
  }

  const seed = async () => {
    setBusyId("seed")
    try {
      const res = await fetch("/api/admin/schedule/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year: eventYear }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Could not load the schedule")
      applyResponse(data)
      toast({
        title: "Schedule loaded",
        description: `${data.inserted} events imported — edit away.`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Could not load the schedule.",
        variant: "destructive",
      })
    } finally {
      setBusyId(null)
    }
  }

  const startEdit = (event: ScheduleEvent | null, day?: string, eventDate?: string) => {
    setEditingId(event ? event.id : "new")
    setNewForDay(event ? null : (day ?? null))
    setForm(
      event
        ? {
            day: event.event_date ? CUSTOM_DAY : event.day,
            eventDate: event.event_date ?? "",
            time: event.time,
            title: event.title,
            location: event.location ?? "",
            note: event.note ?? "",
            locationId: event.location_id ?? NONE,
            mealType: event.meal_type ?? NONE,
            volunteerSlot: event.volunteer_slot ?? NONE,
            linkHref: event.link_href ?? "",
            showWeather: Boolean(event.show_weather),
          }
        : {
            ...EMPTY_FORM,
            day: day === CUSTOM_DAY || eventDate ? CUSTOM_DAY : (day ?? "Monday"),
            eventDate: eventDate ?? "",
          },
    )
  }

  const save = async () => {
    if (!form.time.trim() || !form.title.trim()) return
    if (form.day === CUSTOM_DAY && !form.eventDate.trim()) {
      toast({
        title: "Pick a date",
        description: "Custom key dates need a calendar date (e.g. registration opens).",
        variant: "destructive",
      })
      return
    }
    setBusyId("form")
    try {
      const isNew = editingId === "new"
      const res = await fetch(
        isNew ? "/api/admin/schedule" : `/api/admin/schedule/${editingId}`,
        {
          method: isNew ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            day: form.day === CUSTOM_DAY ? CUSTOM_DAY : form.day,
            eventDate: form.day === CUSTOM_DAY ? form.eventDate : null,
            time: form.time,
            title: form.title,
            location: form.location,
            note: form.note,
            locationId: form.locationId === NONE ? null : form.locationId,
            mealType: form.mealType === NONE ? null : form.mealType,
            volunteerSlot: form.volunteerSlot === NONE ? null : form.volunteerSlot,
            linkHref: form.linkHref,
            showWeather: form.showWeather,
            year: eventYear,
          }),
        },
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Could not save")
      applyResponse(data)
      setEditingId(null)
      setForm(EMPTY_FORM)
      toast({
        title: isNew ? "Event added" : "Event updated",
        description: `${form.day === CUSTOM_DAY ? form.eventDate : form.day} ${form.time} — ${form.title}`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Could not save.",
        variant: "destructive",
      })
    } finally {
      setBusyId(null)
    }
  }

  const remove = async (event: ScheduleEvent) => {
    const when = event.event_date || event.day
    if (!window.confirm(`Delete "${event.time} — ${event.title}" from ${when}?`)) return
    setBusyId(`row-${event.id}`)
    try {
      const res = await fetch(`/api/admin/schedule/${event.id}?year=${eventYear}`, {
        method: "DELETE",
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Could not delete")
      applyResponse(data)
      toast({ title: "Event deleted", description: `${event.time} — ${event.title}` })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Could not delete.",
        variant: "destructive",
      })
    } finally {
      setBusyId(null)
    }
  }

  const move = async (event: ScheduleEvent, direction: -1 | 1) => {
    if (!events) return
    const dayEvents = events.filter((row) =>
      event.event_date
        ? row.event_date === event.event_date
        : row.day === event.day && !row.event_date,
    )
    const index = dayEvents.findIndex((row) => row.id === event.id)
    const swapWith = index + direction
    if (swapWith < 0 || swapWith >= dayEvents.length) return

    const reordered = [...dayEvents]
    ;[reordered[index], reordered[swapWith]] = [reordered[swapWith], reordered[index]]

    setBusyId(`row-${event.id}`)
    try {
      const res = await fetch("/api/admin/schedule/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year: eventYear,
          day: event.day,
          eventDate: event.event_date,
          orderedIds: reordered.map((row) => row.id),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Could not reorder")
      applyResponse(data)
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Could not reorder.",
        variant: "destructive",
      })
    } finally {
      setBusyId(null)
    }
  }

  const editForm = (
    <div ref={formRef} className="space-y-3 rounded-lg border border-dashed bg-muted/30 p-4">
      <p className="text-sm font-semibold">
        {editingId === "new" ? "Add event" : "Edit event"}
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <Label htmlFor="se-day">Day *</Label>
          <Select
            value={form.day}
            onValueChange={(value) =>
              setForm((p) => ({
                ...p,
                day: value,
                eventDate: value === CUSTOM_DAY ? p.eventDate : "",
              }))
            }
          >
            <SelectTrigger id="se-day">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DAYS.map((day) => (
                <SelectItem key={day} value={day}>
                  {day} (retreat week)
                </SelectItem>
              ))}
              <SelectItem value={CUSTOM_DAY}>Custom date (key date)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {form.day === CUSTOM_DAY && (
          <div>
            <Label htmlFor="se-event-date">Calendar date *</Label>
            <Input
              id="se-event-date"
              type="date"
              value={form.eventDate}
              onChange={(e) => setForm((p) => ({ ...p, eventDate: e.target.value }))}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Use this for dates outside Mon–Fri of retreat week (e.g. registration opens).
            </p>
          </div>
        )}
        <div>
          <Label htmlFor="se-time">Time *</Label>
          <Input
            id="se-time"
            value={form.time}
            placeholder="e.g., 5:30 PM or 1:30 – 3:30 PM"
            onChange={(e) => setForm((p) => ({ ...p, time: e.target.value }))}
          />
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="se-title">Event *</Label>
          <Input
            id="se-title"
            value={form.title}
            placeholder="e.g., Evening assembly & announcements"
            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
          />
        </div>
        <div>
          <Label htmlFor="se-location">Location text</Label>
          <Input
            id="se-location"
            value={form.location}
            placeholder="e.g., AC Room 207"
            onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
          />
        </div>
        <div>
          <Label htmlFor="se-map">Map pin (venue map link)</Label>
          <Select
            value={form.locationId}
            onValueChange={(value) => setForm((p) => ({ ...p, locationId: value }))}
          >
            <SelectTrigger id="se-map">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>No map pin</SelectItem>
              {LOCATION_OPTIONS.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="se-note">Note</Label>
          <Input
            id="se-note"
            value={form.note}
            placeholder="Optional details shown under the event"
            onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))}
          />
        </div>
        <div>
          <Label htmlFor="se-meal">Meal menu</Label>
          <Select
            value={form.mealType}
            onValueChange={(value) => setForm((p) => ({ ...p, mealType: value }))}
          >
            <SelectTrigger id="se-meal">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>No menu</SelectItem>
              <SelectItem value="breakfast">Breakfast menu</SelectItem>
              <SelectItem value="lunch">Lunch menu</SelectItem>
              <SelectItem value="dinner">Dinner menu</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="se-slot">Worship volunteer slot</Label>
          <Select
            value={form.volunteerSlot}
            onValueChange={(value) => setForm((p) => ({ ...p, volunteerSlot: value }))}
          >
            <SelectTrigger id="se-slot">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>None</SelectItem>
              <SelectItem value="Morning Devotion">Morning Devotion</SelectItem>
              <SelectItem value="Evening Devotion">Evening Devotion</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="se-link">Info link (site page)</Label>
          <Input
            id="se-link"
            value={form.linkHref}
            placeholder="e.g., /scrabble or /biblebowl"
            onChange={(e) => setForm((p) => ({ ...p, linkHref: e.target.value }))}
          />
        </div>
        <div className="flex items-end pb-2">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <Checkbox
              checked={form.showWeather}
              onCheckedChange={(checked) =>
                setForm((p) => ({ ...p, showWeather: checked === true }))
              }
            />
            Show weather forecast chip (outdoor events)
          </label>
        </div>
      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={() => void save()}
          disabled={!form.time.trim() || !form.title.trim() || busyId === "form"}
        >
          {busyId === "form" && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
          {editingId === "new" ? "Add event" : "Save changes"}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
          Cancel
        </Button>
      </div>
    </div>
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-widget-heading flex items-center gap-2">
          <CalendarDays className="h-4 w-4" aria-hidden="true" />
          Event schedule
          {events !== null && <Badge variant="secondary">{events.length} events</Badge>}
        </CardTitle>
        <CardDescription>
          Everything here drives the public schedule page, the printable version, the PDF
          download, and the mobile apps. Until this list has events, those pages show the
          built-in schedule.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {events === null ? (
          <AdminListSkeleton rows={6} label="Loading schedule" />
        ) : fetchError ? (
          <div className="callout-destructive rounded-lg border p-4">
            <p className="text-sm">{fetchError}</p>
            <AdminRetryButton onRetry={() => void fetchEvents()} label="Reload" />
          </div>
        ) : events.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
            <p>No editable schedule for {eventYear} yet — the public pages are showing the built-in schedule.</p>
            {canManage && (
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                disabled={busyId === "seed"}
                onClick={() => void seed()}
              >
                {busyId === "seed" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Download className="mr-2 h-4 w-4" aria-hidden="true" />
                )}
                Import the built-in schedule to start editing
              </Button>
            )}
            {canManage && editingId === "new" && editForm}
            {canManage && editingId !== "new" && (
              <div className="mt-2">
                <Button variant="ghost" size="sm" onClick={() => startEdit(null)}>
                  <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                  Or add events one at a time
                </Button>
              </div>
            )}
          </div>
        ) : (
          <>
            {canManage &&
              (editingId === "new" && newForDay === null ? (
                editForm
              ) : (
                <Button variant="outline" size="sm" onClick={() => startEdit(null)}>
                  <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                  Add event
                </Button>
              ))}
            {DAYS.map((day) => {
            const dayEvents = events.filter((event) => event.day === day && !event.event_date)
            return (
              <section key={day} className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">{day}</h3>
                  {canManage && (
                    <Button variant="ghost" size="sm" onClick={() => startEdit(null, day)}>
                      <Plus className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                      Add
                    </Button>
                  )}
                </div>
                {canManage && editingId === "new" && newForDay === day && editForm}
                {dayEvents.length === 0 ? (
                  <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                    No events on {day}.
                  </p>
                ) : (
                  <ul className="divide-y rounded-md border">
                    {dayEvents.map((event, index) => (
                      <Fragment key={event.id}>
                      <li className="flex items-start gap-3 p-3">
                        <span className="w-28 shrink-0 pt-0.5 text-sm font-medium text-primary md:w-36">
                          {event.time}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">{event.title}</p>
                          {event.location && (
                            <p className="text-xs text-muted-foreground">{event.location}</p>
                          )}
                          {event.note && (
                            <p className="text-xs italic text-muted-foreground">{event.note}</p>
                          )}
                          <div className="mt-1 flex flex-wrap gap-1">
                            {event.location_id && (
                              <Badge variant="outline" className="gap-1 text-xs">
                                <MapPin className="h-3 w-3" aria-hidden="true" /> Map pin
                              </Badge>
                            )}
                            {event.meal_type && (
                              <Badge variant="outline" className="gap-1 text-xs">
                                <Utensils className="h-3 w-3" aria-hidden="true" /> {event.meal_type} menu
                              </Badge>
                            )}
                            {event.volunteer_slot && (
                              <Badge variant="outline" className="gap-1 text-xs">
                                <Church className="h-3 w-3" aria-hidden="true" /> {event.volunteer_slot}
                              </Badge>
                            )}
                            {event.link_href && (
                              <Badge variant="outline" className="gap-1 text-xs">
                                <Link2 className="h-3 w-3" aria-hidden="true" /> {event.link_href}
                              </Badge>
                            )}
                            {Boolean(event.show_weather) && (
                              <Badge variant="outline" className="gap-1 text-xs">
                                <CloudSun className="h-3 w-3" aria-hidden="true" /> Weather
                              </Badge>
                            )}
                          </div>
                        </div>
                        {canManage && (
                          <div className="flex shrink-0 items-center gap-0.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              aria-label="Move up"
                              disabled={index === 0 || busyId === `row-${event.id}`}
                              onClick={() => void move(event, -1)}
                            >
                              <ArrowUp className="h-4 w-4" aria-hidden="true" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              aria-label="Move down"
                              disabled={index === dayEvents.length - 1 || busyId === `row-${event.id}`}
                              onClick={() => void move(event, 1)}
                            >
                              <ArrowDown className="h-4 w-4" aria-hidden="true" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              aria-label={`Edit ${event.title}`}
                              onClick={() => startEdit(event)}
                            >
                              <Pencil className="h-4 w-4" aria-hidden="true" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              aria-label={`Delete ${event.title}`}
                              disabled={busyId === `row-${event.id}`}
                              onClick={() => void remove(event)}
                            >
                              {busyId === `row-${event.id}` ? (
                                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                              ) : (
                                <Trash2 className="h-4 w-4" aria-hidden="true" />
                              )}
                            </Button>
                          </div>
                        )}
                      </li>
                      {canManage && editingId === event.id && (
                        <li className="p-3">{editForm}</li>
                      )}
                      </Fragment>
                    ))}
                  </ul>
                )}
              </section>
            )
            })}

            {(() => {
              const keyDates = [
                ...new Set(
                  events
                    .filter((event) => event.event_date)
                    .map((event) => event.event_date as string),
                ),
              ].sort()
              return (
                <section className="space-y-3 border-t pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold">Key dates (outside retreat week)</h3>
                      <p className="text-xs text-muted-foreground">
                        Registration opens, deadlines, and other calendar dates before/after Mon–Fri.
                      </p>
                    </div>
                    {canManage && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => startEdit(null, CUSTOM_DAY)}
                      >
                        <Plus className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                        Add key date
                      </Button>
                    )}
                  </div>
                  {canManage && editingId === "new" && newForDay === CUSTOM_DAY && editForm}
                  {keyDates.length === 0 ? (
                    <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                      No key dates yet. Add something like “Registration opens”.
                    </p>
                  ) : (
                    keyDates.map((iso) => {
                      const dayEvents = events.filter((event) => event.event_date === iso)
                      const label = new Date(`${iso}T00:00:00.000Z`).toLocaleDateString("en-US", {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                        timeZone: "UTC",
                      })
                      return (
                        <div key={iso} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-medium">{label}</h4>
                            {canManage && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => startEdit(null, CUSTOM_DAY, iso)}
                              >
                                <Plus className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                                Add
                              </Button>
                            )}
                          </div>
                          <ul className="divide-y rounded-md border">
                            {dayEvents.map((event, index) => (
                              <Fragment key={event.id}>
                                <li className="flex items-start gap-3 p-3">
                                  <span className="w-28 shrink-0 pt-0.5 text-sm font-medium text-primary md:w-36">
                                    {event.time}
                                  </span>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium">{event.title}</p>
                                    {event.note && (
                                      <p className="text-xs italic text-muted-foreground">
                                        {event.note}
                                      </p>
                                    )}
                                  </div>
                                  {canManage && (
                                    <div className="flex shrink-0 items-center gap-0.5">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        aria-label="Move up"
                                        disabled={index === 0 || busyId === `row-${event.id}`}
                                        onClick={() => void move(event, -1)}
                                      >
                                        <ArrowUp className="h-4 w-4" aria-hidden="true" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        aria-label="Move down"
                                        disabled={
                                          index === dayEvents.length - 1 ||
                                          busyId === `row-${event.id}`
                                        }
                                        onClick={() => void move(event, 1)}
                                      >
                                        <ArrowDown className="h-4 w-4" aria-hidden="true" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        aria-label={`Edit ${event.title}`}
                                        onClick={() => startEdit(event)}
                                      >
                                        <Pencil className="h-4 w-4" aria-hidden="true" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-destructive"
                                        aria-label={`Delete ${event.title}`}
                                        disabled={busyId === `row-${event.id}`}
                                        onClick={() => void remove(event)}
                                      >
                                        {busyId === `row-${event.id}` ? (
                                          <Loader2
                                            className="h-4 w-4 animate-spin"
                                            aria-hidden="true"
                                          />
                                        ) : (
                                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                                        )}
                                      </Button>
                                    </div>
                                  )}
                                </li>
                                {canManage && editingId === event.id && (
                                  <li className="p-3">{editForm}</li>
                                )}
                              </Fragment>
                            ))}
                          </ul>
                        </div>
                      )
                    })
                  )}
                </section>
              )
            })()}
          </>
        )}
      </CardContent>
    </Card>
  )
}
