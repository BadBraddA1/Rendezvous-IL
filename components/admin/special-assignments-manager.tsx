"use client"

import { useCallback, useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AdminListSkeleton, AdminRetryButton } from "./admin-panel-states"
import { useToast } from "@/hooks/use-toast"
import { ClipboardList, Download, Loader2, Pencil, Plus, Trash2 } from "lucide-react"

type SpecialAssignment = {
  id: number
  activity_name: string
  assigned_name: string
  assigned_date: string | null
  time_slot: string | null
  notes: string | null
}

type Props = {
  canManage: boolean
  eventYear: number
}

type FormState = {
  activityName: string
  assignedName: string
  assignedDate: string
  timeSlot: string
  notes: string
}

const EMPTY_FORM: FormState = {
  activityName: "",
  assignedName: "",
  assignedDate: "",
  timeSlot: "",
  notes: "",
}

function formatDate(value: string | null): string {
  if (!value) return "—"
  const [y, m, d] = value.split("-").map(Number)
  const parsed = new Date(y, (m ?? 1) - 1, d ?? 1)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleDateString("en-US", { weekday: "short", month: "numeric", day: "numeric" })
}

/** One-off event jobs (song leader for a special session, trash duty, etc.). */
export function SpecialAssignmentsManager({ canManage, eventYear }: Props) {
  const [assignments, setAssignments] = useState<SpecialAssignment[] | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<number | "new" | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [busyId, setBusyId] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    setAssignments(null)
    setEditingId(null)
  }, [eventYear])

  const fetchAssignments = useCallback(async () => {
    setFetchError(null)
    try {
      const res = await fetch(`/api/admin/special-assignments?year=${eventYear}`)
      if (!res.ok) throw new Error(`Could not load special assignments (${res.status})`)
      const data = await res.json()
      setAssignments(Array.isArray(data.assignments) ? data.assignments : [])
    } catch (error) {
      console.error("[special-assignments] Fetch failed:", error)
      setAssignments([])
      setFetchError(error instanceof Error ? error.message : "Could not load special assignments")
    }
  }, [eventYear])

  useEffect(() => {
    void fetchAssignments()
  }, [fetchAssignments])

  const startEdit = (assignment: SpecialAssignment | null) => {
    setEditingId(assignment ? assignment.id : "new")
    setForm(
      assignment
        ? {
            activityName: assignment.activity_name,
            assignedName: assignment.assigned_name,
            assignedDate: assignment.assigned_date ?? "",
            timeSlot: assignment.time_slot ?? "",
            notes: assignment.notes ?? "",
          }
        : EMPTY_FORM,
    )
  }

  const seed = async () => {
    setBusyId("seed")
    try {
      const res = await fetch("/api/admin/special-assignments/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year: eventYear }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Could not load the starter list")
      setAssignments(Array.isArray(data.assignments) ? data.assignments : assignments)
      toast({
        title: "Starter list loaded",
        description: `${data.inserted} activity slots added — book people as they register.`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Could not load the starter list.",
        variant: "destructive",
      })
    } finally {
      setBusyId(null)
    }
  }

  const save = async () => {
    if (!form.activityName.trim()) return
    setBusyId("form")
    try {
      const isNew = editingId === "new"
      const res = await fetch(
        isNew ? "/api/admin/special-assignments" : `/api/admin/special-assignments/${editingId}`,
        {
          method: isNew ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            activityName: form.activityName,
            assignedName: form.assignedName,
            assignedDate: form.assignedDate || null,
            timeSlot: form.timeSlot,
            notes: form.notes,
            year: eventYear,
          }),
        },
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Could not save")
      setAssignments(Array.isArray(data.assignments) ? data.assignments : assignments)
      setEditingId(null)
      setForm(EMPTY_FORM)
      toast({
        title: isNew ? "Assignment added" : "Assignment updated",
        description: form.assignedName.trim()
          ? `${form.activityName} — ${form.assignedName}`
          : `${form.activityName} (unassigned)`,
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

  const remove = async (assignment: SpecialAssignment) => {
    const who = assignment.assigned_name ? ` (${assignment.assigned_name})` : ""
    if (!window.confirm(`Delete "${assignment.activity_name}"${who}?`)) return
    setBusyId(`row-${assignment.id}`)
    try {
      const res = await fetch(
        `/api/admin/special-assignments/${assignment.id}?year=${eventYear}`,
        { method: "DELETE" },
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Could not delete")
      setAssignments(Array.isArray(data.assignments) ? data.assignments : assignments)
      toast({ title: "Assignment deleted", description: assignment.activity_name })
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-widget-heading flex items-center gap-2">
          <ClipboardList className="h-4 w-4" aria-hidden="true" />
          Special assignments
          {assignments !== null && <Badge variant="secondary">{assignments.length}</Badge>}
        </CardTitle>
        <CardDescription>
          One-off jobs outside the worship service rotation — special sessions, setup crews,
          anything you want tracked with a name on it.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {assignments === null ? (
          <AdminListSkeleton rows={4} label="Loading special assignments" />
        ) : fetchError ? (
          <div className="callout-destructive rounded-lg border p-4">
            <p className="text-sm">{fetchError}</p>
            <AdminRetryButton onRetry={() => void fetchAssignments()} label="Reload" />
          </div>
        ) : (
          <>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Activity</TableHead>
                    <TableHead>Assigned to</TableHead>
                    <TableHead>When</TableHead>
                    {canManage && <TableHead className="w-24" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={canManage ? 4 : 3} className="py-6 text-center text-muted-foreground">
                        <p>No special assignments yet.</p>
                        {canManage && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-3"
                            disabled={busyId === "seed"}
                            onClick={() => void seed()}
                          >
                            {busyId === "seed" ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                            ) : (
                              <Download className="mr-2 h-4 w-4" aria-hidden="true" />
                            )}
                            Load last year&apos;s activity list
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ) : (
                    assignments.map((assignment) => (
                      <TableRow key={assignment.id}>
                        <TableCell className="font-medium">
                          {assignment.activity_name}
                          {assignment.notes && (
                            <p className="text-xs font-normal text-muted-foreground">{assignment.notes}</p>
                          )}
                        </TableCell>
                        <TableCell>
                          {assignment.assigned_name ? (
                            assignment.assigned_name
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground">
                              Unassigned
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {formatDate(assignment.assigned_date)}
                          {assignment.time_slot ? ` · ${assignment.time_slot}` : ""}
                        </TableCell>
                        {canManage && (
                          <TableCell>
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                aria-label={`Edit ${assignment.activity_name}`}
                                onClick={() => startEdit(assignment)}
                              >
                                <Pencil className="h-4 w-4" aria-hidden="true" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive"
                                aria-label={`Delete ${assignment.activity_name}`}
                                disabled={busyId === `row-${assignment.id}`}
                                onClick={() => void remove(assignment)}
                              >
                                {busyId === `row-${assignment.id}` ? (
                                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                                ) : (
                                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                                )}
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {canManage &&
              (editingId !== null ? (
                <div className="space-y-3 rounded-lg border border-dashed p-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <Label htmlFor="sa-activity">Activity *</Label>
                      <Input
                        id="sa-activity"
                        value={form.activityName}
                        placeholder="e.g., Song leader — Moms' session"
                        onChange={(e) => setForm((p) => ({ ...p, activityName: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="sa-person">Assigned to</Label>
                      <Input
                        id="sa-person"
                        value={form.assignedName}
                        placeholder="Leave blank until someone is booked"
                        onChange={(e) => setForm((p) => ({ ...p, assignedName: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="sa-date">Date</Label>
                      <Input
                        id="sa-date"
                        type="date"
                        value={form.assignedDate}
                        onChange={(e) => setForm((p) => ({ ...p, assignedDate: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="sa-time">Time / session</Label>
                      <Input
                        id="sa-time"
                        value={form.timeSlot}
                        placeholder="e.g., 2:00 PM or Afternoon"
                        onChange={(e) => setForm((p) => ({ ...p, timeSlot: e.target.value }))}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="sa-notes">Notes</Label>
                      <Input
                        id="sa-notes"
                        value={form.notes}
                        placeholder="Optional details"
                        onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => void save()}
                      disabled={!form.activityName.trim() || busyId === "form"}
                    >
                      {busyId === "form" && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                      )}
                      {editingId === "new" ? "Add assignment" : "Save changes"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <Button variant="outline" size="sm" onClick={() => startEdit(null)}>
                  <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                  Add assignment
                </Button>
              ))}
          </>
        )}
      </CardContent>
    </Card>
  )
}
