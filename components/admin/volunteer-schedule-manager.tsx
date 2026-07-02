"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AdminListSkeleton, AdminRetryButton } from "./admin-panel-states"
import { useToast } from "@/hooks/use-toast"
import { CalendarDays, GripVertical, Loader2, Search, Sparkles, Users } from "lucide-react"
import { cn } from "@/lib/utils"

type Volunteer = {
  id: number
  registration_id: number | null
  volunteer_name: string
  volunteer_type: string
  assigned_date: string | null
  time_slot: string | null
  prayer_type: string | null
  schedule_status: string | null
  lesson_title: string | null
  scripture_reading: string | null
  family_last_name: string | null
  claimed_lesson_id: number | null
  claimed_lesson_title: string | null
}

type Service = { date: string; timeSlot: string; label: string }

/** Monday of the event week for each supported year. */
const EVENT_MONDAY: Record<number, string> = {
  2027: "2027-05-03",
  2026: "2026-05-04",
}

/** The 8 worship services (Mon evening through Fri morning) for a given event year. */
function buildServices(eventYear: number): Service[] {
  const monday = EVENT_MONDAY[eventYear] ?? EVENT_MONDAY[2027]
  const [y, m, d] = monday.split("-").map(Number)
  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri"]
  const services: Service[] = []
  for (let i = 0; i < 5; i++) {
    const date = new Date(y, m - 1, d + i)
    const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
    const dayLabel = `${dayNames[i]} ${date.getMonth() + 1}/${date.getDate()}`
    if (i > 0) services.push({ date: iso, timeSlot: "Morning Devotion", label: `${dayLabel} Morning` })
    if (i < 4) services.push({ date: iso, timeSlot: "Evening Devotion", label: `${dayLabel} Evening` })
  }
  return services
}

/** Slot layout matching what /api/volunteer-schedule and the public schedule expect. */
const SLOTS = [
  { label: "Opening Prayer", type: "Leading prayer", prayerType: "Opening Prayer", lesson: false },
  { label: "[A] Leading singing", type: "Leading singing", prayerType: "A", lesson: false },
  { label: "[B] Leading singing", type: "Leading singing", prayerType: "B", lesson: false },
  { label: "[A] Reading scripture", type: "Reading scripture", prayerType: "A", lesson: false },
  { label: "[A] Presenting a lesson", type: "Presenting a lesson", prayerType: "A", lesson: true },
  { label: "[B] Reading scripture", type: "Reading scripture", prayerType: "B", lesson: false },
  { label: "[B] Presenting a lesson", type: "Presenting a lesson", prayerType: "B", lesson: true },
  { label: "Closing Prayer", type: "Leading prayer", prayerType: "Closing Prayer", lesson: false },
] as const

const VOLUNTEER_TYPES = [
  "Leading singing",
  "Leading prayer",
  "Reading scripture",
  "Presenting a lesson",
] as const

function serviceLabelFrom(
  services: Service[],
  date: string | null,
  timeSlot: string | null,
): string | null {
  const service = services.find((s) => s.date === date && s.timeSlot === timeSlot)
  if (service) return service.label
  if (date && timeSlot) return `${date} ${timeSlot}`
  return null
}

/** Same human = same registration + same name (one signup row per role). */
function personKey(v: Pick<Volunteer, "registration_id" | "volunteer_name">): string {
  return `${v.registration_id ?? "x"}|${v.volunteer_name.trim().toLowerCase()}`
}

/** MIME type used for drag-and-drop; encodes the role so slots only accept matches. */
function dragMime(volunteerType: string): string {
  return `application/x-volunteer-${volunteerType.toLowerCase().replace(/[^a-z]+/g, "-")}`
}

type DraftAssignment = {
  volunteerId: number
  name: string
  family: string | null
  date: string
  timeSlot: string
  prayerType: string
  slotLabel: string
  serviceLabel: string
}

type Props = {
  canManage: boolean
  eventYear: number
}

