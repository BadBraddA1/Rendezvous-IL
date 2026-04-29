"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Send, Megaphone, Trash2, Eye, EyeOff, RefreshCw } from "lucide-react"

interface Announcement {
  id: number
  title: string
  message: string
  priority: string
  is_active: boolean
  show_on_live_updates: boolean
  show_on_schedule: boolean
  sent_to_groupme: boolean
  groupme_message_id: string | null
  created_at: string
  expires_at: string | null
  created_by: string | null
}

interface MessagingFormProps {
  initialAnnouncements: Announcement[]
}

export function MessagingForm({ initialAnnouncements }: MessagingFormProps) {
  const [announcements, setAnnouncements] = useState<Announcement[]>(initialAnnouncements)
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState("")
  
  // Form state
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [priority, setPriority] = useState("normal")
  const [sendToGroupMe, setSendToGroupMe] = useState(false)
  const [showOnLiveUpdates, setShowOnLiveUpdates] = useState(true)
  const [showOnSchedule, setShowOnSchedule] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage("")

    try {
      const res = await fetch("/api/admin/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          message: content,
          priority,
          sendToGroupMe,
          showOnLiveUpdates,
          showOnSchedule,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        setMessage("Announcement created successfully!")
        setTitle("")
        setContent("")
        setPriority("normal")
        setSendToGroupMe(false)
        setShowOnLiveUpdates(true)
        setShowOnSchedule(false)
        
        // Refresh announcements
        await refreshAnnouncements()
      } else {
        setMessage(data.error || "Failed to create announcement")
      }
    } catch {
      setMessage("Error creating announcement")
    } finally {
      setIsLoading(false)
    }
  }

  const refreshAnnouncements = async () => {
    try {
      const res = await fetch("/api/admin/announcements")
      const data = await res.json()
      if (data.announcements) {
        setAnnouncements(data.announcements)
      }
    } catch {
      console.error("Error refreshing announcements")
    }
  }

  const toggleActive = async (id: number, currentState: boolean) => {
    try {
      await fetch(`/api/admin/announcements/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !currentState }),
      })
      await refreshAnnouncements()
    } catch {
      console.error("Error toggling announcement")
    }
  }

  const deleteAnnouncement = async (id: number) => {
    if (!confirm("Are you sure you want to delete this announcement?")) return
    
    try {
      await fetch(`/api/admin/announcements/${id}`, {
        method: "DELETE",
      })
      await refreshAnnouncements()
    } catch {
      console.error("Error deleting announcement")
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Create New Announcement */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5" />
            Create Announcement
          </CardTitle>
          <CardDescription>
            Send messages to GroupMe and display on Live Updates & Schedule pages
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Announcement title..."
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Message</Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Type your message here..."
                rows={4}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4 pt-4 border-t">
              <h4 className="font-medium">Display Options</h4>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="groupme">Send to GroupMe</Label>
                  <p className="text-xs text-muted-foreground">Post message to GroupMe group</p>
                </div>
                <Switch
                  id="groupme"
                  checked={sendToGroupMe}
                  onCheckedChange={setSendToGroupMe}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="liveUpdates">Show on /LU (Live Updates)</Label>
                  <p className="text-xs text-muted-foreground">Display on Live Updates screen</p>
                </div>
                <Switch
                  id="liveUpdates"
                  checked={showOnLiveUpdates}
                  onCheckedChange={setShowOnLiveUpdates}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="schedule">Show on /schedule</Label>
                  <p className="text-xs text-muted-foreground">Display on Schedule page</p>
                </div>
                <Switch
                  id="schedule"
                  checked={showOnSchedule}
                  onCheckedChange={setShowOnSchedule}
                />
              </div>
            </div>

            {message && (
              <p className={`text-sm ${message.includes("success") ? "text-green-600" : "text-red-600"}`}>
                {message}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              {isLoading ? "Sending..." : "Create Announcement"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Existing Announcements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Recent Announcements</span>
            <Button variant="ghost" size="sm" onClick={refreshAnnouncements}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </CardTitle>
          <CardDescription>
            Manage your existing announcements
          </CardDescription>
        </CardHeader>
        <CardContent>
          {announcements.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No announcements yet</p>
          ) : (
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
              {announcements.map((ann) => (
                <div 
                  key={ann.id} 
                  className={`p-4 rounded-lg border ${
                    !ann.is_active ? "opacity-50 bg-muted/50" : ""
                  } ${
                    ann.priority === "urgent" ? "border-red-500/50 bg-red-500/5" :
                    ann.priority === "high" ? "border-orange-500/50 bg-orange-500/5" :
                    ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className="font-semibold">{ann.title}</h4>
                    <div className="flex gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => toggleActive(ann.id, ann.is_active)}
                      >
                        {ann.is_active ? (
                          <Eye className="h-4 w-4" />
                        ) : (
                          <EyeOff className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:text-red-600"
                        onClick={() => deleteAnnouncement(ann.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{ann.message}</p>
                  
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    <Badge variant={ann.priority === "urgent" ? "destructive" : ann.priority === "high" ? "default" : "secondary"}>
                      {ann.priority}
                    </Badge>
                    {ann.show_on_live_updates && (
                      <Badge variant="outline">/LU</Badge>
                    )}
                    {ann.show_on_schedule && (
                      <Badge variant="outline">/schedule</Badge>
                    )}
                    {ann.sent_to_groupme && (
                      <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/50">
                        GroupMe
                      </Badge>
                    )}
                  </div>
                  
                  <p className="text-xs text-muted-foreground">
                    {formatDate(ann.created_at)}
                    {ann.created_by && ` by ${ann.created_by}`}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
