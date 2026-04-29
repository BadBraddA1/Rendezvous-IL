"use client"

import { useState, useEffect } from "react"
import { AdminNav } from "@/components/admin/admin-nav"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Megaphone, Send, Trash2, Clock, AlertTriangle, Info, AlertCircle } from "lucide-react"

type Announcement = {
  id: number
  title: string | null
  message: string
  priority: 'low' | 'normal' | 'high' | 'urgent'
  expires_at: string | null
  created_at: string
  sent_to_groupme?: boolean
}

export default function AdminAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  
  // Form state
  const [title, setTitle] = useState("")
  const [message, setMessage] = useState("")
  const [priority, setPriority] = useState<string>("normal")
  const [expiresIn, setExpiresIn] = useState<string>("")
  const [sendToGroupMe, setSendToGroupMe] = useState(false)

  useEffect(() => {
    fetchAnnouncements()
  }, [])

  const fetchAnnouncements = async () => {
    try {
      const res = await fetch('/api/announcements')
      const data = await res.json()
      setAnnouncements(data)
    } catch (error) {
      console.error('Failed to fetch announcements:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim()) return

    setSubmitting(true)
    try {
      // Calculate expiration time if set
      let expires_at = null
      if (expiresIn) {
        const now = new Date()
        const hours = parseInt(expiresIn)
        expires_at = new Date(now.getTime() + hours * 60 * 60 * 1000).toISOString()
      }

      const res = await fetch('/api/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim() || null,
          message: message.trim(),
          priority,
          expires_at,
          send_to_groupme: sendToGroupMe
        })
      })

      if (res.ok) {
        // Reset form
        setTitle("")
        setMessage("")
        setPriority("normal")
        setExpiresIn("")
        setSendToGroupMe(false)
        // Refresh list
        fetchAnnouncements()
      }
    } catch (error) {
      console.error('Failed to create announcement:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to remove this announcement?')) return

    try {
      await fetch(`/api/announcements?id=${id}`, { method: 'DELETE' })
      fetchAnnouncements()
    } catch (error) {
      console.error('Failed to delete announcement:', error)
    }
  }

  const getPriorityIcon = (p: string) => {
    switch (p) {
      case 'urgent': return <AlertCircle className="h-4 w-4 text-red-500" />
      case 'high': return <AlertTriangle className="h-4 w-4 text-orange-500" />
      case 'normal': return <Info className="h-4 w-4 text-blue-500" />
      default: return <Info className="h-4 w-4 text-gray-400" />
    }
  }

  const getPriorityBadge = (p: string) => {
    const classes = {
      urgent: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
      normal: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      low: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
    }
    return classes[p as keyof typeof classes] || classes.normal
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminNav />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Megaphone className="h-8 w-8 text-primary" />
            Live Announcements
          </h1>
          <p className="text-muted-foreground mt-2">
            Create announcements that appear on the Live Updates display and Schedule page. Optionally send to GroupMe.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Create Announcement Form */}
          <Card>
            <CardHeader>
              <CardTitle>New Announcement</CardTitle>
              <CardDescription>
                Create a live update for venue displays and the schedule page
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title (optional)</Label>
                  <Input
                    id="title"
                    placeholder="e.g., Schedule Change"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Message *</Label>
                  <Textarea
                    id="message"
                    placeholder="Enter your announcement message..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={4}
                    required
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
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

                  <div className="space-y-2">
                    <Label htmlFor="expires">Auto-expire after</Label>
                    <Select value={expiresIn} onValueChange={setExpiresIn}>
                      <SelectTrigger>
                        <SelectValue placeholder="Never" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Never</SelectItem>
                        <SelectItem value="1">1 hour</SelectItem>
                        <SelectItem value="2">2 hours</SelectItem>
                        <SelectItem value="4">4 hours</SelectItem>
                        <SelectItem value="8">8 hours</SelectItem>
                        <SelectItem value="24">24 hours</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <Label htmlFor="groupme" className="text-base">Send to GroupMe</Label>
                    <p className="text-sm text-muted-foreground">
                      Also post this announcement to the GroupMe chat
                    </p>
                  </div>
                  <Switch
                    id="groupme"
                    checked={sendToGroupMe}
                    onCheckedChange={setSendToGroupMe}
                  />
                </div>

                <Button type="submit" className="w-full gap-2" disabled={submitting || !message.trim()}>
                  <Send className="h-4 w-4" />
                  {submitting ? 'Posting...' : 'Post Announcement'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Active Announcements */}
          <Card>
            <CardHeader>
              <CardTitle>Active Announcements</CardTitle>
              <CardDescription>
                Currently showing on displays ({announcements.length} active)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-muted-foreground text-center py-8">Loading...</p>
              ) : announcements.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No active announcements</p>
              ) : (
                <div className="space-y-4">
                  {announcements.map((ann) => (
                    <div
                      key={ann.id}
                      className="flex items-start justify-between gap-4 rounded-lg border p-4"
                    >
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          {getPriorityIcon(ann.priority)}
                          {ann.title && (
                            <span className="font-semibold">{ann.title}</span>
                          )}
                          <span className={`text-xs px-2 py-0.5 rounded-full ${getPriorityBadge(ann.priority)}`}>
                            {ann.priority}
                          </span>
                          {ann.sent_to_groupme && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                              GroupMe
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{ann.message}</p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>
                            Posted {new Date(ann.created_at).toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit',
                              hour12: true
                            })}
                          </span>
                          {ann.expires_at && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Expires {new Date(ann.expires_at).toLocaleString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit',
                                hour12: true
                              })}
                            </span>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(ann.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
