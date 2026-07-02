"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AdminListSkeleton, AdminRetryButton } from "./admin-panel-states"
import { useToast } from "@/hooks/use-toast"
import { BookOpen, Loader2, Mail, Pencil, Plus, Trash2, Trophy, X } from "lucide-react"

type Topic = {
  id: number
  title: string
  lesson_title: string | null
  scripture: string | null
  description: string | null
  claimed_by_volunteer_id: number | null
  assigned_presenter_name: string | null
}

type Presenter = {
  id: number
  registration_id: number | null
  volunteer_name: string
  volunteer_type: string
  family_last_name: string | null
  lesson_bid_sent_at: string | null
  claimed_lesson_id: number | null
  claimed_lesson_title: string | null
  bid_submitted_at: string | null
  bid_email: string | null
  pick_1: number | null
  pick_2: number | null
  pick_3: number | null
}

type Props = {
  canManage: boolean
  eventYear: number
}

function formatDate(value: string | null): string {
  if (!value) return ""
  const date = new Date(value.includes("T") ? value : `${value.replace(" ", "T")}Z`)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

export function LessonBidManager({ canManage, eventYear }: Props) {
  const [topics, setTopics] = useState<Topic[] | null>(null)
  const [presenters, setPresenters] = useState<Presenter[] | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const { toast } = useToast()

  // Topic form state (shared between "add" and "edit")
  const [editingTopicId, setEditingTopicId] = useState<number | "new" | null>(null)
  const [topicTitle, setTopicTitle] = useState("")
  const [topicLessonTitle, setTopicLessonTitle] = useState("")
  const [topicScripture, setTopicScripture] = useState("")

  useEffect(() => {
    setTopics(null)
    setPresenters(null)
  }, [eventYear])

  const fetchAll = useCallback(async () => {
    setFetchError(null)
    try {
      const [topicsRes, volunteersRes] = await Promise.all([
        fetch(`/api/admin/lesson-topics?year=${eventYear}`),
        fetch(`/api/admin/volunteers?year=${eventYear}`),
      ])
      if (!topicsRes.ok) throw new Error(`Could not load topics (${topicsRes.status})`)
      if (!volunteersRes.ok) throw new Error(`Could not load volunteers (${volunteersRes.status})`)
      const topicsData = await topicsRes.json()
      const volunteersData = await volunteersRes.json()
      setTopics(Array.isArray(topicsData.topics) ? topicsData.topics : [])
      const all = Array.isArray(volunteersData.volunteers) ? volunteersData.volunteers : []
      setPresenters(all.filter((v: Presenter) => v.volunteer_type === "Presenting a lesson"))
    } catch (error) {
      console.error("[lesson-bids] Fetch failed:", error)
      setTopics([])
      setPresenters([])
      setFetchError(error instanceof Error ? error.message : "Could not load lesson bid data")
    }
  }, [eventYear])

  useEffect(() => {
    void fetchAll()
  }, [fetchAll])

  const topicById = useMemo(() => {
    const map = new Map<number, Topic>()
    for (const topic of topics ?? []) map.set(topic.id, topic)
    return map
  }, [topics])

  const startEdit = (topic: Topic | null) => {
    setEditingTopicId(topic ? topic.id : "new")
    setTopicTitle(topic?.title ?? "")
    setTopicLessonTitle(topic?.lesson_title ?? "")
    setTopicScripture(topic?.scripture ?? "")
  }

  const cancelEdit = () => {
    setEditingTopicId(null)
    setTopicTitle("")
    setTopicLessonTitle("")
    setTopicScripture("")
  }

  const saveTopic = async () => {
    if (!topicTitle.trim()) return
    setBusyId("topic-form")
    try {
      const isNew = editingTopicId === "new"
      const res = await fetch(
        isNew ? "/api/admin/lesson-topics" : `/api/admin/lesson-topics/${editingTopicId}`,
        {
          method: isNew ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: topicTitle.trim(),
            lessonTitle: topicLessonTitle.trim(),
            scripture: topicScripture.trim(),
            year: eventYear,
          }),
        },
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Could not save the topic")
      setTopics(Array.isArray(data.topics) ? data.topics : topics)
      cancelEdit()
      toast({ title: isNew ? "Topic added" : "Topic updated", description: topicTitle.trim() })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Could not save the topic.",
        variant: "destructive",
      })
    } finally {
      setBusyId(null)
    }
  }

  const removeTopic = async (topic: Topic) => {
    if (!window.confirm(`Delete topic "${topic.title}"?`)) return
    setBusyId(`topic-${topic.id}`)
    try {
      const res = await fetch(`/api/admin/lesson-topics/${topic.id}?year=${eventYear}`, {
        method: "DELETE",
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Could not delete the topic")
      setTopics(Array.isArray(data.topics) ? data.topics : topics)
      toast({ title: "Topic deleted", description: topic.title })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Could not delete the topic.",
        variant: "destructive",
      })
    } finally {
      setBusyId(null)
    }
  }

  const bidAction = async (
    presenter: Presenter,
    action: "invite" | "award" | "unaward",
    topicId?: number,
  ) => {
    setBusyId(`presenter-${presenter.id}`)
    try {
      const res = await fetch(`/api/admin/volunteers/${presenter.id}/lesson-bid`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, topicId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Action failed")
      await fetchAll()
      toast({
        title:
          action === "invite"
            ? `Invite sent to ${data.email}`
            : action === "award"
              ? "Topic awarded"
              : "Topic un-awarded",
        description: presenter.volunteer_name,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Action failed.",
        variant: "destructive",
      })
    } finally {
      setBusyId(null)
    }
  }

  const loading = topics === null || presenters === null

  return (
    <div className="space-y-6">
      {/* Topics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-widget-heading flex items-center gap-2">
            <BookOpen className="h-4 w-4" aria-hidden="true" />
            Lesson topics
            {topics !== null && (
              <Badge variant="secondary">
                {topics.filter((t) => !t.claimed_by_volunteer_id).length}/{topics.length} open
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            The list presenters pick from. Claimed topics can't be deleted until un-awarded.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <AdminListSkeleton rows={3} label="Loading topics" />
          ) : fetchError ? (
            <div className="callout-destructive rounded-lg border p-4">
              <p className="text-sm">{fetchError}</p>
              <AdminRetryButton onRetry={() => void fetchAll()} label="Reload" />
            </div>
          ) : (
            <>
              {topics.length === 0 && editingTopicId === null && (
                <p className="text-sm text-muted-foreground">
                  No topics yet — add the lessons you want presented this year.
                </p>
              )}
              <div className="space-y-2">
                {topics.map((topic) => (
                  <div key={topic.id} className="flex items-start justify-between gap-3 rounded-lg border p-3">
                    <div className="min-w-0">
                      <p className="font-medium">{topic.title}</p>
                      {(topic.lesson_title || topic.scripture) && (
                        <p className="mt-0.5 text-sm text-muted-foreground">
                          {topic.lesson_title}
                          {topic.lesson_title && topic.scripture && " — "}
                          {topic.scripture}
                        </p>
                      )}
                      {!topic.lesson_title && !topic.scripture && topic.description && (
                        <p className="mt-0.5 text-sm text-muted-foreground">{topic.description}</p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {topic.claimed_by_volunteer_id ? (
                        <Badge>Claimed — {topic.assigned_presenter_name || "presenter"}</Badge>
                      ) : (
                        <Badge variant="outline">Open</Badge>
                      )}
                      {canManage && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            aria-label={`Edit ${topic.title}`}
                            onClick={() => startEdit(topic)}
                          >
                            <Pencil className="h-4 w-4" aria-hidden="true" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            aria-label={`Delete ${topic.title}`}
                            disabled={Boolean(topic.claimed_by_volunteer_id) || busyId === `topic-${topic.id}`}
                            onClick={() => void removeTopic(topic)}
                          >
                            {busyId === `topic-${topic.id}` ? (
                              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                            ) : (
                              <Trash2 className="h-4 w-4" aria-hidden="true" />
                            )}
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {canManage &&
                (editingTopicId !== null ? (
                  <div className="space-y-2 rounded-lg border border-dashed p-3">
                    <Input
                      value={topicTitle}
                      onChange={(e) => setTopicTitle(e.target.value)}
                      placeholder="Topic (e.g., Faith under pressure)"
                      aria-label="Topic"
                    />
                    <Input
                      value={topicLessonTitle}
                      onChange={(e) => setTopicLessonTitle(e.target.value)}
                      placeholder="Lesson title (optional)"
                      aria-label="Lesson title"
                    />
                    <Input
                      value={topicScripture}
                      onChange={(e) => setTopicScripture(e.target.value)}
                      placeholder="Scripture (e.g., Daniel 3:16-18)"
                      aria-label="Scripture"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => void saveTopic()}
                        disabled={!topicTitle.trim() || busyId === "topic-form"}
                      >
                        {busyId === "topic-form" && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                        )}
                        {editingTopicId === "new" ? "Add topic" : "Save changes"}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={cancelEdit}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => startEdit(null)}>
                    <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                    Add topic
                  </Button>
                ))}
            </>
          )}
        </CardContent>
      </Card>

      {/* Presenters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-widget-heading flex items-center gap-2">
            <Trophy className="h-4 w-4" aria-hidden="true" />
            Presenters
            {presenters !== null && (
              <Badge variant="secondary">
                {presenters.filter((p) => p.claimed_lesson_id).length}/{presenters.length} awarded
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Everyone who volunteered to present a lesson. Send them a bid invite, review their
            ranked picks, then award a topic — the schedule updates instantly.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <AdminListSkeleton rows={4} label="Loading presenters" />
          ) : presenters.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No "Presenting a lesson" volunteers yet. Families volunteer during registration.
            </p>
          ) : (
            presenters.map((presenter) => {
              const busy = busyId === `presenter-${presenter.id}`
              const picks = [presenter.pick_1, presenter.pick_2, presenter.pick_3].filter(
                (p): p is number => p !== null,
              )
              const pickIds = new Set(picks)
              const awardChoices = (topics ?? []).filter(
                (t) => !t.claimed_by_volunteer_id || t.claimed_by_volunteer_id === presenter.id,
              )

              return (
                <div key={presenter.id} className="space-y-3 rounded-lg border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium">
                        {presenter.volunteer_name}
                        {presenter.family_last_name && (
                          <span className="font-normal text-muted-foreground">
                            {" "}
                            —{" "}
                            {presenter.registration_id ? (
                              <Link
                                href={`/admin/registrations/${presenter.registration_id}`}
                                className="hover:text-primary hover:underline"
                              >
                                {presenter.family_last_name}
                              </Link>
                            ) : (
                              presenter.family_last_name
                            )}
                          </span>
                        )}
                      </p>
                      {presenter.bid_email && (
                        <p className="text-xs text-muted-foreground">{presenter.bid_email}</p>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {presenter.claimed_lesson_id ? (
                        <Badge>Awarded: {presenter.claimed_lesson_title || "topic"}</Badge>
                      ) : presenter.bid_submitted_at ? (
                        <Badge variant="secondary">
                          Bid submitted {formatDate(presenter.bid_submitted_at)}
                        </Badge>
                      ) : presenter.lesson_bid_sent_at ? (
                        <Badge variant="outline">
                          Invited {formatDate(presenter.lesson_bid_sent_at)}
                        </Badge>
                      ) : (
                        <Badge variant="outline">Not invited</Badge>
                      )}
                    </div>
                  </div>

                  {picks.length > 0 && !presenter.claimed_lesson_id && (
                    <div className="flex flex-wrap gap-1.5">
                      {picks.map((pickId, index) => (
                        <Badge key={pickId} variant="secondary" className="font-normal">
                          #{index + 1}: {topicById.get(pickId)?.title ?? `Topic ${pickId}`}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {canManage && (
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={busy}
                        onClick={() => void bidAction(presenter, "invite")}
                      >
                        {busy ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                        ) : (
                          <Mail className="mr-2 h-4 w-4" aria-hidden="true" />
                        )}
                        {presenter.lesson_bid_sent_at ? "Resend invite" : "Send bid invite"}
                      </Button>

                      {presenter.claimed_lesson_id ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={busy}
                          onClick={() => void bidAction(presenter, "unaward")}
                        >
                          <X className="mr-2 h-4 w-4" aria-hidden="true" />
                          Un-award topic
                        </Button>
                      ) : (
                        awardChoices.length > 0 && (
                          <Select
                            value=""
                            onValueChange={(value) =>
                              void bidAction(presenter, "award", Number(value))
                            }
                            disabled={busy}
                          >
                            <SelectTrigger
                              className="h-9 w-[240px]"
                              aria-label={`Award topic to ${presenter.volunteer_name}`}
                            >
                              <SelectValue placeholder="Award a topic..." />
                            </SelectTrigger>
                            <SelectContent>
                              {awardChoices.map((topic) => {
                                const rank = picks.indexOf(topic.id)
                                return (
                                  <SelectItem key={topic.id} value={String(topic.id)}>
                                    {pickIds.has(topic.id) ? `★ #${rank + 1} — ` : ""}
                                    {topic.title}
                                  </SelectItem>
                                )
                              })}
                            </SelectContent>
                          </Select>
                        )
                      )}
                    </div>
                  )}
                </div>
              )
            })
          )}
          {!canManage && !loading && (
            <p className="text-sm text-muted-foreground">
              You have view-only access — bids can't be managed with your role.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
