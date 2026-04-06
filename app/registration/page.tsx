"use client"

import { useState } from "react"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { FamilyInfoStep } from "@/components/registration/family-info-step"
import { LodgingStep } from "@/components/registration/lodging-step"
import { MerchandiseStep } from "@/components/registration/merchandise-step"
import { AdditionalInfoStep } from "@/components/registration/additional-info-step"
import { AgreementStep } from "@/components/registration/agreement-step"
import { ConfirmationStep } from "@/components/registration/confirmation-step"
import type { RegistrationData } from "@/types/registration"
import { calculateRegistrationFee } from "@/utils/registration-fee"

const STEPS = [
  { id: 1, title: "Family Info", description: "Contact & family details" },
  { id: 2, title: "Lodging", description: "Select accommodations" },
  { id: 3, title: "Merchandise", description: "T-shirts & add-ons" },
  { id: 4, title: "Additional Info", description: "Health & volunteers" },
  { id: 5, title: "Agreement", description: "Review & sign" },
  { id: 6, title: "Confirmation", description: "Complete registration" },
]

export default function RegistrationPage() {
  const [currentStep, setCurrentStep] = useState(1)
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
    arrivalNotes: "",
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

  const validateCurrentStep = (): boolean => {
    if (currentStep === 1) {
      const incompletemembers = registrationData.familyMembers.filter(
        (m) => m.firstName.trim() !== "" && !m.dateOfBirth && !m.isOver18,
      )

      if (incompletemembers.length > 0) {
        alert("Please provide a date of birth or mark as over 18 for all family members before continuing.")
        return false
      }

      if (!registrationData.familyLastName.trim()) {
        alert("Please enter your family last name.")
        return false
      }
      if (!registrationData.email.trim()) {
        alert("Please enter your email address.")
        return false
      }
      if (
        !registrationData.address.trim() ||
        !registrationData.city.trim() ||
        !registrationData.state.trim() ||
        !registrationData.zip.trim()
      ) {
        alert("Please complete your address information.")
        return false
      }
      if (!registrationData.homeCongregation.trim()) {
        alert("Please enter your home congregation.")
        return false
      }

      const hasAtLeastOneMember = registrationData.familyMembers.some((m) => m.firstName.trim() !== "")
      if (!hasAtLeastOneMember) {
        alert("Please add at least one family member.")
        return false
      }

      const nonEmptyMembers = registrationData.familyMembers.filter((m) => m.firstName.trim() !== "")
      if (nonEmptyMembers.length !== registrationData.familyMembers.length) {
        updateData({ familyMembers: nonEmptyMembers })
      }
    }
    return true
  }

  const nextStep = () => {
    if (!validateCurrentStep()) {
      return
    }

    if (currentStep < STEPS.length) {
      setCurrentStep((prev) => prev + 1)
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: "smooth" })
      }, 0)
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1)
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: "smooth" })
      }, 0)
    }
  }

  const goToStep = (step: number) => {
    setCurrentStep(step)
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: "smooth" })
    }, 0)
  }

  const progress = (currentStep / STEPS.length) * 100

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main className="container mx-auto px-4 py-12">
        <div className="mx-auto max-w-4xl">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="mb-4 text-balance text-4xl font-bold tracking-tight md:text-5xl">
              Rendezvous 2026 Registration
            </h1>
            <p className="text-balance text-lg text-muted-foreground">Complete your registration for May 4-8, 2026</p>
          </div>

          {/* Progress Bar */}
          <div className="mb-8">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm font-medium">
                Step {currentStep} of {STEPS.length}
              </span>
              <span className="text-sm text-muted-foreground">{STEPS[currentStep - 1].title}</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Step Indicators */}
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

          {/* Step Content */}
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
              {currentStep === 5 && <AgreementStep data={registrationData} updateData={updateData} />}
              {currentStep === 6 && (
                <ConfirmationStep data={registrationData} onBack={prevStep} onEditStep={goToStep} />
              )}
            </CardContent>
          </Card>

          {/* Navigation Buttons */}
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
