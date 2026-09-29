"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Bell, Megaphone, Send, Trash2, Loader2 } from "lucide-react"
import { AdminConfirmDialog } from "./admin-confirm-dialog"
import { AdminListSkeleton, AdminRetryButton } from "./admin-panel-states"

type Announcement = {
  id: number
  title: string
  message: string
  priority: string
  is_active: boolean
  show_on_live_updates: boolean
  show_on_schedule: boolean
  send_push?: boolean
  publish_at?: string | null
  push_sent_at?: string | null
  schedule_event_id?: number | null
  created_at: string
  expires_at?: string | null
  created_by?: string
}

/** Convert a datetime-local value (Central wall clock) to an ISO string with Chicago offset. */
function centralLocalToIso(localValue: string): string | null {
  const trimmed = localValue.trim()
  if (!trimmed) return null
  // datetime-local is "YYYY-MM-DDTHH:mm"
  const match = trimmed.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/)
  if (!match) return null
  const isoDate = match[1]
  const month = Number(isoDate.slice(5, 7))
  const offset = month >= 3 && month <= 10 ? "-05:00" : "-06:00"
  return `${isoDate}T${match[2]}:${match[3]}:00${offset}`
}

function formatPublishAt(value: string | null | undefined): string | null {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleString("en-US", { timeZone: "America/Chicago" }) + " CT"
}

