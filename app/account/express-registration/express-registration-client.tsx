"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Check,
  CheckCircle2,
  ChevronLeft,
  Home,
  Mail,
  Pencil,
  Phone,
  Shirt,
  Users,
  Zap,
} from "lucide-react"
import { FamilyInfoStep } from "@/components/registration/family-info-step"
import { LodgingStep } from "@/components/registration/lodging-step"
import { MerchandiseStep } from "@/components/registration/merchandise-step"
import { AdditionalInfoStep } from "@/components/registration/additional-info-step"
import { AgreementStep } from "@/components/registration/agreement-step"
import { ConfirmationStep } from "@/components/registration/confirmation-step"
import { calculateLodgingCost } from "@/lib/lodging-cost"
import { calculateRegistrationFee } from "@/utils/registration-fee"
import type { RegistrationData } from "@/types/registration"

const STEPS = [
  { id: 1, title: "Family Info" },
  { id: 2, title: "Lodging" },
  { id: 3, title: "Merchandise & Add-ons" },
  { id: 4, title: "Additional Info" },
  { id: 5, title: "Agreement" },
  { id: 6, title: "Review & Submit" },
]

const LODGING_LABELS: Record<string, string> = {
  "motel-2queen-bunk": "Motel room — 2 queen beds + bunk",
  "motel-1queen-2bunk": "Motel room — 1 queen bed + 2 bunks",
  rv: "RV site (bring your own RV)",
  tent: "Tent camping",
}

type Props = {
  prefill: RegistrationData
  sourceYear: number
  signatureEmailsEnabled?: boolean
}

