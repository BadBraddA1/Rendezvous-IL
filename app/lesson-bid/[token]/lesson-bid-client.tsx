"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { BookOpen, CheckCircle2, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

type TopicOption = {
  id: number
  title: string
  description: string | null
  claimed: boolean
}

type Props = {
  token: string
  presenterName: string
  familyLastName: string
  topics: TopicOption[]
  initialPicks: number[]
  alreadySubmitted: boolean
  claimedTopicTitle: string | null
  initialLessonTitle: string
  initialScripture: string
}

const RANK_LABELS = ["1st choice", "2nd choice", "3rd choice"]

export function LessonBidClient({
  token,
  presenterName,
  familyLastName,
  topics,
  initialPicks,
  alreadySubmitted,
  claimedTopicTitle,
  initialLessonTitle,
  initialScripture,
}: Props) {
  const [picks, setPicks] = useState<number[]>(initialPicks)
  const [submitted, setSubmitted] = useState(alreadySubmitted)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Post-award lesson details form
  const [lessonTitle, setLessonTitle] = useState(initialLessonTitle)
  const [scripture, setScripture] = useState(initialScripture)
  const [detailsSaved, setDetailsSaved] = useState(false)
  const [savingDetails, setSavingDetails] = useState(false)

  const saveDetails = async () => {
    setSavingDetails(true)
    setError(null)
    setDetailsSaved(false)
    try {
      const res = await fetch(`/api/lesson-bid/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "details", lessonTitle, scriptureReading: scripture }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.")
        return
      }
      setDetailsSaved(true)
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setSavingDetails(false)
    }
  }

  const togglePick = (topicId: number) => {
    setSubmitted(false)
    setError(null)
    setPicks((prev) => {
      if (prev.includes(topicId)) return prev.filter((id) => id !== topicId)
      if (prev.length >= 3) return prev
      return [...prev, topicId]
    })
  }

  const submit = async () => {
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`/api/lesson-bid/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ picks }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.")
        return
      }
      setSubmitted(true)
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  // Topic awarded — the link stays live so the presenter can add their
  // lesson title and scripture reading for the printed/public schedule.
  if (claimedTopicTitle) {
    return (
      <div className="mx-auto max-w-2xl">
        <Card>
          <CardHeader className="text-center">
            <CheckCircle2 className="mx-auto mb-2 h-10 w-10 text-green-600" aria-hidden="true" />
            <CardTitle>You're all set, {presenterName}!</CardTitle>
            <CardDescription>
              You've been assigned the lesson topic below. Thank you for volunteering to present at
              Rendezvous!
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border bg-muted/50 p-4 text-center">
              <p className="text-lg font-semibold">{claimedTopicTitle}</p>
            </div>

            <div className="space-y-3 rounded-lg border p-4">
              <div>
                <p className="font-medium">Your lesson details</p>
                <p className="text-sm text-muted-foreground">
                  Add the title you'll present under and the scripture you'll read from — these
                  show on the public schedule. You can come back and update them any time.
                </p>
              </div>
              <div>
                <Label htmlFor="lesson-title">Lesson title (optional)</Label>
                <Input
                  id="lesson-title"
                  value={lessonTitle}
                  placeholder={claimedTopicTitle}
                  onChange={(e) => {
                    setLessonTitle(e.target.value)
                    setDetailsSaved(false)
                  }}
                />
              </div>
              <div>
                <Label htmlFor="lesson-scripture">Scripture reading</Label>
                <Input
                  id="lesson-scripture"
                  value={scripture}
                  placeholder="e.g., John 3:16-21"
                  onChange={(e) => {
                    setScripture(e.target.value)
                    setDetailsSaved(false)
                  }}
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              {detailsSaved && (
                <Alert className="border-green-600/50 bg-green-50 text-green-900 dark:bg-green-950 dark:text-green-100">
                  <CheckCircle2 className="h-4 w-4 text-green-600" aria-hidden="true" />
                  <AlertDescription>Saved! Your details are on the schedule.</AlertDescription>
                </Alert>
              )}

              <Button onClick={saveDetails} disabled={savingDetails} className="w-full">
                {savingDetails ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                    Saving…
                  </>
                ) : (
                  "Save lesson details"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const openTopics = topics.filter((t) => !t.claimed)

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" aria-hidden="true" />
            <CardTitle>Pick your lesson topics</CardTitle>
          </div>
          <CardDescription>
            Hi {presenterName}
            {familyLastName ? ` (${familyLastName} family)` : ""} — thank you for volunteering to
            present a lesson! Choose up to 3 topics in order of preference. We'll assign topics
            based on everyone's picks and email you the result. You can come back and change your
            picks any time until a topic is assigned.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {openTopics.length === 0 ? (
            <Alert>
              <AlertDescription>
                All lesson topics have been claimed. Check back later or contact the Rendezvous
                team.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-2">
              {topics.map((topic) => {
                const rank = picks.indexOf(topic.id)
                const isPicked = rank !== -1
                const disabled = topic.claimed || (!isPicked && picks.length >= 3)
                return (
                  <button
                    key={topic.id}
                    type="button"
                    onClick={() => !topic.claimed && togglePick(topic.id)}
                    disabled={disabled && !isPicked}
                    className={cn(
                      "w-full rounded-lg border p-3 text-left transition-colors",
                      topic.claimed && "cursor-not-allowed opacity-50",
                      isPicked
                        ? "border-primary bg-primary/5"
                        : !topic.claimed && "hover:border-primary/50",
                      disabled && !isPicked && !topic.claimed && "opacity-60",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium">{topic.title}</p>
                        {topic.description && (
                          <p className="mt-0.5 text-sm text-muted-foreground">{topic.description}</p>
                        )}
                      </div>
                      {topic.claimed ? (
                        <Badge variant="secondary" className="shrink-0">
                          Taken
                        </Badge>
                      ) : isPicked ? (
                        <Badge className="shrink-0">{RANK_LABELS[rank]}</Badge>
                      ) : null}
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {submitted && (
            <Alert className="border-green-600/50 bg-green-50 text-green-900 dark:bg-green-950 dark:text-green-100">
              <CheckCircle2 className="h-4 w-4 text-green-600" aria-hidden="true" />
              <AlertDescription>
                Your picks are saved! We'll email you once a topic is assigned. Feel free to close
                this page — or change your picks below.
              </AlertDescription>
            </Alert>
          )}

          {openTopics.length > 0 && (
            <Button onClick={submit} disabled={submitting || picks.length === 0} className="w-full">
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  Saving…
                </>
              ) : submitted ? (
                "Update my picks"
              ) : (
                `Submit ${picks.length || ""} pick${picks.length === 1 ? "" : "s"}`
              )}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
