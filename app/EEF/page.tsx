"use client"

import { useState } from "react"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  MessageSquareHeart,
  ChevronRight,
  ChevronLeft,
  Home,
  Utensils,
  Calendar,
  Users,
  Trophy,
  Sparkles,
  CheckCircle2,
  Star,
} from "lucide-react"

type FeedbackData = {
  // Basic Info
  familyName: string
  yearsAttended: string
  familySize: string

  // Overall Experience
  overallRating: string
  wouldRecommend: string
  planToReturn: string

  // Lodging
  lodgingType: string
  lodgingRating: string
  lodgingComments: string

  // Meals
  mealsRating: string
  mealsVariety: string
  dietaryAccommodations: string
  mealsComments: string

  // Schedule & Activities
  scheduleRating: string
  favoriteActivities: string[]
  activitiesComments: string

  // Fellowship & Community
  fellowshipRating: string
  familyIntroductions: string
  fellowshipComments: string

  // Worship & Spiritual
  worshipRating: string
  bibleBowlRating: string
  devotionalRating: string
  worshipComments: string

  // Sessions
  momsSessionRating: string
  dadsSessionRating: string
  youngAdultSessionRating: string
  sessionTopicSuggestions: string

  // Facility
  facilityRating: string
  facilityComments: string

  // Value
  valueRating: string
  registrationProcess: string

  // Improvements & Suggestions
  bestPart: string
  improvements: string
  newActivitySuggestions: string
  additionalComments: string
}

const initialData: FeedbackData = {
  familyName: "",
  yearsAttended: "",
  familySize: "",
  overallRating: "",
  wouldRecommend: "",
  planToReturn: "",
  lodgingType: "",
  lodgingRating: "",
  lodgingComments: "",
  mealsRating: "",
  mealsVariety: "",
  dietaryAccommodations: "",
  mealsComments: "",
  scheduleRating: "",
  favoriteActivities: [],
  activitiesComments: "",
  fellowshipRating: "",
  familyIntroductions: "",
  fellowshipComments: "",
  worshipRating: "",
  bibleBowlRating: "",
  devotionalRating: "",
  worshipComments: "",
  momsSessionRating: "",
  dadsSessionRating: "",
  youngAdultSessionRating: "",
  sessionTopicSuggestions: "",
  facilityRating: "",
  facilityComments: "",
  valueRating: "",
  registrationProcess: "",
  bestPart: "",
  improvements: "",
  newActivitySuggestions: "",
  additionalComments: "",
}

const ACTIVITIES = [
  "Black-light Dodgeball",
  "Nine Square",
  "Archery",
  "Human Foosball",
  "Swimming Pool",
  "Canoeing",
  "Climbing Tower",
  "Mini Golf",
  "Volleyball",
  "Basketball",
  "Gaga Ball",
  "Ping Pong",
  "Table Games",
  "Bible Bowl",
  "Scrabble Tournament",
  "Talent Show",
  "Lake Cookout",
  "Kids Movies",
  "Obstacle Course",
  "Rope Games",
]

const RATING_OPTIONS = [
  { value: "5", label: "Excellent" },
  { value: "4", label: "Very Good" },
  { value: "3", label: "Good" },
  { value: "2", label: "Fair" },
  { value: "1", label: "Poor" },
]

const STEPS = [
  { id: "intro", title: "Welcome", icon: MessageSquareHeart },
  { id: "overall", title: "Overall", icon: Star },
  { id: "lodging", title: "Lodging", icon: Home },
  { id: "meals", title: "Meals", icon: Utensils },
  { id: "activities", title: "Activities", icon: Calendar },
  { id: "fellowship", title: "Fellowship", icon: Users },
  { id: "worship", title: "Worship", icon: Trophy },
  { id: "suggestions", title: "Suggestions", icon: Sparkles },
]