export function ExpressRegistrationClient({
  prefill,
  sourceYear,
  signatureEmailsEnabled = false,
}: Props) {
  const [currentStep, setCurrentStep] = useState(1)
  const [editingSteps, setEditingSteps] = useState<Record<number, boolean>>({})
  const [registrationData, setRegistrationData] = useState<RegistrationData>({
    ...prefill,
    registrationFee: calculateRegistrationFee(new Date()),
  })

  const updateData = (updates: Partial<RegistrationData>) => {
    setRegistrationData((prev) => ({ ...prev, ...updates }))
  }

  // Keep lodging totals right even when the user never opens the lodging
  // editor (members added/removed on step 1 change per-person costs).
  useEffect(() => {
    setRegistrationData((prev) => {
      const { total, updatedMembers } = calculateLodgingCost(prev.lodgingType, prev.familyMembers)
      if (total === prev.lodgingTotal) return prev
      return { ...prev, lodgingTotal: total, familyMembers: updatedMembers }
    })
  }, [
    registrationData.lodgingType,
    registrationData.familyMembers.map((m) => m.age).join(","),
  ])

  // Steps 3 (merch/add-ons/scholarship) and 4 (emergency contact, volunteers)
  // never carry over — they're always a fresh fill-out, not a confirmation.
  const FRESH_STEPS = [3, 4]
  const isFreshStep = FRESH_STEPS.includes(currentStep)
  const isEditing = isFreshStep || Boolean(editingSteps[currentStep])
  const setEditing = (editing: boolean) =>
    setEditingSteps((prev) => ({ ...prev, [currentStep]: editing }))

  const [stepError, setStepError] = useState<string | null>(null)

  const goToStep = (step: number, edit = false) => {
    setCurrentStep(step)
    setStepError(null)
    if (edit) setEditingSteps((prev) => ({ ...prev, [step]: true }))
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const nextStep = () => {
    if (currentStep === 4) {
      if (!registrationData.emergencyContactName.trim() || !registrationData.emergencyContactPhone.trim()) {
        setStepError("Please enter an emergency contact name and phone number — we need a fresh one every year.")
        return
      }
    }
    goToStep(Math.min(currentStep + 1, STEPS.length))
  }
  const prevStep = () => goToStep(Math.max(currentStep - 1, 1))

  const confirmButtons = (
    <div className="space-y-3 border-t pt-4">
      {stepError && (
        <Alert variant="destructive">
          <AlertDescription>{stepError}</AlertDescription>
        </Alert>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="outline" onClick={prevStep} disabled={currentStep === 1}>
          <ChevronLeft className="mr-2 h-4 w-4" aria-hidden="true" />
          Back
        </Button>
        <div className="flex flex-col gap-3 sm:flex-row">
          {!isEditing && (
            <Button variant="outline" onClick={() => setEditing(true)}>
              <Pencil className="mr-2 h-4 w-4" aria-hidden="true" />
              Make changes
            </Button>
          )}
          <Button onClick={nextStep}>
            <Check className="mr-2 h-4 w-4" aria-hidden="true" />
            {isFreshStep ? "Continue" : isEditing ? "Done — continue" : "Yes, still right — continue"}
          </Button>
        </div>
      </div>
    </div>
  )

  const stillRightBanner = (
    <Alert className="border-primary/25 bg-primary/5">
      <AlertDescription>
        This is what you had for <strong>Rendezvous {sourceYear}</strong>. Is it still right for
        2027? If anything changed, tap <strong>Make changes</strong>.
      </AlertDescription>
    </Alert>
  )

  const freshStepBanner = (
    <Alert className="border-amber-500/30 bg-amber-500/10">
      <AlertDescription>
        {currentStep === 3
          ? "T-shirts, add-ons, and the scholarship fund don't carry over — please fill these out fresh for 2027."
          : "Your emergency contact and worship service volunteers must be re-entered every year. Health information carried over — please double-check it."}
      </AlertDescription>
    </Alert>
  )

  // ---------------------------------------------------------------------
  // Per-step summaries (the "here's last year" view)
  // ---------------------------------------------------------------------

  const familySummary = (
    <div className="space-y-4">
      <div className="space-y-2">
        {registrationData.familyMembers.map((member) => (
          <div key={member.id} className="flex items-start justify-between gap-3 rounded-lg border p-3">
            <div className="min-w-0">
              <p className="break-words font-medium">
                {member.firstName} {member.useCustomLastName && member.lastName ? member.lastName : registrationData.familyLastName}
                {member.parentRole && (
                  <Badge variant="secondary" className="ml-2 align-middle capitalize">
                    {member.parentRole}
                  </Badge>
                )}
              </p>
              <p className="text-sm text-muted-foreground">
                {member.age >= 18 ? `Adult (${member.age})` : `Age ${member.age} at the event`}
                {member.isBaptized && " • Baptized"}
              </p>
              {(member.email || member.phone) && (
                <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                  {member.email && (
                    <span className="inline-flex items-center gap-1 break-all">
                      <Mail className="h-3 w-3 shrink-0" aria-hidden="true" />
                      {member.email}
                    </span>
                  )}
                  {member.phone && (
                    <span className="inline-flex items-center gap-1">
                      <Phone className="h-3 w-3 shrink-0" aria-hidden="true" />
                      {member.phone}
                    </span>
                  )}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-3 rounded-lg border bg-muted/30 p-4 text-sm md:grid-cols-2">
        <div className="min-w-0">
          <p className="font-medium">Address</p>
          <p className="break-words text-muted-foreground">
            {registrationData.address ? (
              <>
                {registrationData.address}, {registrationData.city}, {registrationData.state}{" "}
                {registrationData.zip}
              </>
            ) : (
              "Not on file"
            )}
          </p>
        </div>
        <div className="min-w-0">
          <p className="font-medium">Home congregation</p>
          <p className="break-words text-muted-foreground">
            {registrationData.homeCongregation || "Not on file"}
          </p>
        </div>
        <div>
          <p className="font-medium">Husband phone</p>
          <p className="text-muted-foreground">{registrationData.husbandPhone || "Not on file"}</p>
        </div>
        <div>
          <p className="font-medium">Wife phone</p>
          <p className="text-muted-foreground">{registrationData.wifePhone || "Not on file"}</p>
        </div>
      </div>
    </div>
  )

  const lodgingSummary = (
    <div className="space-y-3">
      <div className="flex items-start gap-3 rounded-lg border p-4">
        <Home className="mt-0.5 h-5 w-5 text-primary" aria-hidden="true" />
        <div>
          <p className="font-medium">
            {LODGING_LABELS[registrationData.lodgingType] ?? registrationData.lodgingType}
          </p>
          <p className="text-sm text-muted-foreground">
            Estimated lodging & meals for your family: {" "}
            <span className="font-medium text-foreground">
              ${registrationData.lodgingTotal.toFixed(2)}
            </span>{" "}
            (due at check-in)
          </p>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Includes 4 nights and 12 meals. Prices are recalculated for 2027 based on your family
        members from the previous step.
      </p>
    </div>
  )

  const summaries: Record<number, React.ReactNode> = {
    1: familySummary,
    2: lodgingSummary,
  }

  const editors: Record<number, React.ReactNode> = {
    1: <FamilyInfoStep data={registrationData} updateData={updateData} />,
    2: <LodgingStep data={registrationData} updateData={updateData} />,
    3: <MerchandiseStep data={registrationData} updateData={updateData} />,
    4: <AdditionalInfoStep data={registrationData} updateData={updateData} />,
  }

  const progress = (currentStep / STEPS.length) * 100

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-primary/15 bg-primary/5 p-4">
        <div className="flex items-start gap-3">
          <Zap className="mt-0.5 h-5 w-5 text-primary" aria-hidden="true" />
          <div>
            <p className="font-medium">
              Welcome back, {registrationData.familyLastName} family!
            </p>
            <p className="text-sm text-muted-foreground">
              We loaded your family and lodging from your {sourceYear} registration. T-shirts,
              add-ons, scholarship, emergency contact, and volunteers are asked fresh each year.
              Review, fill in the new-year items, sign, and you&apos;re done.
            </p>
          </div>
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium">
            Step {currentStep} of {STEPS.length}
          </span>
          <span className="text-muted-foreground">{STEPS[currentStep - 1].title}</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {currentStep <= 4 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {currentStep === 1 && <Users className="h-5 w-5 text-primary" aria-hidden="true" />}
              {currentStep === 2 && <Home className="h-5 w-5 text-primary" aria-hidden="true" />}
              {currentStep === 3 && <Shirt className="h-5 w-5 text-primary" aria-hidden="true" />}
              {STEPS[currentStep - 1].title}
            </CardTitle>
            <CardDescription>
              {isFreshStep
                ? "Fresh every year — this doesn't carry over"
                : isEditing
                  ? "Make your changes below, then continue."
                  : `From your ${sourceYear} registration`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isFreshStep ? freshStepBanner : !isEditing && stillRightBanner}
            {isEditing ? editors[currentStep] : summaries[currentStep]}
            {confirmButtons}
          </CardContent>
        </Card>
      )}

      {currentStep === 5 && (
        <Card>
          <CardHeader>
            <CardTitle>Agreement</CardTitle>
            <CardDescription>Read and sign for 2027 — signatures don&apos;t carry over.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <AgreementStep
              data={registrationData}
              updateData={updateData}
              signatureEmailsEnabled={signatureEmailsEnabled}
            />
            <div className="flex items-center justify-between border-t pt-4">
              <Button variant="outline" onClick={prevStep}>
                <ChevronLeft className="mr-2 h-4 w-4" aria-hidden="true" />
                Back
              </Button>
              <Button onClick={nextStep}>
                <CheckCircle2 className="mr-2 h-4 w-4" aria-hidden="true" />
                Continue to review
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {currentStep === 6 && (
        <Card>
          <CardContent className="pt-6">
            <ConfirmationStep
              data={registrationData}
              onBack={prevStep}
              onEditStep={(step) => goToStep(step, true)}
              backLabel="Back to agreement"
              submitEndpoint="/api/express-registration/submit"
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
