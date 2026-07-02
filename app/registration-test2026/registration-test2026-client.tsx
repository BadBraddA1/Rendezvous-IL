"use client"

import { useState } from "react"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { ChevronLeft, ChevronRight, TestTube2, Send } from "lucide-react"
import { FamilyInfoStep } from "@/components/registration/family-info-step"
import { LodgingStep } from "@/components/registration/lodging-step"
import { MerchandiseStep } from "@/components/registration/merchandise-step"
import { AdditionalInfoStep } from "@/components/registration/additional-info-step"
import { AgreementStep } from "@/components/registration/agreement-step"
import { ConfirmationStep } from "@/components/registration/confirmation-step"
import type { RegistrationData } from "@/types/registration"
import { calculateRegistrationFee } from "@/utils/registration-fee"
import {
  DEFAULT_ARRIVAL_DEPARTURE,
  validateArrivalDeparture,
} from "@/lib/registration-arrival-departure"

const STEPS = [
  { id: 1, title: "Family Info", description: "Contact & family details" },
  { id: 2, title: "Lodging", description: "Select accommodations" },
  { id: 3, title: "Merchandise", description: "T-shirts & add-ons" },
  { id: 4, title: "Additional Info", description: "Health & volunteers" },
  { id: 5, title: "Agreement", description: "Review & sign" },
  { id: 6, title: "Confirmation", description: "Complete registration" },
]

type Props = {
  localDevBypass?: boolean
  signatureEmailsEnabled?: boolean
}

