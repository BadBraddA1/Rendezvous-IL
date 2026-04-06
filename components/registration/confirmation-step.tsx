"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle2, Loader2, Mail, Download, AlertCircle, Pencil } from "lucide-react"
import type { RegistrationData } from "@/types/registration"

type Props = {
  data: RegistrationData
  onBack?: () => void
  onEditStep?: (step: number) => void
}

export function ConfirmationStep({ data, onBack, onEditStep }: Props) {
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [registrationId, setRegistrationId] = useState<number | null>(null)

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const response = await fetch("/api/registration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!response.ok) {
        console.error("[v0] Registration server error:", result.error)
        throw new Error(result.error || "Registration failed")
      }

      setRegistrationId(result.registrationId)
      setSubmitted(true)
    } catch (error: any) {
      console.error("[v0] Registration submission error:", error.message)
      alert(`There was an error submitting your registration: ${error.message}. Please try again or contact Stephen Bradd at (217) 935-5058.`)
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
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <CheckCircle2 className="h-10 w-10 text-green-600" />
        </div>
        <div>
          <h2 className="mb-2 text-2xl font-bold">Registration Complete!</h2>
          <p className="text-muted-foreground">
            Your registration has been successfully submitted. Registration ID: #{registrationId}
          </p>
        </div>

        {!data.scholarshipRequested && (
          <Card className="border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="text-green-900">💳 Payment Due Now via Venmo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-left space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Registration Fee:</span>
                  <span className="font-medium">${data.registrationFee.toFixed(2)}</span>
                </div>
                {data.scholarshipDonation > 0 && (
                  <div className="flex justify-between text-sm text-green-700">
                    <span>Scholarship Donation:</span>
                    <span className="font-medium">+${data.scholarshipDonation.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t pt-2 text-lg font-bold text-green-900">
                  <span>Pay Now:</span>
                  <span>${dueNow.toFixed(2)}</span>
                </div>
              </div>
              <Button
                size="lg"
                className="w-full bg-[#3D95CE] hover:bg-[#2D7FB8] text-white"
                onClick={() => window.open("https://venmo.com/u/sbradd78", "_blank")}
              >
                Pay with Venmo (@sbradd78)
              </Button>
              <p className="text-xs text-green-800">
                Please include Registration ID #{registrationId} in your payment note
              </p>
            </CardContent>
          </Card>
        )}

        {!data.scholarshipRequested && dueAtCheckIn > 0 && (
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="text-blue-900">📋 Due at Check-In</CardTitle>
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
              <div className="flex justify-between border-t border-blue-300 pt-1 font-bold text-base">
                <span>At Check-In:</span>
                <span className="text-blue-700">${dueAtCheckIn.toFixed(2)}</span>
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
                  Check-in is Monday, May 4, 2026 from 1:00-5:15 PM at the Activity Center meeting room.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Alert className="border-blue-200 bg-blue-50">
          <AlertDescription className="text-blue-800 text-left">
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
        <h2 className="mb-2 text-2xl font-bold">Review Your Registration</h2>
        <p className="text-muted-foreground">Please review all information carefully before submitting</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle>Contact Information</CardTitle>
          {onEditStep && (
            <Button variant="ghost" size="sm" onClick={() => onEditStep(1)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <p className="font-medium">Family Name</p>
              <p className="text-muted-foreground">{data.familyLastName}</p>
            </div>
            <div>
              <p className="font-medium">Email</p>
              <p className="text-muted-foreground">{data.email}</p>
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
          <div>
            <p className="font-medium">Address</p>
            <p className="text-muted-foreground">
              {data.address}, {data.city}, {data.state} {data.zip}
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <p className="font-medium">Home Congregation</p>
              <p className="text-muted-foreground">{data.homeCongregation}</p>
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
          <CardTitle>Family Members ({data.familyMembers.length})</CardTitle>
          {onEditStep && (
            <Button variant="ghost" size="sm" onClick={() => onEditStep(1)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {data.familyMembers.map((member) => (
              <div key={member.id} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="font-medium">
                    {member.firstName} {member.lastName || data.familyLastName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Age: {member.isOver18 ? "18+" : member.age}
                    {member.isBaptized && " • Baptized"}
                    {member.gender && ` • ${member.gender === "male" ? "Male" : "Female"}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle>Lodging & Costs</CardTitle>
          {onEditStep && (
            <Button variant="ghost" size="sm" onClick={() => onEditStep(2)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <p className="font-medium">Lodging Type</p>
            <p className="text-muted-foreground capitalize">{data.lodgingType.replace(/-/g, " ")}</p>
          </div>
          {data.arrivalNotes && (
            <div>
              <p className="font-medium">Arrival/Departure Notes</p>
              <p className="text-muted-foreground">{data.arrivalNotes}</p>
            </div>
          )}
          {!data.scholarshipRequested && (
            <div className="space-y-3">
              <div className="rounded-lg bg-green-50 p-4 border-2 border-green-200">
                <p className="font-semibold text-green-900 mb-2">💳 Pay Now via Venmo:</p>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Registration Fee</span>
                    <span className="font-medium">${data.registrationFee.toFixed(2)}</span>
                  </div>
                  {data.scholarshipDonation > 0 && (
                    <div className="flex justify-between text-green-700">
                      <span>Scholarship Donation</span>
                      <span className="font-medium">+${data.scholarshipDonation.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-green-300 pt-1 font-bold text-base">
                    <span>Pay Now:</span>
                    <span className="text-green-700">${dueNow.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-lg bg-blue-50 p-4 border-2 border-blue-200">
                <p className="font-semibold text-blue-900 mb-2">📋 Pay at Check-In:</p>
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
                  <div className="flex justify-between border-t border-blue-300 pt-1 font-bold text-base">
                    <span>At Check-In:</span>
                    <span className="text-blue-700">${dueAtCheckIn.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-between rounded-lg bg-muted p-3 text-base font-bold">
                <span>Grand Total:</span>
                <span className="text-primary">${grandTotal.toFixed(2)}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {data.healthInfo.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle>Health Information</CardTitle>
            {onEditStep && (
              <Button variant="ghost" size="sm" onClick={() => onEditStep(4)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              {data.healthInfo.map((info) => (
                <div key={info.id} className="rounded-lg border p-3">
                  <p className="font-medium">{info.fullName}</p>
                  <p className="text-muted-foreground">{info.condition}</p>
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
            <CardTitle>Volunteer Signups</CardTitle>
            {onEditStep && (
              <Button variant="ghost" size="sm" onClick={() => onEditStep(4)}>
                <Pencil className="mr-2 h-4 w-4" />
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
        <Alert className="border-blue-200 bg-blue-50">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            You've requested financial assistance. Stephen will review your registration and contact you via email to
            discuss pricing and available help.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex items-center justify-between gap-4">
        {onBack && (
          <Button onClick={onBack} variant="outline" size="lg">
            Previous
          </Button>
        )}
        <Button onClick={handleSubmit} disabled={submitting} size="lg" className="flex-1">
          {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {submitting ? "Submitting..." : "Submit Registration"}
        </Button>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        By submitting, you confirm that all information is accurate and you agree to the terms and conditions.
      </p>
    </div>
  )
}
