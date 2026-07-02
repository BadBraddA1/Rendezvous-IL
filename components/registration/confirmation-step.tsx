"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle2, Loader2, Mail, Download, AlertCircle, Pencil } from "lucide-react"
import { getRegistrationSubmitErrorMessage } from "@/lib/registration-submit-error"
import { arrivalDepartureSummaryLines } from "@/lib/registration-arrival-departure"
import type { RegistrationData } from "@/types/registration"

type Props = {
  data: RegistrationData
  onBack?: () => void
  onEditStep?: (step: number) => void
  backLabel?: string
  /** Override the POST target (e.g. the express re-registration endpoint). */
  submitEndpoint?: string
}

export function ConfirmationStep({
  data,
  onBack,
  onEditStep,
  backLabel = "Go back",
  submitEndpoint = "/api/registration",
}: Props) {
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [registrationId, setRegistrationId] = useState<number | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const submitErrorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (submitError) {
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
      submitErrorRef.current?.scrollIntoView({
        behavior: reduceMotion ? "auto" : "smooth",
        block: "nearest",
      })
      submitErrorRef.current?.focus({ preventScroll: true })
    }
  }, [submitError])

  const handleSubmit = async () => {
    setSubmitting(true)
    setSubmitError(null)

    try {
      const response = await fetch(submitEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      let result: { error?: string; registrationId?: number } = {}
      try {
        result = await response.json()
      } catch {
        throw new Error("We couldn't read the server's response. Try submitting again.")
      }

      if (!response.ok) {
        console.error("[v0] Registration server error:", result.error)
        setSubmitError(
          getRegistrationSubmitErrorMessage(undefined, response.status, result.error),
        )
        return
      }

      setRegistrationId(result.registrationId ?? null)
      setSubmitted(true)
    } catch (error) {
      console.error("[v0] Registration submission error:", error)
      setSubmitError(getRegistrationSubmitErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  const dueNow = data.registrationFee + data.scholarshipDonation
  const dueAtCheckIn = data.lodgingTotal + data.climbingTowerTotal + (data.tshirtTotal || 0)
  const grandTotal = dueNow + dueAtCheckIn

  if (submitted) {
    return (
      <div className="space-y-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-surface-highlight">
          <CheckCircle2 className="h-10 w-10 text-success" />
        </div>
        <div>
          <h2 className="text-section-title mb-2">You&apos;re registered!</h2>
          <p className="text-muted-foreground">
            Your registration for Rendezvous 2027 is complete. Save registration ID #{registrationId} for Venmo
            payment and check-in.
          </p>
        </div>

        {!data.scholarshipRequested && (
          <Card className="border-success/30 bg-surface-highlight">
            <CardHeader>
              <CardTitle className="text-on-surface">💳 Payment Due Now via Venmo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-left space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Registration Fee:</span>
                  <span className="font-medium">${data.registrationFee.toFixed(2)}</span>
                </div>
                {data.scholarshipDonation > 0 && (
                  <div className="flex justify-between text-sm text-success">
                    <span>Scholarship Donation:</span>
                    <span className="font-medium">+${data.scholarshipDonation.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t pt-2 text-on-surface">
                  <span className="text-subheading">Pay Now:</span>
                  <span className="text-amount tabular-nums">${dueNow.toFixed(2)}</span>
                </div>
              </div>
              <Button
                size="lg"
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                onClick={() => window.open("https://venmo.com/u/sbradd78", "_blank")}
              >
                Pay with Venmo (@sbradd78)
              </Button>
              <p className="text-xs text-on-surface">
                Please include Registration ID #{registrationId} in your payment note
              </p>
            </CardContent>
          </Card>
        )}

        {!data.scholarshipRequested && dueAtCheckIn > 0 && (
          <Card className="callout-info border">
            <CardHeader>
              <CardTitle className="text-on-surface">📋 Due at Check-In</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-left text-sm">
              <div className="flex justify-between">
                <span>Lodging & Meals:</span>
                <span className="font-medium">${data.lodgingTotal.toFixed(2)}</span>
              </div>
              {data.climbingTowerTotal > 0 && (
                <div className="flex justify-between">
                  <span>Climbing Tower:</span>
                  <span className="font-medium">${data.climbingTowerTotal.toFixed(2)}</span>
                </div>
              )}
              {(data.tshirtTotal || 0) > 0 && (
                <div className="flex justify-between">
                  <span>T-Shirts (if ordered):</span>
                  <span className="font-medium">${(data.tshirtTotal || 0).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-primary/30 pt-1">
                <span className="font-semibold">At Check-In:</span>
                <span className="text-amount tabular-nums text-info">${dueAtCheckIn.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>What's Next?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-left">
            <div className="flex gap-3">
              <Mail className="mt-1 h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">Confirmation Email</p>
                <p className="text-sm text-muted-foreground">
                  Check your email at {data.email} for your confirmation and registration details.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Download className="mt-1 h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">Check-In Information</p>
                <p className="text-sm text-muted-foreground">
                  Check-in is Saturday, May 3, 2027 from 1:00-5:15 PM at the Activity Center meeting room.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Alert className="callout-info border">
          <AlertDescription className="text-on-surface text-left">
            Questions? Need to make a change to your registration? Contact Stephen Bradd at (217) 935-5058 or
            Stephen@Bradd.us
          </AlertDescription>
        </Alert>

        <Button size="lg" onClick={() => (window.location.href = "/")}>
          Return to Home
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-section-title mb-2">Review your registration</h2>
        <p className="text-muted-foreground">
          Check names, lodging, and costs before you submit. Use Edit on any section to make changes.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="font-display text-subheading">Contact Information</CardTitle>
          {onEditStep && (
            <Button variant="ghost" size="sm" className="touch-target shrink-0" onClick={() => onEditStep(1)} aria-label="Edit contact information">
              <Pencil className="mr-2 h-4 w-4" aria-hidden="true" />
              Edit
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="min-w-0">
              <p className="font-medium">Family Name</p>
              <p className="break-words text-muted-foreground">{data.familyLastName}</p>
            </div>
            <div className="min-w-0">
              <p className="font-medium">Email</p>
              <p className="break-all text-muted-foreground">{data.email}</p>
            </div>
            <div>
              <p className="font-medium">Husband Phone</p>
              <p className="text-muted-foreground">{data.husbandPhone || "Not provided"}</p>
            </div>
            <div>
              <p className="font-medium">Wife Phone</p>
              <p className="text-muted-foreground">{data.wifePhone || "Not provided"}</p>
            </div>
          </div>
          <div className="min-w-0">
            <p className="font-medium">Address</p>
            <p className="break-words text-muted-foreground">
              {data.address}, {data.city}, {data.state} {data.zip}
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="min-w-0">
              <p className="font-medium">Home Congregation</p>
              <p className="break-words text-muted-foreground">{data.homeCongregation}</p>
            </div>
            <div>
              <p className="font-medium">Years Previously Attended</p>
              <p className="text-muted-foreground">{data.timesAttended}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="font-display text-subheading">Family Members ({data.familyMembers.length})</CardTitle>
          {onEditStep && (
            <Button variant="ghost" size="sm" className="touch-target shrink-0" onClick={() => onEditStep(1)} aria-label="Edit family members">
              <Pencil className="mr-2 h-4 w-4" aria-hidden="true" />
              Edit
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {data.familyMembers.map((member) => (
              <div key={member.id} className="flex items-center justify-between rounded-lg border p-3">
                <div className="min-w-0">
                  <p className="break-words font-medium">
                    {member.firstName} {member.lastName || data.familyLastName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Age: {member.isOver18 ? "18+" : member.age}
                    {member.isBaptized && " • Baptized"}
                    {member.gender && ` • ${member.gender === "male" ? "Male" : "Female"}`}
                  </p>
                  {(member.email || member.phone) && (
                    <p className="break-words text-sm text-muted-foreground">
                      {member.email}
                      {member.email && member.phone && " • "}
                      {member.phone}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="font-display text-subheading">Lodging & Costs</CardTitle>
          {onEditStep && (
            <Button variant="ghost" size="sm" className="touch-target shrink-0" onClick={() => onEditStep(2)} aria-label="Edit lodging and costs">
              <Pencil className="mr-2 h-4 w-4" aria-hidden="true" />
              Edit
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <p className="font-medium">Lodging Type</p>
            <p className="text-muted-foreground capitalize">{data.lodgingType.replace(/-/g, " ")}</p>
          </div>
          <div>
            <p className="font-medium">Arrival &amp; Departure</p>
            <ul className="mt-1 list-none space-y-0.5 text-muted-foreground">
              {arrivalDepartureSummaryLines(
                data.arrivalDeparture,
                data.familyMembers,
                data.familyLastName,
              ).map((line) => (
                <li key={line} className="break-words">
                  {line}
                </li>
              ))}
            </ul>
          </div>
          {!data.scholarshipRequested && (
            <div className="space-y-3">
              <div className="rounded-lg bg-surface-highlight p-4 border-2 border-success/30">
                <p className="font-semibold text-on-surface mb-2">💳 Pay Now via Venmo:</p>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Registration Fee</span>
                    <span className="font-medium">${data.registrationFee.toFixed(2)}</span>
                  </div>
                  {data.scholarshipDonation > 0 && (
                    <div className="flex justify-between text-success">
                      <span>Scholarship Donation</span>
                      <span className="font-medium">+${data.scholarshipDonation.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-success/30 pt-1">
                    <span className="font-semibold">Pay Now:</span>
                    <span className="text-amount tabular-nums text-success">${dueNow.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="callout-info rounded-lg border-2 p-4">
                <p className="font-semibold text-on-surface mb-2">📋 Pay at Check-In:</p>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Lodging & Meals</span>
                    <span className="font-medium">${data.lodgingTotal.toFixed(2)}</span>
                  </div>
                  {data.climbingTowerTotal > 0 && (
                    <div className="flex justify-between">
                      <span>Climbing Tower</span>
                      <span className="font-medium">${data.climbingTowerTotal.toFixed(2)}</span>
                    </div>
                  )}
                  {(data.tshirtTotal || 0) > 0 && (
                    <div className="flex justify-between">
                      <span>T-Shirts (if ordered)</span>
                      <span className="font-medium">${(data.tshirtTotal || 0).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-primary/30 pt-1">
                    <span className="font-semibold">At Check-In:</span>
                    <span className="text-amount tabular-nums text-info">${dueAtCheckIn.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-between rounded-lg bg-muted p-3">
                <span className="text-subheading">Grand Total:</span>
                <span className="text-amount tabular-nums text-primary">${grandTotal.toFixed(2)}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {data.healthInfo.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="font-display text-subheading">Health Information</CardTitle>
            {onEditStep && (
              <Button variant="ghost" size="sm" className="touch-target shrink-0" onClick={() => onEditStep(4)} aria-label="Edit health information">
                <Pencil className="mr-2 h-4 w-4" aria-hidden="true" />
                Edit
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              {data.healthInfo.map((info) => (
                <div key={info.id} className="min-w-0 rounded-lg border p-3">
                  <p className="break-words font-medium">{info.fullName}</p>
                  <p className="break-words text-muted-foreground">{info.condition}</p>
                  <p className="text-xs text-muted-foreground">
                    Medication on hand: {info.medicationOnHand ? "Yes" : "No"}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {data.volunteerSignups.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="font-display text-subheading">Volunteer Signups</CardTitle>
            {onEditStep && (
              <Button variant="ghost" size="sm" className="touch-target shrink-0" onClick={() => onEditStep(4)} aria-label="Edit volunteer signups">
                <Pencil className="mr-2 h-4 w-4" aria-hidden="true" />
                Edit
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              {data.volunteerSignups.map((signup, index) => (
                <div key={index}>
                  <p className="font-medium">- {signup.type}</p>
                  {signup.names.length > 0 && <p className="ml-4 text-muted-foreground">{signup.names.join(", ")}</p>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {data.scholarshipRequested && (
        <Alert className="callout-info border">
          <AlertCircle className="h-4 w-4 text-info" />
          <AlertDescription className="text-on-surface">
            You've requested financial assistance. Stephen will review your registration and contact you via email to
            discuss pricing and available help.
          </AlertDescription>
        </Alert>
      )}

      {submitError && (
        <div ref={submitErrorRef} tabIndex={-1} className="outline-none">
          <Alert variant="destructive" className="border-destructive/30 bg-destructive/5">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Registration not submitted</AlertTitle>
            <AlertDescription className="space-y-3">
              <p>{submitError}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={submitting}
                onClick={handleSubmit}
                className="border-destructive/40 bg-background hover:bg-background"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                    Retrying…
                  </>
                ) : (
                  "Try submitting again"
                )}
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      )}

      <div className="flex items-center justify-between gap-4">
        {onBack && (
          <Button onClick={onBack} variant="outline" size="lg">
            {backLabel}
          </Button>
        )}
        <Button onClick={handleSubmit} disabled={submitting} size="lg" className="flex-1">
          {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
          {submitting ? "Submitting registration…" : "Submit registration"}
        </Button>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        By submitting, you confirm your information is accurate and you agree to the Rendezvous registration terms
        you signed in the previous step.
      </p>
    </div>
  )
}
