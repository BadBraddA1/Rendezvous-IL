"use client"

import { useEffect, useRef, useState } from "react"
import { useUser } from "@clerk/nextjs"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, TestTube2, Send } from "lucide-react"
import { FamilyInfoStep } from "@/components/registration/family-info-step"
import { LodgingStep } from "@/components/registration/lodging-step"
import { MerchandiseStep } from "@/components/registration/merchandise-step"
import { AdditionalInfoStep } from "@/components/registration/additional-info-step"
import { AgreementStep } from "@/components/registration/agreement-step"
import { ConfirmationStep } from "@/components/registration/confirmation-step"
import type { FamilyMember, RegistrationData } from "@/types/registration"
import { calculateRegistrationFee } from "@/utils/registration-fee"
import type { CalculatorPrefill } from "@/lib/calculator-prefill"
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

  // Auto-populate family members (and rv/tent lodging) from info saved at the
  // end of the cost calculator — only while the form is still untouched.
  const { isSignedIn, isLoaded: authLoaded } = useUser()
  const [prefillApplied, setPrefillApplied] = useState(false)
  const prefillFetched = useRef(false)

  useEffect(() => {
    if (!authLoaded || !isSignedIn || prefillFetched.current) return
    prefillFetched.current = true

    const applyPrefill = async () => {
      try {
        const res = await fetch("/api/calculator/prefill?year=2027")
        if (!res.ok) return
        const data = await res.json()
        const prefill = data.prefill as CalculatorPrefill | null
        if (!prefill || prefill.members.length === 0) return

        const ageOnEvent = (dob: string): number => {
          const birthDate = new Date(dob)
          if (Number.isNaN(birthDate.getTime())) return 0
          const eventDate = new Date("2027-05-03")
          let age = eventDate.getFullYear() - birthDate.getFullYear()
          const monthDiff = eventDate.getMonth() - birthDate.getMonth()
          if (monthDiff < 0 || (monthDiff === 0 && eventDate.getDate() < birthDate.getDate())) {
            age--
          }
          return Math.max(0, age)
        }

        setRegistrationData((prev) => {
          // Don't clobber anything the user already typed.
          const untouched =
            prev.familyMembers.length === 1 &&
            !prev.familyMembers[0].firstName &&
            !prev.familyMembers[0].dateOfBirth
          if (!untouched) return prev

          const familyMembers: FamilyMember[] = prefill.members.map((m, index) => ({
            id: String(index + 1),
            firstName: m.firstName,
            dateOfBirth: m.dateOfBirth,
            age: m.isOver18 ? 18 : ageOnEvent(m.dateOfBirth),
            isBaptized: false,
            personCost: 0,
            isOver18: m.isOver18,
            parentRole: null,
          }))

          setPrefillApplied(true)
          return {
            ...prev,
            familyMembers,
            lodgingType:
              prefill.lodgingType === "rv" || prefill.lodgingType === "tent"
                ? prefill.lodgingType
                : prev.lodgingType,
          }
        })
      } catch {
        // Prefill is best-effort; the form works fine without it.
      }
    }

    void applyPrefill()
  }, [authLoaded, isSignedIn])

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
      {/*
        THESIS: Quiet Desk — same registration wizard, calmed to match Lakeside Gathering.
        OWN-WORLD: mist ground, Baskerville stage titles, teal only on Continue + progress fill + focus.
        STORY: Staff walk the real form; it should feel like the public site, not an admin tool.
        FIRST VIEWPORT: test banner, display title, muted step meta + thin rule, stage fields, Continue.
        FORM: Quiet Desk (#3 brand-match quieter); seed 3c05cea5 surface operate.
        FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
      */}
      <SiteHeader />

      <main id="main-content" className="reg-quiet-desk site-container site-below-header-loose site-page-intro py-10 md:py-12">
        <div className="mx-auto max-w-3xl">
          <div className="reg-quiet-desk__test-banner">
            <div className="flex items-start gap-3">
              <TestTube2 className="mt-0.5 h-5 w-5 shrink-0 text-warning" aria-hidden="true" />
              <div>
                <h3>Test mode</h3>
                <p>
                  Admin test registration — submissions are tagged ADMIN_TEST.
                  Validation is off so you can skip fields.
                  {localDevBypass ? " Localhost: no Clerk or admin toggle required." : null}
                </p>
              </div>
            </div>
          </div>

          <div className="reg-quiet-desk__debug">
            <div className="mb-3 flex items-center gap-2">
              <Send className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <p className="text-sm font-medium">Quick submit (debug)</p>
            </div>
            <p className="mb-3 text-sm text-muted-foreground">
              Posts minimal sample data to check the API path.
            </p>
            <Button onClick={testQuickSubmit} disabled={debugLoading} variant="outline" className="mb-3">
              {debugLoading ? "Submitting…" : "Test submit now"}
            </Button>
            {debugResponse ? (
              <pre className="overflow-auto rounded-md border bg-muted/30 p-3 text-xs">
                {JSON.stringify(debugResponse, null, 2)}
              </pre>
            ) : null}
          </div>

          <header className="reg-quiet-desk__intro">
            <h1 className="reg-quiet-desk__title">Rendezvous 2027 registration</h1>
            <p className="reg-quiet-desk__lead">
              Admin test of the full family registration flow. Same steps families will use —
              quieter desk chrome so it matches the rest of the site.
            </p>
          </header>

          <div className="reg-quiet-desk__progress">
            <div className="reg-quiet-desk__progress-meta">
              <span>
                Step {currentStep} of {STEPS.length}
              </span>
              <span>{STEPS[currentStep - 1].title}</span>
            </div>
            <div
              className="reg-quiet-desk__progress-rule"
              style={{ ["--reg-progress" as string]: progress / 100 }}
              role="progressbar"
              aria-valuenow={currentStep}
              aria-valuemin={1}
              aria-valuemax={STEPS.length}
              aria-label={`Step ${currentStep} of ${STEPS.length}`}
            >
              <span />
            </div>
          </div>

          <nav className="reg-quiet-desk__steps" aria-label="Registration steps">
            {STEPS.map((step) => {
              const state =
                currentStep > step.id ? "done" : currentStep === step.id ? "current" : "todo"
              return (
                <div key={step.id} className="reg-quiet-desk__step" data-state={state}>
                  <span className="reg-quiet-desk__step-index">
                    {String(step.id).padStart(2, "0")}
                  </span>
                  <span className="reg-quiet-desk__step-label">{step.title}</span>
                </div>
              )
            })}
          </nav>

          {prefillApplied && currentStep === 1 ? (
            <Alert className="mb-4">
              <AlertDescription>
                We pre-filled your family members{" "}
                {registrationData.lodgingType === "rv" || registrationData.lodgingType === "tent"
                  ? "and lodging "
                  : ""}
                from your saved cost calculator info — double-check birth dates and add anything
                missing.
              </AlertDescription>
            </Alert>
          ) : null}

          <section className="reg-quiet-desk__stage" aria-labelledby="reg-stage-title">
            <header className="reg-quiet-desk__stage-header">
              <h2 id="reg-stage-title" className="reg-quiet-desk__stage-title">
                {STEPS[currentStep - 1].title}
              </h2>
              <p className="reg-quiet-desk__stage-desc">{STEPS[currentStep - 1].description}</p>
            </header>

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
          </section>

          {stepError && currentStep === 1 ? (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{stepError}</AlertDescription>
            </Alert>
          ) : null}

          {currentStep < 6 ? (
            <div className="reg-quiet-desk__nav">
              <Button onClick={prevStep} disabled={currentStep === 1} variant="ghost">
                <ChevronLeft className="mr-2 h-4 w-4" aria-hidden="true" />
                Back
              </Button>
              <Button onClick={nextStep} data-reg-continue className="min-h-11 px-8">
                Continue
                <ChevronRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          ) : null}
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
