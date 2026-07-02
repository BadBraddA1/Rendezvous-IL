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
import { CalendarDays, Loader2, Search, Users } from "lucide-react"

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
}

/** The 9 worship services rendered on /schedule (Mon evening through Fri morning). */
const SERVICES = [
  { date: "2027-05-03", timeSlot: "Evening Devotion", label: "Mon 5/3 Evening" },
  { date: "2027-05-04", timeSlot: "Morning Devotion", label: "Tue 5/4 Morning" },
  { date: "2027-05-04", timeSlot: "Evening Devotion", label: "Tue 5/4 Evening" },
  { date: "2027-05-05", timeSlot: "Morning Devotion", label: "Wed 5/5 Morning" },
  { date: "2027-05-05", timeSlot: "Evening Devotion", label: "Wed 5/5 Evening" },
  { date: "2027-05-06", timeSlot: "Morning Devotion", label: "Thu 5/6 Morning" },
  { date: "2027-05-06", timeSlot: "Evening Devotion", label: "Thu 5/6 Evening" },
  { date: "2027-05-07", timeSlot: "Morning Devotion", label: "Fri 5/7 Morning" },
] as const

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

function serviceLabel(date: string | null, timeSlot: string | null): string | null {
  const service = SERVICES.find((s) => s.date === date && s.timeSlot === timeSlot)
  if (service) return service.label
  if (date && timeSlot) return `${date} ${timeSlot}`
  return null
}

type Props = {
  canManage: boolean
}

export function VolunteerScheduleManager({ canManage }: Props) {
  const [volunteers, setVolunteers] = useState<Volunteer[] | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [serviceKey, setServiceKey] = useState(`${SERVICES[0].date}|${SERVICES[0].timeSlot}`)
  const [busySlot, setBusySlot] = useState<string | null>(null)
  const [rosterSearch, setRosterSearch] = useState("")
  const [rosterType, setRosterType] = useState("all")
  const [lessonDrafts, setLessonDrafts] = useState<Record<number, { title: string; scripture: string }>>({})
  const { toast } = useToast()

  const fetchVolunteers = useCallback(async () => {
    setFetchError(null)
    try {
      const res = await fetch("/api/admin/volunteers")
      if (!res.ok) throw new Error(`Could not load volunteers (${res.status})`)
      const data = await res.json()
      setVolunteers(Array.isArray(data.volunteers) ? data.volunteers : [])
    } catch (error) {
      console.error("[volunteers] Fetch failed:", error)
      setVolunteers([])
      setFetchError(error instanceof Error ? error.message : "Could not load volunteers")
    }
  }, [])

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
          <div className="max-w-xs">
            <Label htmlFor="service-picker">Service</Label>
            <Select value={serviceKey} onValueChange={setServiceKey}>
              <SelectTrigger id="service-picker" className="min-h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SERVICES.map((service) => (
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
                  <div key={slotId} className="space-y-2 rounded-lg border p-4">
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
                          const elsewhere =
                            candidate.assigned_date &&
                            !(
                              candidate.assigned_date === selectedDate &&
                              candidate.time_slot === selectedTimeSlot &&
                              candidate.prayer_type === slot.prayerType
                            )
                          return (
                            <SelectItem key={candidate.id} value={String(candidate.id)}>
                              {candidate.volunteer_name}
                              {candidate.family_last_name ? ` (${candidate.family_last_name})` : ""}
                              {elsewhere
                                ? ` — currently ${serviceLabel(candidate.assigned_date, candidate.time_slot)}`
                                : ""}
                            </SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>
                    {slot.lesson && occupant && draft && (
                      <div className="grid gap-2 pt-1">
                        <Input
                          value={draft.title}
                          placeholder="Lesson title"
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