export function RegistrationTest2026Client({
  localDevBypass = false,
  signatureEmailsEnabled = false,
}: Props) {
  const [currentStep, setCurrentStep] = useState(1)
  const [debugLoading, setDebugLoading] = useState(false)
  const [debugResponse, setDebugResponse] = useState<unknown>(null)
  const [stepError, setStepError] = useState<string | null>(null)
  const [registrationData, setRegistrationData] = useState<RegistrationData>({
    familyLastName: "",
    email: "",
    husbandPhone: "",
    wifePhone: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    homeCongregation: "",
    fatherOccupation: "",
    timesAttended: 0,
    yearsHomeschooling: 0,
    currentlyHomeschooling: true,
    arrivalDeparture: { ...DEFAULT_ARRIVAL_DEPARTURE },
    familyMembers: [
      {
        id: "1",
        firstName: "",
        dateOfBirth: "",
        age: 0,
        isBaptized: false,
        personCost: 0,
        isOver18: false,
        parentRole: null,
      },
    ],
    lodgingType: "motel-2queen-bunk",
    lodgingTotal: 0,
    tshirtOrders: [],
    tshirtTotal: 0,
    climbingTowerParticipants: 0,
    climbingTowerTotal: 0,
    scholarshipDonation: 0,
    scholarshipRequested: false,
    emergencyContactName: "",
    emergencyContactRelationship: "",
    emergencyContactPhone: "",
    healthInfo: [],
    volunteerSignups: [],
    sessionSuggestions: { moms: "", dads: "" },
    fatherSignature: "",
    motherSignature: "",
    registrationFee: calculateRegistrationFee(new Date()),
  })

  const updateData = (updates: Partial<RegistrationData>) => {
    setRegistrationData((prev) => ({ ...prev, ...updates }))
  }

  const validateParentContacts = (): string | null => {
    const parents = registrationData.familyMembers.filter((m) => m.parentRole)
    for (const parent of parents) {
      if (!parent.email?.trim()) {
        const role = parent.parentRole === "father" ? "father" : "mother"
        return `An email address is required for the ${role} (${parent.firstName || "unnamed"}).`
      }
    }
    const emails = parents.map((p) => p.email!.trim().toLowerCase())
    if (new Set(emails).size !== emails.length) {
      return "The father and mother must use different email addresses."
    }
    return null
  }

  const validateCurrentStep = (): boolean => {
    if (currentStep === 1) {
      const arrivalError = validateArrivalDeparture(
        registrationData.arrivalDeparture,
        registrationData.familyMembers,
      )
      if (arrivalError) {
        setStepError(arrivalError)
        return false
      }
      const contactError = validateParentContacts()
      if (contactError) {
        setStepError(contactError)
        return false
      }
    }
    setStepError(null)
    return true
  }

  const nextStep = () => {
    if (!validateCurrentStep()) {
      return
    }

    if (currentStep < STEPS.length) {
      setCurrentStep((prev) => prev + 1)
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1)
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }

  const progress = (currentStep / STEPS.length) * 100

  const testQuickSubmit = async () => {
    setDebugLoading(true)
    setDebugResponse(null)

    const minimalData = {
      familyLastName: "TestFamily",
      email: "test@example.com",
      husbandPhone: "555-0100",
      wifePhone: "555-0101",
      address: "123 Test St",
      city: "TestCity",
      state: "TX",
      zip: "12345",
      homeCongregation: "Test Church",
      fatherOccupation: "Tester",
      timesAttended: 0,
      yearsHomeschooling: 5,
      currentlyHomeschooling: true,
      arrivalDeparture: { ...DEFAULT_ARRIVAL_DEPARTURE },
      familyMembers: [
        {
          id: "1",
          firstName: "John",
          dateOfBirth: "1980-01-01",
          age: 44,
          isBaptized: true,
          personCost: 120,
          isOver18: true,
          parentRole: "father",
          lastName: "TestFamily",
          useCustomLastName: false,
        },
      ],
      lodgingType: "motel-2queen-bunk",
      lodgingTotal: 300,
      tshirtOrders: [],
      tshirtTotal: 0,
      climbingTowerParticipants: 0,
      climbingTowerTotal: 0,
      scholarshipDonation: 0,
      scholarshipRequested: false,
      emergencyContactName: "Jane Doe",
      emergencyContactRelationship: "Sister",
      emergencyContactPhone: "555-0102",
      healthInfo: [],
      volunteerSignups: [],
      sessionSuggestions: { moms: "", dads: "" },
      fatherSignature: "John TestFamily",
      motherSignature: "",
      registrationFee: calculateRegistrationFee(new Date()),
    }

    console.log("[v0] Submitting minimal test data:", minimalData)

    try {
      const response = await fetch("/api/registration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(minimalData),
      })

      const data = await response.json()

      console.log("[v0] Response status:", response.status)
      console.log("[v0] Response data:", data)

      setDebugResponse({
        status: response.status,
        ok: response.ok,
        data: data,
      })
    } catch (error) {
      console.error("[v0] Test submission error:", error)
      setDebugResponse({
        status: 0,
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      })
    } finally {
      setDebugLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

        <main id="main-content" className="site-container site-below-header-loose site-page-intro py-12">
        <div className="mx-auto max-w-4xl">
          <div className="mb-6 rounded-lg border-2 border-orange-500 bg-orange-50 p-4 dark:bg-orange-950">
            <div className="flex items-center gap-3">
              <TestTube2 className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              <div>
                <h3 className="font-semibold text-orange-900 dark:text-orange-100">Test Mode Active</h3>
                <p className="text-sm text-orange-700 dark:text-orange-300">
                  This is a test registration page for admin testing. All submissions will be marked as test data.
                  <strong className="ml-1">Validation is disabled — you can skip any fields.</strong>
                  {localDevBypass && (
                    <>
                      {" "}
                      <strong>Localhost dev:</strong> no Clerk sign-in or admin toggle required.
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>

          <Card className="mb-6 border-blue-500 bg-blue-50 dark:bg-blue-950">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-100">
                <Send className="h-5 w-5" />
                Quick Submit Test
              </CardTitle>
              <CardDescription className="text-blue-700 dark:text-blue-300">
                Test API submission with minimal data to debug errors
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={testQuickSubmit} disabled={debugLoading} className="mb-4">
                {debugLoading ? "Submitting..." : "Test Submit Now"}
              </Button>

              {debugResponse && (
                <div className="rounded-lg border bg-white p-4 dark:bg-gray-900">
                  <div className="mb-2 flex items-center gap-2">
                    <span
                      className={`inline-block h-3 w-3 rounded-full ${debugResponse.ok ? "bg-green-500" : "bg-red-500"}`}
                    />
                    <strong>Status: {debugResponse.status}</strong>
                  </div>
                  <pre className="overflow-auto rounded bg-gray-100 p-3 text-xs dark:bg-gray-800">
                    {JSON.stringify(debugResponse, null, 2)}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="mb-8 text-center">
            <h1 className="mb-4 text-balance text-4xl font-bold tracking-tight md:text-5xl">
              Rendezvous 2027 Registration (Admin test)
            </h1>
            <p className="text-balance text-lead text-muted-foreground">
              Walk through the full registration flow. Submissions are tagged ADMIN_TEST in Turso.
            </p>
          </div>

          <div className="mb-8">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm font-medium">
                Step {currentStep} of {STEPS.length}
              </span>
              <span className="text-sm text-muted-foreground">{STEPS[currentStep - 1].title}</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          <div className="mb-8 hidden md:block">
            <div className="flex items-center justify-between">
              {STEPS.map((step, index) => (
                <div key={step.id} className="flex flex-1 items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-full border-2 font-semibold transition-colors ${
                        currentStep > step.id
                          ? "border-primary bg-primary text-primary-foreground"
                          : currentStep === step.id
                            ? "border-primary text-primary"
                            : "border-muted text-muted-foreground"
                      }`}
                    >
                      {step.id}
                    </div>
                    <div className="mt-2 text-center">
                      <div className="text-xs font-medium">{step.title}</div>
                    </div>
                  </div>
                  {index < STEPS.length - 1 && (
                    <div
                      className={`mx-2 h-0.5 flex-1 transition-colors ${
                        currentStep > step.id ? "bg-primary" : "bg-muted"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle>{STEPS[currentStep - 1].title}</CardTitle>
              <CardDescription>{STEPS[currentStep - 1].description}</CardDescription>
            </CardHeader>
            <CardContent>
              {currentStep === 1 && <FamilyInfoStep data={registrationData} updateData={updateData} />}
              {currentStep === 2 && <LodgingStep data={registrationData} updateData={updateData} />}
              {currentStep === 3 && <MerchandiseStep data={registrationData} updateData={updateData} />}
              {currentStep === 4 && <AdditionalInfoStep data={registrationData} updateData={updateData} />}
              {currentStep === 5 && (
                <AgreementStep
                  data={registrationData}
                  updateData={updateData}
                  signatureEmailsEnabled={signatureEmailsEnabled}
                />
              )}
              {currentStep === 6 && <ConfirmationStep data={registrationData} />}
            </CardContent>
          </Card>

          {stepError && currentStep === 1 && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{stepError}</AlertDescription>
            </Alert>
          )}

          {currentStep < 6 && (
            <div className="flex items-center justify-between">
              <Button onClick={prevStep} disabled={currentStep === 1} variant="outline">
                <ChevronLeft className="mr-2 h-4 w-4" />
                Previous
              </Button>
              <Button onClick={nextStep}>
                Next
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