function RatingRadio({
  name,
  value,
  onChange,
}: {
  name: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <RadioGroup value={value} onValueChange={onChange} className="flex flex-wrap gap-2">
      {RATING_OPTIONS.map((option) => (
        <div key={option.value} className="flex items-center">
          <RadioGroupItem value={option.value} id={`${name}-${option.value}`} className="peer sr-only" />
          <Label
            htmlFor={`${name}-${option.value}`}
            className="cursor-pointer rounded-lg border-2 border-border bg-card px-4 py-2 text-sm font-medium transition-all peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10 peer-data-[state=checked]:text-primary hover:bg-muted"
          >
            {option.label}
          </Label>
        </div>
      ))}
    </RadioGroup>
  )
}

export default function EndOfEventFeedbackPage() {
  const [currentStep, setCurrentStep] = useState(0)
  const [data, setData] = useState<FeedbackData>(initialData)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const updateData = (updates: Partial<FeedbackData>) => {
    setData((prev) => ({ ...prev, ...updates }))
  }

  const toggleActivity = (activity: string) => {
    setData((prev) => ({
      ...prev,
      favoriteActivities: prev.favoriteActivities.includes(activity)
        ? prev.favoriteActivities.filter((a) => a !== activity)
        : [...prev.favoriteActivities, activity],
    }))
  }

  const nextStep = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1)
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1)
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to submit feedback")
      }

      setIsSubmitted(true)
      window.scrollTo({ top: 0, behavior: "smooth" })
    } catch (error: any) {
      console.error("[v0] Feedback submission error:", error)
      setSubmitError(error.message || "Something went wrong. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <main className="container mx-auto px-4 py-12 md:py-20">
          <Card className="mx-auto max-w-2xl border-2 border-primary/20">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                <CheckCircle2 className="h-10 w-10 text-primary" />
              </div>
              <h2 className="mb-3 text-3xl font-bold tracking-tight">Thank You!</h2>
              <p className="mb-6 max-w-md text-lg text-muted-foreground">
                Your feedback is invaluable in helping us make Rendezvous even better for future years. We appreciate
                you taking the time to share your thoughts.
              </p>
              <p className="text-muted-foreground">
                See you at Rendezvous 2027!
              </p>
            </CardContent>
          </Card>
        </main>
        <SiteFooter />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main className="container mx-auto px-4 py-8 md:py-12">
        <div className="mb-8 text-center">
          <h1 className="mb-3 text-balance text-3xl font-bold tracking-tight md:text-4xl">
            Rendezvous 2026 Feedback
          </h1>
          <p className="text-balance text-muted-foreground">
            Help us make future Rendezvous events even better!
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8 overflow-x-auto">
          <div className="mx-auto flex min-w-max max-w-4xl justify-center gap-1 px-4 md:gap-2">
            {STEPS.map((step, index) => {
              const Icon = step.icon
              const isActive = index === currentStep
              const isCompleted = index < currentStep

              return (
                <button
                  key={step.id}
                  onClick={() => {
                    setCurrentStep(index)
                    window.scrollTo({ top: 0, behavior: "smooth" })
                  }}
                  className={`flex flex-col items-center gap-1 rounded-lg p-2 transition-all md:flex-row md:gap-2 md:px-3 md:py-2 ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : isCompleted
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <Icon className="h-4 w-4 md:h-5 md:w-5" />
                  <span className="text-xs font-medium md:text-sm">{step.title}</span>
                </button>
              )
            })}
          </div>
        </div>

        <Card className="mx-auto max-w-3xl border-2 border-border/50">
          <CardContent className="p-6 md:p-8">
            {/* Step 0: Introduction */}
            {currentStep === 0 && (
              <div className="space-y-6">
                <div className="text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                    <MessageSquareHeart className="h-8 w-8 text-primary" />
                  </div>
                  <h2 className="mb-2 text-2xl font-bold">Welcome to the Feedback Form</h2>
                  <p className="text-muted-foreground">
                    We would love to hear about your Rendezvous 2026 experience. Your honest feedback helps us plan
                    better events in the future.
                  </p>
                </div>

                <div className="space-y-4 pt-4">
                  <div>
                    <Label htmlFor="familyName">Family Name (Optional)</Label>
                    <Input
                      id="familyName"
                      placeholder="The Smith Family"
                      value={data.familyName}
                      onChange={(e) => updateData({ familyName: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="yearsAttended">How many years have you attended Rendezvous?</Label>
                    <Select value={data.yearsAttended} onValueChange={(value) => updateData({ yearsAttended: value })}>
                      <SelectTrigger id="yearsAttended">
                        <SelectValue placeholder="Select years" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="first">This was our first year</SelectItem>
                        <SelectItem value="2-3">2-3 years</SelectItem>
                        <SelectItem value="4-5">4-5 years</SelectItem>
                        <SelectItem value="6-10">6-10 years</SelectItem>
                        <SelectItem value="10+">More than 10 years</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="familySize">How many people were in your group this year?</Label>
                    <Select value={data.familySize} onValueChange={(value) => updateData({ familySize: value })}>
                      <SelectTrigger id="familySize">
                        <SelectValue placeholder="Select size" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1-2">1-2 people</SelectItem>
                        <SelectItem value="3-4">3-4 people</SelectItem>
                        <SelectItem value="5-6">5-6 people</SelectItem>
                        <SelectItem value="7-8">7-8 people</SelectItem>
                        <SelectItem value="9+">9 or more</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {/* Step 1: Overall Experience */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div>
                  <h2 className="mb-1 text-2xl font-bold">Overall Experience</h2>
                  <p className="text-muted-foreground">Tell us about your overall Rendezvous experience</p>
                </div>

                <div className="space-y-6">
                  <div className="space-y-3">
                    <Label className="text-base font-medium">
                      How would you rate your overall Rendezvous 2026 experience?
                    </Label>
                    <RatingRadio
                      name="overallRating"
                      value={data.overallRating}
                      onChange={(value) => updateData({ overallRating: value })}
                    />
                  </div>

                  <div className="space-y-3">
                    <Label className="text-base font-medium">
                      How likely are you to recommend Rendezvous to other homeschool families?
                    </Label>
                    <RadioGroup
                      value={data.wouldRecommend}
                      onValueChange={(value) => updateData({ wouldRecommend: value })}
                      className="flex flex-wrap gap-2"
                    >
                      {["Definitely", "Probably", "Maybe", "Unlikely"].map((option) => (
                        <div key={option} className="flex items-center">
                          <RadioGroupItem value={option} id={`recommend-${option}`} className="peer sr-only" />
                          <Label
                            htmlFor={`recommend-${option}`}
                            className="cursor-pointer rounded-lg border-2 border-border bg-card px-4 py-2 text-sm font-medium transition-all peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10 peer-data-[state=checked]:text-primary hover:bg-muted"
                          >
                            {option}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-base font-medium">Do you plan to return next year?</Label>
                    <RadioGroup
                      value={data.planToReturn}
                      onValueChange={(value) => updateData({ planToReturn: value })}
                      className="flex flex-wrap gap-2"
                    >
                      {["Yes, definitely!", "Probably", "Not sure yet", "Probably not"].map((option) => (
                        <div key={option} className="flex items-center">
                          <RadioGroupItem value={option} id={`return-${option}`} className="peer sr-only" />
                          <Label
                            htmlFor={`return-${option}`}
                            className="cursor-pointer rounded-lg border-2 border-border bg-card px-4 py-2 text-sm font-medium transition-all peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10 peer-data-[state=checked]:text-primary hover:bg-muted"
                          >
                            {option}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Lodging */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div>
                  <h2 className="mb-1 text-2xl font-bold">Lodging</h2>
                  <p className="text-muted-foreground">Tell us about your accommodations</p>
                </div>

                <div className="space-y-6">
                  <div>
                    <Label htmlFor="lodgingType">What type of lodging did you use?</Label>
                    <Select value={data.lodgingType} onValueChange={(value) => updateData({ lodgingType: value })}>
                      <SelectTrigger id="lodgingType">
                        <SelectValue placeholder="Select lodging type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="motel-2queen-bunk">Motel Room (2 Queen + Bunk)</SelectItem>
                        <SelectItem value="motel-1queen-2bunk">Motel Room (1 Queen + 2 Bunks)</SelectItem>
                        <SelectItem value="rv">RV Site</SelectItem>
                        <SelectItem value="tent">Tent Camping</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-base font-medium">How would you rate your lodging experience?</Label>
                    <RatingRadio
                      name="lodgingRating"
                      value={data.lodgingRating}
                      onChange={(value) => updateData({ lodgingRating: value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="lodgingComments">Any comments about your lodging?</Label>
                    <Textarea
                      id="lodgingComments"
                      placeholder="Share your thoughts about cleanliness, comfort, amenities, etc."
                      value={data.lodgingComments}
                      onChange={(e) => updateData({ lodgingComments: e.target.value })}
                      rows={3}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Meals */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div>
                  <h2 className="mb-1 text-2xl font-bold">Meals & Dining</h2>
                  <p className="text-muted-foreground">Tell us about the food and dining experience</p>
                </div>

                <div className="space-y-6">
                  <div className="space-y-3">
                    <Label className="text-base font-medium">How would you rate the meals overall?</Label>
                    <RatingRadio
                      name="mealsRating"
                      value={data.mealsRating}
                      onChange={(value) => updateData({ mealsRating: value })}
                    />
                  </div>

                  <div className="space-y-3">
                    <Label className="text-base font-medium">How was the variety of food options?</Label>
                    <RadioGroup
                      value={data.mealsVariety}
                      onValueChange={(value) => updateData({ mealsVariety: value })}
                      className="flex flex-wrap gap-2"
                    >
                      {["Excellent variety", "Good variety", "Adequate", "Could improve"].map((option) => (
                        <div key={option} className="flex items-center">
                          <RadioGroupItem value={option} id={`variety-${option}`} className="peer sr-only" />
                          <Label
                            htmlFor={`variety-${option}`}
                            className="cursor-pointer rounded-lg border-2 border-border bg-card px-4 py-2 text-sm font-medium transition-all peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10 peer-data-[state=checked]:text-primary hover:bg-muted"
                          >
                            {option}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-base font-medium">
                      If you had dietary restrictions, were they accommodated well?
                    </Label>
                    <RadioGroup
                      value={data.dietaryAccommodations}
                      onValueChange={(value) => updateData({ dietaryAccommodations: value })}
                      className="flex flex-wrap gap-2"
                    >
                      {["Very well", "Adequately", "Could be better", "N/A - No restrictions"].map((option) => (
                        <div key={option} className="flex items-center">
                          <RadioGroupItem value={option} id={`dietary-${option}`} className="peer sr-only" />
                          <Label
                            htmlFor={`dietary-${option}`}
                            className="cursor-pointer rounded-lg border-2 border-border bg-card px-4 py-2 text-sm font-medium transition-all peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10 peer-data-[state=checked]:text-primary hover:bg-muted"
                          >
                            {option}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>

                  <div>
                    <Label htmlFor="mealsComments">Any comments about the meals?</Label>
                    <Textarea
                      id="mealsComments"
                      placeholder="Favorite meals, suggestions for improvement, etc."
                      value={data.mealsComments}
                      onChange={(e) => updateData({ mealsComments: e.target.value })}
                      rows={3}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Schedule & Activities */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div>
                  <h2 className="mb-1 text-2xl font-bold">Schedule & Activities</h2>
                  <p className="text-muted-foreground">Tell us about the activities and schedule</p>
                </div>

                <div className="space-y-6">
                  <div className="space-y-3">
                    <Label className="text-base font-medium">How would you rate the overall schedule and pacing?</Label>
                    <RatingRadio
                      name="scheduleRating"
                      value={data.scheduleRating}
                      onChange={(value) => updateData({ scheduleRating: value })}
                    />
                  </div>

                  <div className="space-y-3">
                    <Label className="text-base font-medium">
                      Which activities did your family enjoy the most? (Select all that apply)
                    </Label>
                    <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                      {ACTIVITIES.map((activity) => (
                        <div key={activity} className="flex items-center space-x-2">
                          <Checkbox
                            id={`activity-${activity}`}
                            checked={data.favoriteActivities.includes(activity)}
                            onCheckedChange={() => toggleActivity(activity)}
                          />
                          <Label htmlFor={`activity-${activity}`} className="cursor-pointer text-sm">
                            {activity}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="activitiesComments">Any comments about the activities or schedule?</Label>
                    <Textarea
                      id="activitiesComments"
                      placeholder="Was there enough free time? Too much? Activities you wish had more time?"
                      value={data.activitiesComments}
                      onChange={(e) => updateData({ activitiesComments: e.target.value })}
                      rows={3}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 5: Fellowship & Community */}
            {currentStep === 5 && (
              <div className="space-y-6">
                <div>
                  <h2 className="mb-1 text-2xl font-bold">Fellowship & Community</h2>
                  <p className="text-muted-foreground">Tell us about the community experience</p>
                </div>

                <div className="space-y-6">
                  <div className="space-y-3">
                    <Label className="text-base font-medium">
                      How would you rate the fellowship and community atmosphere?
                    </Label>
                    <RatingRadio
                      name="fellowshipRating"
                      value={data.fellowshipRating}
                      onChange={(value) => updateData({ fellowshipRating: value })}
                    />
                  </div>

                  <div className="space-y-3">
                    <Label className="text-base font-medium">
                      How helpful were the family introductions on Monday evening?
                    </Label>
                    <RadioGroup
                      value={data.familyIntroductions}
                      onValueChange={(value) => updateData({ familyIntroductions: value })}
                      className="flex flex-wrap gap-2"
                    >
                      {["Very helpful", "Somewhat helpful", "Not very helpful", "Did not attend"].map((option) => (
                        <div key={option} className="flex items-center">
                          <RadioGroupItem value={option} id={`intro-${option}`} className="peer sr-only" />
                          <Label
                            htmlFor={`intro-${option}`}
                            className="cursor-pointer rounded-lg border-2 border-border bg-card px-4 py-2 text-sm font-medium transition-all peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10 peer-data-[state=checked]:text-primary hover:bg-muted"
                          >
                            {option}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>

                  <div>
                    <Label htmlFor="fellowshipComments">
                      Any thoughts on how we could improve fellowship opportunities?
                    </Label>
                    <Textarea
                      id="fellowshipComments"
                      placeholder="Ice breaker suggestions, ways to help new families connect, etc."
                      value={data.fellowshipComments}
                      onChange={(e) => updateData({ fellowshipComments: e.target.value })}
                      rows={3}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 6: Worship & Spiritual */}
            {currentStep === 6 && (
              <div className="space-y-6">
                <div>
                  <h2 className="mb-1 text-2xl font-bold">Worship & Spiritual</h2>
                  <p className="text-muted-foreground">Tell us about the worship and spiritual aspects</p>
                </div>

                <div className="space-y-6">
                  <div className="space-y-3">
                    <Label className="text-base font-medium">
                      How would you rate the morning and evening assemblies?
                    </Label>
                    <RatingRadio
                      name="worshipRating"
                      value={data.worshipRating}
                      onChange={(value) => updateData({ worshipRating: value })}
                    />
                  </div>

                  <div className="space-y-3">
                    <Label className="text-base font-medium">How would you rate the Bible Bowl?</Label>
                    <RatingRadio
                      name="bibleBowlRating"
                      value={data.bibleBowlRating}
                      onChange={(value) => updateData({ bibleBowlRating: value })}
                    />
                  </div>

                  <div className="space-y-3">
                    <Label className="text-base font-medium">How would you rate the devotional lessons?</Label>
                    <RatingRadio
                      name="devotionalRating"
                      value={data.devotionalRating}
                      onChange={(value) => updateData({ devotionalRating: value })}
                    />
                  </div>

                  <div className="space-y-3">
                    <Label className="text-base font-medium">How was the Mom&apos;s Session? (if attended)</Label>
                    <RatingRadio
                      name="momsSessionRating"
                      value={data.momsSessionRating}
                      onChange={(value) => updateData({ momsSessionRating: value })}
                    />
                  </div>

                  <div className="space-y-3">
                    <Label className="text-base font-medium">How was the Dad&apos;s Session? (if attended)</Label>
                    <RatingRadio
                      name="dadsSessionRating"
                      value={data.dadsSessionRating}
                      onChange={(value) => updateData({ dadsSessionRating: value })}
                    />
                  </div>

                  <div className="space-y-3">
                    <Label className="text-base font-medium">How was the Young Adult Session? (if attended)</Label>
                    <RatingRadio
                      name="youngAdultSessionRating"
                      value={data.youngAdultSessionRating}
                      onChange={(value) => updateData({ youngAdultSessionRating: value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="worshipComments">Any comments about worship or the sessions?</Label>
                    <Textarea
                      id="worshipComments"
                      placeholder="Topics you'd like covered, format suggestions, etc."
                      value={data.worshipComments}
                      onChange={(e) => updateData({ worshipComments: e.target.value })}
                      rows={3}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 7: Suggestions & Final Thoughts */}
            {currentStep === 7 && (
              <div className="space-y-6">
                <div>
                  <h2 className="mb-1 text-2xl font-bold">Suggestions & Final Thoughts</h2>
                  <p className="text-muted-foreground">Share your ideas for making Rendezvous even better</p>
                </div>

                <div className="space-y-6">
                  <div className="space-y-3">
                    <Label className="text-base font-medium">
                      How would you rate the overall value for the cost?
                    </Label>
                    <RatingRadio
                      name="valueRating"
                      value={data.valueRating}
                      onChange={(value) => updateData({ valueRating: value })}
                    />
                  </div>

                  <div className="space-y-3">
                    <Label className="text-base font-medium">How was the registration process?</Label>
                    <RadioGroup
                      value={data.registrationProcess}
                      onValueChange={(value) => updateData({ registrationProcess: value })}
                      className="flex flex-wrap gap-2"
                    >
                      {["Very easy", "Easy", "Somewhat confusing", "Difficult"].map((option) => (
                        <div key={option} className="flex items-center">
                          <RadioGroupItem value={option} id={`registration-${option}`} className="peer sr-only" />
                          <Label
                            htmlFor={`registration-${option}`}
                            className="cursor-pointer rounded-lg border-2 border-border bg-card px-4 py-2 text-sm font-medium transition-all peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10 peer-data-[state=checked]:text-primary hover:bg-muted"
                          >
                            {option}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>

                  <div>
                    <Label htmlFor="bestPart">What was the best part of Rendezvous 2026 for your family?</Label>
                    <Textarea
                      id="bestPart"
                      placeholder="Share your favorite memories and highlights"
                      value={data.bestPart}
                      onChange={(e) => updateData({ bestPart: e.target.value })}
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label htmlFor="improvements">
                      What could we improve for next year?
                    </Label>
                    <Textarea
                      id="improvements"
                      placeholder="Be honest! Constructive feedback helps us improve"
                      value={data.improvements}
                      onChange={(e) => updateData({ improvements: e.target.value })}
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label htmlFor="newActivitySuggestions">
                      Any new activities or features you&apos;d like to see?
                    </Label>
                    <Textarea
                      id="newActivitySuggestions"
                      placeholder="New games, sessions, events, or other ideas"
                      value={data.newActivitySuggestions}
                      onChange={(e) => updateData({ newActivitySuggestions: e.target.value })}
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label htmlFor="additionalComments">Any other comments or thoughts?</Label>
                    <Textarea
                      id="additionalComments"
                      placeholder="Anything else you'd like to share with the Rendezvous team"
                      value={data.additionalComments}
                      onChange={(e) => updateData({ additionalComments: e.target.value })}
                      rows={3}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="mt-8 flex items-center justify-between border-t pt-6">
              <Button
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 0}
                className="gap-2"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </Button>

              {currentStep === STEPS.length - 1 ? (
                <Button onClick={handleSubmit} disabled={isSubmitting} className="gap-2">
                  {isSubmitting ? "Submitting..." : "Submit Feedback"}
                  {!isSubmitting && <CheckCircle2 className="h-4 w-4" />}
                </Button>
              ) : (
                <Button onClick={nextStep} className="gap-2">
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              )}
            </div>

            {submitError && (
              <div className="mt-4 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center text-sm text-destructive">
                {submitError}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <SiteFooter />
    </div>
  )
}
