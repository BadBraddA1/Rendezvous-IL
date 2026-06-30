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
import { Megaphone, Send, Trash2, Loader2 } from "lucide-react"
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
  sent_to_groupme?: boolean
  groupme_message_id?: string | null
  created_at: string
  expires_at?: string | null
  created_by?: string
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
  const [sendToGroupMe, setSendToGroupMe] = useState(false)
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
    setSubmitting(true)
    try {
      const res = await fetch("/api/admin/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, message, priority, sendToGroupMe, showOnLiveUpdates, showOnSchedule }),
      })
      if (!res.ok) throw new Error("Failed")
      toast({ title: "Announcement created", description: sendToGroupMe ? "Sent to GroupMe" : "Posted live" })
      setTitle("")
      setMessage("")
      setPriority("normal")
      setSendToGroupMe(false)
      setShowOnLiveUpdates(true)
      setShowOnSchedule(false)
      void fetchData()
    } catch {
      toast({ title: "Error", description: "Failed to create announcement", variant: "destructive" })
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
      {/* CREATE */}
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
                <Label htmlFor="groupme" className="cursor-pointer">Also send to GroupMe</Label>
                <Switch id="groupme" checked={sendToGroupMe} onCheckedChange={setSendToGroupMe} />
              </div>
            </div>
            <Button onClick={handleCreate} disabled={submitting} className="w-full gap-2">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Post Announcement
            </Button>
          </CardContent>
        </Card>
      )}

      {/* LIST */}
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
              {items.map((a) => (
                <div key={a.id} className="rounded-lg border p-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="break-words font-semibold">{a.title}</h4>
                        {a.priority === "urgent" && <Badge variant="destructive" className="text-xs">Urgent</Badge>}
                        {a.priority === "high" && <Badge variant="secondary" className="text-xs">High</Badge>}
                        {!a.is_active && <Badge variant="outline" className="text-xs">Inactive</Badge>}
                        {a.sent_to_groupme && <Badge variant="default" className="text-xs">GroupMe</Badge>}
                      </div>
                      <p className="mt-1 break-words text-sm">{a.message}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {new Date(a.created_at).toLocaleString()}
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
              ))}
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
