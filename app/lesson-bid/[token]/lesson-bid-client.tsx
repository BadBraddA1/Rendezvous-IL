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
  claimedTopicTitle: string | null
  initialLessonTitle: string
  initialScripture: string
}

export function LessonBidClient({
  token,
  presenterName,
  familyLastName,
  topics: initialTopics,
  claimedTopicTitle,
  initialLessonTitle,
  initialScripture,
}: Props) {
  const [topics, setTopics] = useState(initialTopics)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [claimedTitle, setClaimedTitle] = useState(claimedTopicTitle)
  const [claiming, setClaiming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Post-claim lesson details form
  const [lessonTitle, setLessonTitle] = useState(initialLessonTitle)
  const [scripture, setScripture] = useState(initialScripture)
  const [detailsSaved, setDetailsSaved] = useState(false)
  const [savingDetails, setSavingDetails] = useState(false)

  const claim = async () => {
    if (selectedId === null) return
    setClaiming(true)
    setError(null)
    try {
      const res = await fetch(`/api/lesson-bid/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topicId: selectedId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.")
        if (data.taken) {
          // Someone beat them to it — grey the topic out and let them re-pick.
          setTopics((prev) =>
            prev.map((t) => (t.id === selectedId ? { ...t, claimed: true } : t)),
          )
          setSelectedId(null)
        }
        return
      }
      setClaimedTitle(String(data.topicTitle ?? ""))
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setClaiming(false)
    }
  }

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

  // Topic claimed — the link stays live so the presenter can add their
  // lesson title and scripture reading for the printed/public schedule.
  if (claimedTitle) {
    return (
      <div className="mx-auto max-w-2xl">
        <Card>
          <CardHeader className="text-center">
            <CheckCircle2 className="mx-auto mb-2 h-10 w-10 text-green-600" aria-hidden="true" />
            <CardTitle>You're all set, {presenterName}!</CardTitle>
            <CardDescription>
              This topic is yours. Thank you for volunteering to present at Rendezvous!
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border bg-muted/50 p-4 text-center">
              <p className="text-lg font-semibold">{claimedTitle}</p>
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
                  placeholder={claimedTitle}
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
  const selectedTopic = topics.find((t) => t.id === selectedId)

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" aria-hidden="true" />
            <CardTitle>Claim your lesson topic</CardTitle>
          </div>
          <CardDescription>
            Hi {presenterName}
            {familyLastName ? ` (${familyLastName} family)` : ""} — thank you for volunteering to
            present a lesson! Topics are <strong>first come, first served</strong>: pick the one
            you want and claim it. Once it's yours, you'll add your lesson title and scripture
            reading on this same page.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {openTopics.length === 0 ? (
            <Alert>
              <AlertDescription>
                All lesson topics have been claimed. Contact the Rendezvous team if you'd still
                like to present.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-2" role="radiogroup" aria-label="Open lesson topics">
              {topics.map((topic) => {
                const isSelected = selectedId === topic.id
                return (
                  <button
                    key={topic.id}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => {
                      if (topic.claimed) return
                      setError(null)
                      setSelectedId(isSelected ? null : topic.id)
                    }}
                    disabled={topic.claimed}
                    className={cn(
                      "w-full rounded-lg border p-3 text-left transition-colors",
                      topic.claimed && "cursor-not-allowed opacity-50",
                      isSelected
                        ? "border-primary bg-primary/5"
                        : !topic.claimed && "hover:border-primary/50",
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
                      ) : isSelected ? (
                        <Badge className="shrink-0">Your pick</Badge>
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

          {openTopics.length > 0 && (
            <Button onClick={claim} disabled={claiming || selectedId === null} className="w-full">
              {claiming ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  Claiming…
                </>
              ) : selectedTopic ? (
                `Claim "${selectedTopic.title}"`
              ) : (
                "Select a topic to claim"
              )}
            </Button>
          )}
          {selectedTopic && (
            <p className="text-center text-xs text-muted-foreground">
              Claiming is final — contact the Rendezvous team if you need to change it later.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