export function VolunteerScheduleManager({ canManage, eventYear }: Props) {
  const services = useMemo(() => buildServices(eventYear), [eventYear])
  const [volunteers, setVolunteers] = useState<Volunteer[] | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [serviceKey, setServiceKey] = useState(`${services[0].date}|${services[0].timeSlot}`)
  const [busySlot, setBusySlot] = useState<string | null>(null)
  const [rosterSearch, setRosterSearch] = useState("")
  const [rosterType, setRosterType] = useState("all")
  const [lessonDrafts, setLessonDrafts] = useState<Record<number, { title: string; scripture: string }>>({})
  const [autoDraft, setAutoDraft] = useState<DraftAssignment[] | null>(null)
  const [applyingDraft, setApplyingDraft] = useState(false)
  const [dragOverSlot, setDragOverSlot] = useState<string | null>(null)
  const { toast } = useToast()

  const serviceLabel = useCallback(
    (date: string | null, timeSlot: string | null) => serviceLabelFrom(services, date, timeSlot),
    [services],
  )

  useEffect(() => {
    setServiceKey(`${services[0].date}|${services[0].timeSlot}`)
  }, [services])

  useEffect(() => {
    setVolunteers(null)
    setAutoDraft(null)
  }, [eventYear])

  const fetchVolunteers = useCallback(async () => {
    setFetchError(null)
    try {
      const res = await fetch(`/api/admin/volunteers?year=${eventYear}`)
      if (!res.ok) throw new Error(`Could not load volunteers (${res.status})`)
      const data = await res.json()
      setVolunteers(Array.isArray(data.volunteers) ? data.volunteers : [])
    } catch (error) {
      console.error("[volunteers] Fetch failed:", error)
      setVolunteers([])
      setFetchError(error instanceof Error ? error.message : "Could not load volunteers")
    }
  }, [eventYear])

  useEffect(() => {
    void fetchVolunteers()
  }, [fetchVolunteers])

  const [selectedDate, selectedTimeSlot] = serviceKey.split("|")

  const patchVolunteer = async (volunteerId: number, body: Record<string, unknown>) => {
    const res = await fetch(`/api/admin/volunteers/${volunteerId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || "Update failed")
    }
  }

  const assignSlot = async (
    slot: (typeof SLOTS)[number],
    newVolunteerId: string,
    currentOccupant: Volunteer | undefined,
  ) => {
    const slotId = `${slot.type}|${slot.prayerType}`
    setBusySlot(slotId)
    try {
      if (currentOccupant && String(currentOccupant.id) !== newVolunteerId) {
        await patchVolunteer(currentOccupant.id, {})
      }
      if (newVolunteerId !== "none") {
        await patchVolunteer(Number(newVolunteerId), {
          assigned_date: selectedDate,
          time_slot: selectedTimeSlot,
          prayer_type: slot.prayerType,
        })
      }
      await fetchVolunteers()
      toast({
        title: newVolunteerId === "none" ? "Slot cleared" : "Volunteer assigned",
        description: `${slot.label} — ${serviceLabel(selectedDate, selectedTimeSlot)}`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Could not update the slot.",
        variant: "destructive",
      })
    } finally {
      setBusySlot(null)
    }
  }

  const saveLessonDetails = async (volunteer: Volunteer) => {
    const draft = lessonDrafts[volunteer.id]
    if (!draft) return
    if (
      draft.title === (volunteer.lesson_title ?? "") &&
      draft.scripture === (volunteer.scripture_reading ?? "")
    ) {
      return
    }
    try {
      await patchVolunteer(volunteer.id, {
        assigned_date: volunteer.assigned_date,
        time_slot: volunteer.time_slot,
        prayer_type: volunteer.prayer_type,
        lesson_title: draft.title,
        scripture_reading: draft.scripture,
      })
      await fetchVolunteers()
      toast({ title: "Lesson details saved", description: volunteer.volunteer_name })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Could not save lesson details.",
        variant: "destructive",
      })
    }
  }

  const findOccupant = (slot: (typeof SLOTS)[number]) =>
    volunteers?.find(
      (v) =>
        v.volunteer_type === slot.type &&
        v.assigned_date === selectedDate &&
        v.time_slot === selectedTimeSlot &&
        v.prayer_type === slot.prayerType,
    )

  /** True when the same person is already booked that day via a different signup row. */
  const isBookedOnDate = useCallback(
    (candidate: Volunteer, date: string) =>
      (volunteers ?? []).some(
        (v) =>
          v.id !== candidate.id &&
          v.assigned_date === date &&
          personKey(v) === personKey(candidate),
      ),
    [volunteers],
  )

  /**
   * Auto-fill: greedily fills every empty slot across the whole week,
   * spreading assignments so nobody is booked twice in a day and each
   * signup (person + role) is used at most once. Nothing is saved until
   * the admin approves the draft.
   */
  const generateAutoFill = () => {
    if (!volunteers) return
    const usedSignups = new Set(volunteers.filter((v) => v.assigned_date).map((v) => v.id))
    const bookedDays = new Map<string, Set<string>>() // personKey -> dates
    const assignmentCounts = new Map<string, number>() // personKey -> total bookings
    for (const v of volunteers) {
      if (!v.assigned_date) continue
      const key = personKey(v)
      if (!bookedDays.has(key)) bookedDays.set(key, new Set())
      bookedDays.get(key)!.add(v.assigned_date)
      assignmentCounts.set(key, (assignmentCounts.get(key) ?? 0) + 1)
    }

    const draft: DraftAssignment[] = []
    for (const service of services) {
      for (const slot of SLOTS) {
        const occupied = volunteers.some(
          (v) =>
            v.volunteer_type === slot.type &&
            v.assigned_date === service.date &&
            v.time_slot === service.timeSlot &&
            v.prayer_type === slot.prayerType,
        )
        if (occupied) continue

        const candidates = volunteers
          .filter(
            (v) =>
              v.volunteer_type === slot.type &&
              !usedSignups.has(v.id) &&
              !bookedDays.get(personKey(v))?.has(service.date),
          )
          .sort((a, b) => {
            const loadDiff =
              (assignmentCounts.get(personKey(a)) ?? 0) - (assignmentCounts.get(personKey(b)) ?? 0)
            if (loadDiff !== 0) return loadDiff
            // Presenters who already won a lesson topic get lesson slots first.
            if (slot.lesson) {
              const claimDiff = Number(Boolean(b.claimed_lesson_id)) - Number(Boolean(a.claimed_lesson_id))
              if (claimDiff !== 0) return claimDiff
            }
            return a.volunteer_name.localeCompare(b.volunteer_name)
          })

        const pick = candidates[0]
        if (!pick) continue

        const key = personKey(pick)
        usedSignups.add(pick.id)
        if (!bookedDays.has(key)) bookedDays.set(key, new Set())
        bookedDays.get(key)!.add(service.date)
        assignmentCounts.set(key, (assignmentCounts.get(key) ?? 0) + 1)
        draft.push({
          volunteerId: pick.id,
          name: pick.volunteer_name,
          family: pick.family_last_name,
          date: service.date,
          timeSlot: service.timeSlot,
          prayerType: slot.prayerType,
          slotLabel: slot.label,
          serviceLabel: service.label,
        })
      }
    }

    if (draft.length === 0) {
      toast({
        title: "Nothing to fill",
        description: "Every slot is either filled or has no available volunteers.",
      })
      return
    }
    setAutoDraft(draft)
  }

  const applyAutoDraft = async () => {
    if (!autoDraft) return
    setApplyingDraft(true)
    try {
      const res = await fetch("/api/admin/volunteers/bulk-assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignments: autoDraft.map((d) => ({
            id: d.volunteerId,
            assigned_date: d.date,
            time_slot: d.timeSlot,
            prayer_type: d.prayerType,
          })),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Could not apply the schedule")
      setAutoDraft(null)
      await fetchVolunteers()
      toast({
        title: "Schedule applied",
        description: `${data.applied} assignment${data.applied === 1 ? "" : "s"} saved${
          data.skipped?.length ? `, ${data.skipped.length} skipped` : ""
        }.`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Could not apply the schedule.",
        variant: "destructive",
      })
    } finally {
      setApplyingDraft(false)
    }
  }

  const rosterRows = useMemo(() => {
    if (!volunteers) return []
    const search = rosterSearch.trim().toLowerCase()
    return volunteers.filter((v) => {
      if (rosterType !== "all" && v.volunteer_type !== rosterType) return false
      if (!search) return true
      return (
        v.volunteer_name.toLowerCase().includes(search) ||
        (v.family_last_name ?? "").toLowerCase().includes(search)
      )
    })
  }, [volunteers, rosterSearch, rosterType])

  const assignedCount = volunteers?.filter((v) => v.assigned_date).length ?? 0

  return (
    <div className="space-y-6">
      {/* Schedule editor */}
      <Card>
        <CardHeader>
          <CardTitle className="text-widget-heading flex items-center gap-2">
            <CalendarDays className="h-4 w-4" aria-hidden="true" />
            Worship service schedule
          </CardTitle>
          <CardDescription>
            Assign volunteers to each service. Assignments appear immediately on the public
            schedule page and Live Updates displays.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-full max-w-xs">
              <Label htmlFor="service-picker">Service</Label>
              <Select value={serviceKey} onValueChange={setServiceKey}>
                <SelectTrigger id="service-picker" className="min-h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {services.map((service) => (
                    <SelectItem
                      key={`${service.date}|${service.timeSlot}`}
                      value={`${service.date}|${service.timeSlot}`}
                    >
                      {service.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {canManage && (
              <Button
                variant="outline"
                className="min-h-11"
                disabled={volunteers === null || autoDraft !== null}
                onClick={generateAutoFill}
              >
                <Sparkles className="mr-2 h-4 w-4" aria-hidden="true" />
                Auto-fill week
              </Button>
            )}
          </div>

          {autoDraft && (
            <div className="space-y-3 rounded-lg border border-primary/40 bg-primary/5 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">
                  Proposed schedule — {autoDraft.length} assignment{autoDraft.length === 1 ? "" : "s"}
                </p>
                <div className="flex gap-2">
                  <Button size="sm" disabled={applyingDraft} onClick={() => void applyAutoDraft()}>
                    {applyingDraft && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                    )}
                    Approve &amp; apply
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={applyingDraft}
                    onClick={() => setAutoDraft(null)}
                  >
                    Discard
                  </Button>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Nothing is saved until you approve. Everyone is limited to one booking per day and
                one slot per role.
              </p>
              <div className="grid gap-2 md:grid-cols-2">
                {services
                  .filter((s) => autoDraft.some((d) => d.serviceLabel === s.label))
                  .map((service) => (
                    <div key={service.label} className="rounded-md border bg-background p-3">
                      <p className="mb-1 text-sm font-medium">{service.label}</p>
                      <ul className="space-y-0.5 text-sm text-muted-foreground">
                        {autoDraft
                          .filter((d) => d.serviceLabel === service.label)
                          .map((d) => (
                            <li key={`${d.volunteerId}`}>
                              {d.slotLabel}: <span className="text-foreground">{d.name}</span>
                              {d.family ? ` (${d.family})` : ""}
                            </li>
                          ))}
                      </ul>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {canManage && volunteers !== null && !fetchError && (
            <div className="rounded-lg border border-dashed p-3">
              <p className="mb-2 text-sm font-medium">
                Available for {serviceLabel(selectedDate, selectedTimeSlot)}
                <span className="ml-2 font-normal text-muted-foreground">
                  drag a name onto a slot below
                </span>
              </p>
              <div className="flex flex-wrap gap-1.5">
                {volunteers
                  .filter((v) => !v.assigned_date && !isBookedOnDate(v, selectedDate))
                  .map((v) => (
                    <span
                      key={v.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData(dragMime(v.volunteer_type), String(v.id))
                        e.dataTransfer.effectAllowed = "move"
                      }}
                      className="inline-flex cursor-grab items-center gap-1 rounded-full border bg-background px-2.5 py-1 text-xs active:cursor-grabbing"
                      title={`${v.volunteer_name} — ${v.volunteer_type}`}
                    >
                      <GripVertical className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
                      {v.volunteer_name}
                      <span className="text-muted-foreground">· {v.volunteer_type}</span>
                    </span>
                  ))}
                {volunteers.filter((v) => !v.assigned_date && !isBookedOnDate(v, selectedDate))
                  .length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No unbooked volunteers left for this day.
                  </p>
                )}
              </div>
            </div>
          )}

          {volunteers === null ? (
            <AdminListSkeleton rows={4} label="Loading volunteers" />
          ) : fetchError ? (
            <div className="callout-destructive rounded-lg border p-4">
              <p className="text-sm">{fetchError}</p>
              <AdminRetryButton onRetry={() => void fetchVolunteers()} label="Reload volunteers" />
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {SLOTS.map((slot) => {
                const slotId = `${slot.type}|${slot.prayerType}`
                const occupant = findOccupant(slot)
                const candidates = volunteers.filter((v) => v.volunteer_type === slot.type)
                const draft = occupant
                  ? lessonDrafts[occupant.id] ?? {
                      title: occupant.lesson_title ?? "",
                      scripture: occupant.scripture_reading ?? "",
                    }
                  : null

                return (
                  <div
                    key={slotId}
                    className={cn(
                      "space-y-2 rounded-lg border p-4 transition-colors",
                      dragOverSlot === slotId && "border-primary bg-primary/5",
                    )}
                    onDragOver={(e) => {
                      if (!canManage) return
                      if (e.dataTransfer.types.includes(dragMime(slot.type))) {
                        e.preventDefault()
                        e.dataTransfer.dropEffect = "move"
                        setDragOverSlot(slotId)
                      }
                    }}
                    onDragLeave={() => setDragOverSlot((prev) => (prev === slotId ? null : prev))}
                    onDrop={(e) => {
                      setDragOverSlot(null)
                      const id = e.dataTransfer.getData(dragMime(slot.type))
                      if (!id) return
                      e.preventDefault()
                      void assignSlot(slot, id, occupant)
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">{slot.label}</p>
                      {busySlot === slotId && (
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      )}
                    </div>
                    <Select
                      value={occupant ? String(occupant.id) : "none"}
                      onValueChange={(value) => void assignSlot(slot, value, occupant)}
                      disabled={!canManage || busySlot !== null}
                    >
                      <SelectTrigger className="min-h-11" aria-label={`Assign ${slot.label}`}>
                        <SelectValue placeholder="Unassigned" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Unassigned</SelectItem>
                        {candidates.length === 0 && (
                          <SelectItem value="empty" disabled>
                            No "{slot.type}" volunteers signed up
                          </SelectItem>
                        )}
                        {candidates.map((candidate) => {
                          const isOccupant = occupant?.id === candidate.id
                          const bookedToday = !isOccupant && isBookedOnDate(candidate, selectedDate)
                          const elsewhere =
                            candidate.assigned_date &&
                            !(
                              candidate.assigned_date === selectedDate &&
                              candidate.time_slot === selectedTimeSlot &&
                              candidate.prayer_type === slot.prayerType
                            )
                          return (
                            <SelectItem
                              key={candidate.id}
                              value={String(candidate.id)}
                              disabled={bookedToday}
                            >
                              {candidate.volunteer_name}
                              {candidate.family_last_name ? ` (${candidate.family_last_name})` : ""}
                              {bookedToday
                                ? " — already booked this day"
                                : elsewhere
                                  ? ` — currently ${serviceLabel(candidate.assigned_date, candidate.time_slot)}`
                                  : ""}
                            </SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>
                    {slot.lesson && occupant && occupant.claimed_lesson_title && (
                      <p className="rounded-md bg-muted/60 px-2 py-1.5 text-xs text-muted-foreground">
                        Awarded topic: <span className="font-medium text-foreground">{occupant.claimed_lesson_title}</span>{" "}
                        — the fields below (filled by the presenter via their bid link, or by you)
                        override it on the schedule.
                      </p>
                    )}
                    {slot.lesson && occupant && draft && (
                      <div className="grid gap-2 pt-1">
                        <Input
                          value={draft.title}
                          placeholder={occupant.claimed_lesson_title || "Lesson title"}
                          aria-label={`Lesson title for ${slot.label}`}
                          disabled={!canManage}
                          onChange={(e) =>
                            setLessonDrafts((prev) => ({
                              ...prev,
                              [occupant.id]: { ...draft, title: e.target.value },
                            }))
                          }
                          onBlur={() => void saveLessonDetails(occupant)}
                        />
                        <Input
                          value={draft.scripture}
                          placeholder="Scripture (e.g., John 3:16)"
                          aria-label={`Scripture for ${slot.label}`}
                          disabled={!canManage}
                          onChange={(e) =>
                            setLessonDrafts((prev) => ({
                              ...prev,
                              [occupant.id]: { ...draft, scripture: e.target.value },
                            }))
                          }
                          onBlur={() => void saveLessonDetails(occupant)}
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {!canManage && volunteers !== null && (
            <p className="text-sm text-muted-foreground">
              You have view-only access — assignments can't be changed with your role.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Roster */}
      <Card>
        <CardHeader>
          <CardTitle className="text-widget-heading flex items-center gap-2">
            <Users className="h-4 w-4" aria-hidden="true" />
            Volunteer roster
            {volunteers !== null && (
              <Badge variant="secondary">
                {assignedCount}/{volunteers.length} assigned
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Everyone who volunteered for worship services during registration.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="admin-toolbar">
            <div className="admin-toolbar-primary relative">
              <Search
                className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                placeholder="Search volunteers..."
                value={rosterSearch}
                onChange={(e) => setRosterSearch(e.target.value)}
                className="min-h-11 pl-9"
                aria-label="Search volunteers by name or family"
              />
            </div>
            <Select value={rosterType} onValueChange={setRosterType}>
              <SelectTrigger className="admin-toolbar-action w-full min-h-11 sm:w-[220px]">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                {VOLUNTEER_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Family</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Assignment</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {volunteers === null ? (
                  <TableRow>
                    <TableCell colSpan={4}>
                      <AdminListSkeleton rows={5} label="Loading volunteers" />
                    </TableCell>
                  </TableRow>
                ) : rosterRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      {volunteers.length === 0
                        ? "No volunteer signups yet. Families volunteer during registration."
                        : "No volunteers match your search."}
                    </TableCell>
                  </TableRow>
                ) : (
                  rosterRows.map((volunteer) => (
                    <TableRow key={volunteer.id}>
                      <TableCell className="font-medium">{volunteer.volunteer_name}</TableCell>
                      <TableCell>
                        {volunteer.registration_id ? (
                          <Link
                            href={`/admin/registrations/${volunteer.registration_id}`}
                            className="hover:text-primary hover:underline"
                          >
                            {volunteer.family_last_name || `#${volunteer.registration_id}`}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{volunteer.volunteer_type}</Badge>
                      </TableCell>
                      <TableCell>
                        {volunteer.assigned_date ? (
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="default">
                              {serviceLabel(volunteer.assigned_date, volunteer.time_slot)}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {volunteer.prayer_type === "A" || volunteer.prayer_type === "B"
                                ? `Group ${volunteer.prayer_type}`
                                : volunteer.prayer_type}
                            </span>
                            {canManage && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs"
                                onClick={() =>
                                  void (async () => {
                                    try {
                                      await patchVolunteer(volunteer.id, {})
                                      await fetchVolunteers()
                                      toast({
                                        title: "Unassigned",
                                        description: volunteer.volunteer_name,
                                      })
                                    } catch {
                                      toast({
                                        title: "Error",
                                        description: "Could not unassign.",
                                        variant: "destructive",
                                      })
                                    }
                                  })()
                                }
                              >
                                Unassign
                              </Button>
                            )}
                          </div>
                        ) : (
                          <Badge variant="outline">Unassigned</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
