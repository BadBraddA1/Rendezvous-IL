"use client"

import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle2, AlertCircle } from "lucide-react"
import type { RegistrationData } from "@/types/registration"
import { calculateRegistrationFee, isDiscountedRegistration } from "@/utils/registration-fee"

type Props = {
  data: RegistrationData
  updateData: (updates: Partial<RegistrationData>) => void
}

export function AgreementStep({ data, updateData }: Props) {
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
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-background">
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
                  <span className="font-medium text-green-600">+${data.scholarshipDonation.toFixed(2)}</span>
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
                <span className="text-3xl font-bold text-primary">${grandTotal.toFixed(2)}</span>
              </div>
            </div>
            {isDiscountedRate && (
              <Alert className="mt-4 border-green-200 bg-green-50">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  You're saving $25 with discounted registration!
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      ) : (
        <Alert className="border-blue-200 bg-blue-50">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
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
              <p className="font-medium">By registering, you agree to:</p>
              <ul className="ml-4 space-y-2 list-disc text-muted-foreground">
                <li>Behave as a Christian at all times and be mindful of your example & influence</li>
                <li>Be responsible for your children during activities and free time</li>
                <li>Observe quiet time from 12:00 AM - 6:00 AM</li>
                <li>Follow posted speed limits (streets are also sidewalks)</li>
                <li>Ride bicycles on paved areas only</li>
                <li>Fish only in designated areas (beachfront & south of Lakeside Dining Room)</li>
                <li>
                  Hold Lake Williamson Christian Center and Rendezvous leadership harmless for injuries, damages, and
                  losses
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Digital Signatures */}
      <div className="space-y-4">
        <h3 className="font-semibold">Digital Signatures</h3>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Both parents must sign, whether attending or not</AlertDescription>
        </Alert>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="fatherSignature">Father's Signature *</Label>
            <Input
              id="fatherSignature"
              placeholder="Type full name to sign"
              value={data.fatherSignature}
              onChange={(e) => updateData({ fatherSignature: e.target.value })}
              required
            />
            <p className="mt-1 text-xs text-muted-foreground">Type your full name as electronic signature</p>
          </div>
          <div>
            <Label htmlFor="motherSignature">Mother's Signature *</Label>
            <Input
              id="motherSignature"
              placeholder="Type full name to sign"
              value={data.motherSignature}
              onChange={(e) => updateData({ motherSignature: e.target.value })}
              required
            />
            <p className="mt-1 text-xs text-muted-foreground">Type your full name as electronic signature</p>
          </div>
        </div>
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
