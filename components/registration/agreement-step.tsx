"use client"

import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle2, AlertCircle, Mail } from "lucide-react"
import { SignatureField } from "@/components/registration/signature-field"
import type { RegistrationData } from "@/types/registration"
import { AGREEMENT_INTRO, AGREEMENT_ITEMS } from "@/lib/agreement-content"
import { calculateRegistrationFee, isDiscountedRegistration } from "@/utils/registration-fee"

type Props = {
  data: RegistrationData
  updateData: (updates: Partial<RegistrationData>) => void
  /** When on, parents sign via emailed links instead of typing signatures here. */
  signatureEmailsEnabled?: boolean
}

export function AgreementStep({ data, updateData, signatureEmailsEnabled = false }: Props) {
  const registrationFee = calculateRegistrationFee()
  const isDiscountedRate = isDiscountedRegistration()
  const grandTotal =
    data.lodgingTotal + data.tshirtTotal + data.climbingTowerTotal + registrationFee + data.scholarshipDonation

  // Update registration fee based on discounted registration status
  if (data.registrationFee !== registrationFee) {
    updateData({ registrationFee })
  }

  return (
    <div className="space-y-6">
      {/* Cost Summary */}
      {!data.scholarshipRequested ? (
        <Card className="border-primary/20 bg-surface-highlight">
          <CardContent className="pt-6">
            <h3 className="mb-4 font-semibold">Registration Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Lodging & Meals</span>
                <span className="font-medium">${data.lodgingTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">T-Shirts & Merchandise</span>
                <span className="font-medium">${data.tshirtTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Climbing Tower</span>
                <span className="font-medium">${data.climbingTowerTotal.toFixed(2)}</span>
              </div>
              {data.scholarshipDonation > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Scholarship Donation</span>
                  <span className="font-medium text-success">+${data.scholarshipDonation.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Registration Fee {isDiscountedRate && "(Discounted Rate)"}
                </span>
                <span className="font-medium">${registrationFee.toFixed(2)}</span>
              </div>
              <div className="flex items-baseline justify-between border-t pt-2 mt-2">
                <span className="text-lg font-semibold">Grand Total:</span>
                <span className="text-amount text-primary">${grandTotal.toFixed(2)}</span>
              </div>
            </div>
            {isDiscountedRate && (
              <Alert className="mt-4 border-success/30 bg-surface-highlight">
                <CheckCircle2 className="h-4 w-4 text-success" />
                <AlertDescription className="text-on-surface">
                  You're saving $25 with discounted registration!
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      ) : (
        <Alert className="callout-info border">
          <AlertCircle className="h-4 w-4 text-info" />
          <AlertDescription className="text-on-surface">
            You've requested financial assistance. Stephen will review your registration and contact you via email to
            discuss your needs and pricing.
          </AlertDescription>
        </Alert>
      )}

      {/* Responsibilities and Requirements */}
      <div className="space-y-4">
        <h3 className="font-semibold">Your Responsibilities</h3>
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3 text-sm">
              <p className="font-medium">{AGREEMENT_INTRO}</p>
              <ul className="ml-4 space-y-2 list-disc text-muted-foreground">
                {AGREEMENT_ITEMS.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Digital Signatures */}
      <div className="space-y-4">
        <h3 className="font-semibold">Digital Signatures</h3>
        {signatureEmailsEnabled ? (
          <Card className="border-primary/20 bg-surface-highlight">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Mail className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                <div className="space-y-2 text-sm">
                  <p className="font-medium">Each parent signs by email</p>
                  <p className="text-muted-foreground">
                    After you submit, each parent receives a personal signing link at their own
                    email address. You can finish registration now — but your family can't be
                    checked in at the event until both parents have signed.
                  </p>
                  {(() => {
                    const parentEmails = data.familyMembers
                      .filter((m) => m.parentRole && m.email?.trim())
                      .map((m) => `${m.firstName || (m.parentRole === "father" ? "Father" : "Mother")} (${m.email!.trim()})`)
                    return parentEmails.length > 0 ? (
                      <p className="text-muted-foreground">
                        Signing links will be sent to: <strong>{parentEmails.join(" and ")}</strong>
                      </p>
                    ) : (
                      <p className="text-muted-foreground">
                        No parent roles were selected on the Family Info step, so one signing link
                        will be sent to <strong>{data.email || "your primary email"}</strong>.
                      </p>
                    )
                  })()}
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>Both parents must sign, whether attending or not</AlertDescription>
            </Alert>

            <div className="grid gap-6 md:grid-cols-2">
              <SignatureField
                id="fatherSignature"
                label="Father's signature"
                value={data.fatherSignature}
                onChange={(fatherSignature) => updateData({ fatherSignature })}
                required
              />
              <SignatureField
                id="motherSignature"
                label="Mother's signature"
                value={data.motherSignature}
                onChange={(motherSignature) => updateData({ motherSignature })}
                required
              />
            </div>
          </>
        )}
      </div>

      {/* Final Agreement Checkbox */}
      <Card className="border-2 border-primary/20">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Checkbox id="finalAgreement" required />
            <div>
              <Label htmlFor="finalAgreement" className="cursor-pointer font-medium">
                I understand and agree to all requirements *
              </Label>
              <p className="mt-1 text-sm text-muted-foreground">
                We take full responsibility for ourselves and our children. We understand and agree to abide by all
                statements and regulations listed above.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
