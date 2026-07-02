"use client"

import { useEffect } from "react"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Calculator, Home, Tent, Caravan } from "lucide-react"
import { calculateLodgingCost } from "@/lib/lodging-cost"
import type { RegistrationData, LodgingType } from "@/types/registration"

type Props = {
  data: RegistrationData
  updateData: (updates: Partial<RegistrationData>) => void
}

export function LodgingStep({ data, updateData }: Props) {
  useEffect(() => {
    const { total, updatedMembers } = calculateLodgingCost(data.lodgingType, data.familyMembers)
    updateData({ lodgingTotal: total, familyMembers: updatedMembers })
  }, [data.lodgingType, data.familyMembers.map((m) => m.age).join(",")])

  const { total } = calculateLodgingCost(data.lodgingType, data.familyMembers)

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-muted/50 p-4">
        <p className="text-sm text-muted-foreground">
          All fees include 4 nights lodging (May 4-8), 12 meals, and basic recreation activities.
        </p>
      </div>

      <div>
        <h3 className="mb-4 font-semibold">Select Your Lodging</h3>
        <RadioGroup
          value={data.lodgingType}
          onValueChange={(value) => updateData({ lodgingType: value as LodgingType })}
        >
          <div className="space-y-3">
            {/* Motel Option 1 */}
            <label
              htmlFor="motel-2queen-bunk"
              className={`flex cursor-pointer items-start gap-4 rounded-lg border-2 p-4 transition-colors hover:bg-muted/50 active:bg-muted/50 ${
                data.lodgingType === "motel-2queen-bunk" ? "border-primary bg-primary/5" : "border-border"
              }`}
            >
              <RadioGroupItem value="motel-2queen-bunk" id="motel-2queen-bunk" className="mt-1" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Home className="h-5 w-5 text-primary" />
                  <span className="font-medium">Motel: 2 Queen Beds + 1 Bunk Bed</span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Sleeps 6 comfortably. Air conditioning, private bathroom. If your family size is 7 or more, an additional connected room will be provided.
                </p>
              </div>
            </label>

            {/* Motel Option 2 */}
            <label
              htmlFor="motel-1queen-2bunk"
              className={`flex cursor-pointer items-start gap-4 rounded-lg border-2 p-4 transition-colors hover:bg-muted/50 active:bg-muted/50 ${
                data.lodgingType === "motel-1queen-2bunk" ? "border-primary bg-primary/5" : "border-border"
              }`}
            >
              <RadioGroupItem value="motel-1queen-2bunk" id="motel-1queen-2bunk" className="mt-1" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Home className="h-5 w-5 text-primary" />
                  <span className="font-medium">Motel: 1 Queen Bed + 2 Bunk Beds</span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Sleeps 6 comfortably. Air conditioning, private bathroom. If your family size is 7 or more, an additional connected room will be provided.
                </p>
              </div>
            </label>

            {/* RV Option */}
            <label
              htmlFor="rv"
              className={`flex cursor-pointer items-start gap-4 rounded-lg border-2 p-4 transition-colors hover:bg-muted/50 active:bg-muted/50 ${
                data.lodgingType === "rv" ? "border-primary bg-primary/5" : "border-border"
              }`}
            >
              <RadioGroupItem value="rv" id="rv" className="mt-1" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Caravan className="h-5 w-5 text-primary" />
                  <span className="font-medium">RV Site</span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">$30/night × 4 nights = $120. Bring your own RV.</p>
              </div>
            </label>

            {/* Tent Option */}
            <label
              htmlFor="tent"
              className={`flex cursor-pointer items-start gap-4 rounded-lg border-2 p-4 transition-colors hover:bg-muted/50 active:bg-muted/50 ${
                data.lodgingType === "tent" ? "border-primary bg-primary/5" : "border-border"
              }`}
            >
              <RadioGroupItem value="tent" id="tent" className="mt-1" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Tent className="h-5 w-5 text-primary" />
                  <span className="font-medium">Tent Camping</span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">$20/night × 4 nights = $80. Bring your own tent.</p>
              </div>
            </label>
          </div>
        </RadioGroup>
      </div>

      {/* Cost Breakdown */}
      <Card className="border-primary/20 bg-surface-highlight">
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2 text-subheading">
            <Calculator className="h-5 w-5" />
            Lodging Cost Breakdown
          </CardTitle>
          <CardDescription>Based on your family size and ages</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2 rounded-lg bg-background/50 p-4">
            {data.familyMembers
              .filter((m) => m.age >= 0 && m.personCost !== undefined)
              .map((member, index) => (
                <div key={member.id} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {member.firstName || `Person ${index + 1}`} (Age {member.age})
                  </span>
                  <span className="font-medium">${member.personCost?.toFixed(2) || "0.00"}</span>
                </div>
              ))}
            {(data.lodgingType === "rv" || data.lodgingType === "tent") && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {data.lodgingType === "rv" ? "RV" : "Tent"} Site (4 nights)
                </span>
                <span className="font-medium">${data.lodgingType === "rv" ? "120.00" : "80.00"}</span>
              </div>
            )}
          </div>

          <div className="flex items-baseline justify-between border-t border-border/50 pt-4">
            <span className="text-lg font-semibold">Lodging Total:</span>
            <span className="text-amount text-primary">${total.toFixed(2)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Pricing Reference */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pricing Reference</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          {data.lodgingType.startsWith("motel") && (
            <div>
              <p className="font-medium text-foreground">Motel Pricing (per person):</p>
              <ul className="ml-4 mt-1 space-y-1 list-disc">
                <li>Single Occupancy (1 paying person): $515</li>
                <li>Double Occupancy (2 paying people): $350 each</li>
                <li>Triple Occupancy (3 paying people): $315 each</li>
                <li>Quad+ Occupancy (4+ paying people): $300 each</li>
                <li>Ages 12-17: $235</li>
                <li>Ages 6-11: $190</li>
                <li>Ages 0-5: FREE</li>
              </ul>
            </div>
          )}
          {data.lodgingType === "rv" && (
            <div>
              <p className="font-medium text-foreground">RV Pricing:</p>
              <ul className="ml-4 mt-1 space-y-1 list-disc">
                <li>Ages 12+: $155 per person</li>
                <li>Ages 6-11: $75 per person</li>
                <li>Ages 0-5: FREE</li>
                <li>RV Site: $30/night × 4 nights = $120</li>
              </ul>
            </div>
          )}
          {data.lodgingType === "tent" && (
            <div>
              <p className="font-medium text-foreground">Tent Pricing:</p>
              <ul className="ml-4 mt-1 space-y-1 list-disc">
                <li>Ages 12+: $155 per person</li>
                <li>Ages 6-11: $75 per person</li>
                <li>Ages 0-5: FREE</li>
                <li>Tent Site: $20/night × 4 nights = $80</li>
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
