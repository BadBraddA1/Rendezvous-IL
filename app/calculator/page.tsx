"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Trash2, Calculator } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"

type FamilyMember = {
  id: string
  age: number
}

type LodgingType = "motel-2queen-bunk" | "motel-1queen-2bunk" | "rv" | "tent"
// </CHANGE>

export default function CalculatorPage() {
  const [lodgingType, setLodgingType] = useState<LodgingType>("motel-2queen-bunk")
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([
    { id: "1", age: 30 },
    { id: "2", age: 30 },
  ])

  const addFamilyMember = () => {
    setFamilyMembers([...familyMembers, { id: Date.now().toString(), age: 12 }])
  }

  const removeFamilyMember = (id: string) => {
    if (familyMembers.length > 1) {
      setFamilyMembers(familyMembers.filter((member) => member.id !== id))
    }
  }

  const updateAge = (id: string, age: number) => {
    setFamilyMembers(familyMembers.map((member) => (member.id === id ? { ...member, age } : member)))
  }

  const calculateCost = () => {
    const payingMembers = familyMembers.filter((m) => m.age >= 6)
    const payingCount = payingMembers.length
    // </CHANGE>

    let total = 0
    const breakdown: { member: string; cost: number }[] = []

    if (lodgingType.startsWith("motel")) {
      familyMembers.forEach((member, index) => {
        let cost = 0

        if (member.age <= 5) {
          cost = 0
        } else if (member.age >= 6 && member.age <= 11) {
          cost = 190
        } else if (member.age >= 12 && member.age <= 17) {
          cost = 235
        } else {
          // 18+ pricing based on occupancy
          if (payingCount === 1) {
            cost = 515
          } else if (payingCount === 2) {
            cost = 350
          } else if (payingCount === 3) {
            cost = 315
          } else {
            cost = 300
          }
        }

        total += cost
        breakdown.push({ member: `Person ${index + 1} (Age ${member.age})`, cost })
      })
    } else {
      // RV or Tent
      const siteFee = lodgingType === "rv" ? 120 : 80 // 4 nights

      familyMembers.forEach((member, index) => {
        let cost = 0

        if (member.age <= 5) {
          cost = 0
        } else if (member.age >= 6 && member.age <= 11) {
          cost = 75
        } else {
          cost = 155
        }

        total += cost
        breakdown.push({ member: `Person ${index + 1} (Age ${member.age})`, cost })
      })

      total += siteFee
      breakdown.push({
        member: `${lodgingType === "rv" ? "RV" : "Tent"} Site (4 nights)`,
        cost: siteFee,
      })
    }

    return { total, breakdown }
  }

  const { total, breakdown } = calculateCost()

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="mx-auto max-w-5xl">
          <div className="mb-8 text-center">
            <h1 className="mb-4 text-balance text-4xl font-bold tracking-tight md:text-5xl">Lodging Cost Calculator</h1>
            <p className="text-balance text-lg text-muted-foreground">Estimate your total cost for Rendezvous 2026</p>
          </div>

          <div className="grid gap-8 lg:grid-cols-2">
            {/* Input Section */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Lodging Type</CardTitle>
                  <CardDescription>All fees include 4 nights lodging, 12 meals, and basic recreation</CardDescription>
                </CardHeader>
                <CardContent>
                  <RadioGroup value={lodgingType} onValueChange={(value) => setLodgingType(value as LodgingType)}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="motel-2queen-bunk" id="motel-2queen-bunk" />
                      <Label htmlFor="motel-2queen-bunk" className="cursor-pointer">
                        Motel: 2 Queen Beds + Bunk Bed
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="motel-1queen-2bunk" id="motel-1queen-2bunk" />
                      <Label htmlFor="motel-1queen-2bunk" className="cursor-pointer">
                        Motel: 1 Queen Bed + 2 Bunk Beds
                      </Label>
                    </div>
                    {/* </CHANGE> */}
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="rv" id="rv" />
                      <Label htmlFor="rv" className="cursor-pointer">
                        RV Site ($30/night)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="tent" id="tent" />
                      <Label htmlFor="tent" className="cursor-pointer">
                        Tent Camping ($20/night)
                      </Label>
                    </div>
                  </RadioGroup>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Family Members</CardTitle>
                  <CardDescription>Add each person attending (age as of May 1st, 2026)</CardDescription>
                  {/* </CHANGE> */}
                </CardHeader>
                <CardContent className="space-y-4">
                  {familyMembers.map((member, index) => (
                    <div key={member.id} className="flex items-center gap-3">
                      <Label className="w-20 text-sm">Person {index + 1}</Label>
                      <Select
                        value={member.age.toString()}
                        onValueChange={(value) => updateAge(member.id, Number.parseInt(value))}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">0-5 years old (FREE)</SelectItem>
                          <SelectItem value="6">6-11 years old</SelectItem>
                          <SelectItem value="12">12-17 years old</SelectItem>
                          <SelectItem value="18">18+ years old</SelectItem>
                        </SelectContent>
                      </Select>
                      {/* </CHANGE> */}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFamilyMember(member.id)}
                        disabled={familyMembers.length === 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button onClick={addFamilyMember} variant="outline" className="w-full bg-transparent">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Family Member
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Results Section */}
            <div className="space-y-6">
              <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-background">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="h-5 w-5" />
                    Cost Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2 rounded-lg bg-background/50 p-4">
                    {breakdown.map((item, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{item.member}</span>
                        <span className="font-medium">${item.cost.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-baseline justify-between border-t border-border/50 pt-4">
                    <span className="text-lg font-semibold">Total Cost:</span>
                    <span className="text-3xl font-bold text-primary">${total.toFixed(2)}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Pricing Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  {lodgingType.startsWith("motel") && (
                    <>
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
                    </>
                  )}
                  {/* </CHANGE> */}
                  {lodgingType === "rv" && (
                    <>
                      <div>
                        <p className="font-medium text-foreground">RV Pricing:</p>
                        <ul className="ml-4 mt-1 space-y-1 list-disc">
                          <li>Ages 12+: $155</li>
                          <li>Ages 6-11: $75</li>
                          <li>Ages 0-5: FREE</li>
                          <li>RV Site: $30/night × 4 nights = $120</li>
                        </ul>
                      </div>
                    </>
                  )}
                  {lodgingType === "tent" && (
                    <>
                      <div>
                        <p className="font-medium text-foreground">Tent Pricing:</p>
                        <ul className="ml-4 mt-1 space-y-1 list-disc">
                          <li>Ages 12+: $155</li>
                          <li>Ages 6-11: $75</li>
                          <li>Ages 0-5: FREE</li>
                          <li>Tent Site: $20/night × 4 nights = $80</li>
                        </ul>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