export function AnnouncementsManager({ canEdit }: { canEdit: boolean }) {
  const [items, setItems] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [title, setTitle] = useState("")
  const [message, setMessage] = useState("")
  const [priority, setPriority] = useState("normal")
  const [showOnLiveUpdates, setShowOnLiveUpdates] = useState(true)
  const [showOnSchedule, setShowOnSchedule] = useState(false)
  const [sendPush, setSendPush] = useState(false)
  const [scheduleForLater, setScheduleForLater] = useState(false)
  const [publishLocal, setPublishLocal] = useState("")
  const [deletePending, setDeletePending] = useState<Announcement | null>(null)
  const [deleting, setDeleting] = useState(false)
  const { toast } = useToast()

  const fetchData = useCallback(async () => {
    setLoading(true)
    setFetchError(null)
    try {
      const res = await fetch("/api/admin/announcements")
      if (!res.ok) throw new Error(`Could not load announcements (${res.status})`)
      const data = await res.json()
      const list = Array.isArray(data) ? data : data?.announcements || []
      setItems(list)
    } catch (error) {
      console.error("[v0] Failed to fetch announcements:", error)
      setItems([])
      setFetchError(error instanceof Error ? error.message : "Could not load announcements")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  const handleCreate = async () => {
    if (!title.trim() || !message.trim()) {
      toast({ title: "Missing fields", description: "Title and message are required", variant: "destructive" })
      return
    }
    let publishAt: string | null = null
    if (scheduleForLater) {
      publishAt = centralLocalToIso(publishLocal)
      if (!publishAt) {
        toast({
          title: "Pick a time",
          description: "Choose when this announcement should go live (Central Time).",
          variant: "destructive",
        })
        return
      }
    }
    setSubmitting(true)
    try {
      const res = await fetch("/api/admin/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          message,
          priority,
          showOnLiveUpdates,
          showOnSchedule,
          sendPush,
          publishAt,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Failed")
      toast({
        title: scheduleForLater ? "Announcement scheduled" : "Announcement created",
        description: data.message || (scheduleForLater ? "Will publish at the chosen time" : "Posted live"),
      })
      setTitle("")
      setMessage("")
      setPriority("normal")
      setShowOnLiveUpdates(true)
      setShowOnSchedule(false)
      setSendPush(false)
      setScheduleForLater(false)
      setPublishLocal("")
      void fetchData()
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create announcement",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const toggleActive = async (a: Announcement) => {
    try {
      const res = await fetch(`/api/admin/announcements/${a.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !a.is_active }),
      })
      if (!res.ok) throw new Error("Failed")
      void fetchData()
    } catch {
      toast({ title: "Error", description: "Could not update", variant: "destructive" })
    }
  }

  const performDelete = async () => {
    if (!deletePending) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/announcements/${deletePending.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed")
      toast({ title: "Announcement deleted", description: `"${deletePending.title}" was removed.` })
      setDeletePending(null)
      void fetchData()
    } catch {
      toast({ title: "Error", description: "Could not delete announcement.", variant: "destructive" })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
    <div className="grid gap-6 lg:grid-cols-2">
      {canEdit && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Megaphone className="h-5 w-5" />
              New Announcement
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Dinner is served!" />
            </div>
            <div>
              <Label>Message</Label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Head to the dining hall..."
                rows={4}
              />
            </div>
            <div>
              <Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="live-updates" className="cursor-pointer">Show on Live Updates page</Label>
                <Switch id="live-updates" checked={showOnLiveUpdates} onCheckedChange={setShowOnLiveUpdates} />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="schedule" className="cursor-pointer">Show on Schedule page</Label>
                <Switch id="schedule" checked={showOnSchedule} onCheckedChange={setShowOnSchedule} />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="send-push" className="cursor-pointer flex items-center gap-1.5">
                  <Bell className="h-3.5 w-3.5" aria-hidden="true" />
                  Send app push
                </Label>
                <Switch id="send-push" checked={sendPush} onCheckedChange={setSendPush} />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="schedule-later" className="cursor-pointer">Schedule for later (Central)</Label>
                <Switch
                  id="schedule-later"
                  checked={scheduleForLater}
                  onCheckedChange={setScheduleForLater}
                />
              </div>
              {scheduleForLater && (
                <div>
                  <Label htmlFor="publish-at">Go live at</Label>
                  <Input
                    id="publish-at"
                    type="datetime-local"
                    value={publishLocal}
                    onChange={(e) => setPublishLocal(e.target.value)}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Times are America/Chicago. Cron publishes every minute.
                  </p>
                </div>
              )}
            </div>
            <Button onClick={handleCreate} disabled={submitting} className="w-full gap-2">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {scheduleForLater ? "Schedule Announcement" : "Post Announcement"}
            </Button>
          </CardContent>
        </Card>
      )}

      <Card className={canEdit ? "" : "lg:col-span-2"}>
        <CardHeader>
          <CardTitle>Recent Announcements</CardTitle>
        </CardHeader>
        <CardContent>
          {fetchError && !loading ? (
            <div className="callout-destructive rounded-lg border p-4">
              <p className="text-sm">{fetchError}</p>
              <AdminRetryButton onRetry={() => void fetchData()} label="Reload announcements" />
            </div>
          ) : loading ? (
            <AdminListSkeleton rows={4} label="Loading announcements" />
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No announcements yet. Post one to show it on live updates or the schedule.</p>
          ) : (
            <div className="space-y-3">
              {items.map((a) => {
                const scheduled = !a.is_active && a.publish_at
                return (
                  <div key={a.id} className="rounded-lg border p-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="break-words font-semibold">{a.title}</h4>
                          {a.priority === "urgent" && <Badge variant="destructive" className="text-xs">Urgent</Badge>}
                          {a.priority === "high" && <Badge variant="secondary" className="text-xs">High</Badge>}
                          {scheduled && <Badge variant="outline" className="text-xs">Scheduled</Badge>}
                          {!a.is_active && !scheduled && <Badge variant="outline" className="text-xs">Inactive</Badge>}
                          {a.send_push && (
                            <Badge variant="outline" className="gap-1 text-xs">
                              <Bell className="h-3 w-3" aria-hidden="true" />
                              {a.push_sent_at ? "Pushed" : "Push pending"}
                            </Badge>
                          )}
                          {a.schedule_event_id ? (
                            <Badge variant="outline" className="text-xs">Event ping</Badge>
                          ) : null}
                        </div>
                        <p className="mt-1 break-words text-sm">{a.message}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {scheduled
                            ? `Goes live ${formatPublishAt(a.publish_at)}`
                            : new Date(a.created_at).toLocaleString()}
                        </p>
                      </div>
                      {canEdit && (
                        <div className="flex shrink-0 items-center gap-2 self-start sm:flex-col sm:items-end">
                          <Switch
                            checked={a.is_active}
                            onCheckedChange={() => toggleActive(a)}
                            aria-label={a.is_active ? `Hide ${a.title} from live surfaces` : `Show ${a.title} on live surfaces`}
                          />
                          <Button
                            onClick={() => setDeletePending(a)}
                            size="icon"
                            variant="ghost"
                            className="touch-target text-destructive hover:text-destructive"
                            aria-label={`Delete announcement: ${a.title}`}
                          >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>

    <AdminConfirmDialog
      open={deletePending !== null}
      onOpenChange={(open) => {
        if (!open && !deleting) setDeletePending(null)
      }}
      title="Delete announcement?"
      description={
        deletePending
          ? `Delete "${deletePending.title}"? It will be removed from live updates and the schedule.`
          : ""
      }
      confirmLabel="Delete announcement"
      loading={deleting}
      onConfirm={performDelete}
    />
    </>
  )
}
