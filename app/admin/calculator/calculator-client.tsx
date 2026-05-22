"use client"

import { useState, useMemo, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Calculator, 
  Users, 
  Home, 
  Tent,
  Truck,
  Car,
  DollarSign,
  Plus,
  Minus,
  RefreshCw,
  Info,
  Calendar
} from "lucide-react"
import useSWR from "swr"

interface Rate {
  id: number
  category: string
  name: string
  label: string
  amount: string
  description: string | null
}

interface RatesData {
  year: number
  chartId: number
  rates: Record<string, Rate[]>
}

interface FamilyMember {
  id: string
  name: string
  ageGroup: "adult" | "youth" | "child" | "infant"
  age: number
}

interface MemberAttendance {
  attending: boolean
  nights: string[]
  meals: Record<string, string[]>
}

const fetcher = (url: string) => fetch(url).then(res => res.json())

const NIGHTS = ["mon", "tue", "wed", "thu"] as const
const MEALS = {
  mon: ["dinner"],
  tue: ["breakfast", "lunch", "dinner"],
  wed: ["breakfast", "lunch", "dinner"],
  thu: ["breakfast", "lunch", "dinner"],
  fri: ["breakfast", "lunch"],
} as const

const NIGHT_LABELS: Record<string, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
}

const MEAL_LABELS: Record<string, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
}

function getAgeGroup(age: number): "adult" | "youth" | "child" | "infant" {
  if (age >= 18) return "adult"
  if (age >= 12) return "youth"
  if (age >= 6) return "child"
  return "infant"
}

export function AdminCalculatorClient() {
  const [year, setYear] = useState("2027")
  const { data: ratesData, isLoading } = useSWR<RatesData>(
    `/api/admin/calculator?year=${year}`,
    fetcher
  )

  // Lodging configuration
  const [lodgingType, setLodgingType] = useState<"motel" | "rv" | "tent" | "drivein">("motel")
  const [occupancyType, setOccupancyType] = useState<"single" | "double" | "triple" | "quad">("double")
  const [numNights, setNumNights] = useState(4)
  const [packageType, setPackageType] = useState<"regular" | "special_3_9" | "special_2_6" | "special_1_3">("regular")

  // Family members for testing
  const [members, setMembers] = useState<FamilyMember[]>([
    { id: "1", name: "Adult 1", ageGroup: "adult", age: 35 },
    { id: "2", name: "Adult 2", ageGroup: "adult", age: 33 },
  ])

  // Attendance tracking per member
  const [attendance, setAttendance] = useState<Record<string, MemberAttendance>>({
    "1": { attending: true, nights: [...NIGHTS], meals: { mon: ["dinner"], tue: ["breakfast", "lunch", "dinner"], wed: ["breakfast", "lunch", "dinner"], thu: ["breakfast", "lunch", "dinner"], fri: ["breakfast", "lunch"] } },
    "2": { attending: true, nights: [...NIGHTS], meals: { mon: ["dinner"], tue: ["breakfast", "lunch", "dinner"], wed: ["breakfast", "lunch", "dinner"], thu: ["breakfast", "lunch", "dinner"], fri: ["breakfast", "lunch"] } },
  })

  // Helper to get rate amount by category and name pattern
  const getRate = useCallback((category: string, namePattern: string): number => {
    if (!ratesData?.rates?.[category]) return 0
    const rate = ratesData.rates[category].find(r => r.name.includes(namePattern))
    return rate ? parseFloat(rate.amount) : 0
  }, [ratesData])

  // Add a new member
  const addMember = () => {
    const newId = (Math.max(0, ...members.map(m => parseInt(m.id))) + 1).toString()
    const newMember: FamilyMember = {
      id: newId,
      name: `Person ${newId}`,
      ageGroup: "adult",
      age: 30,
    }
    setMembers([...members, newMember])
    setAttendance({
      ...attendance,
      [newId]: {
        attending: true,
        nights: [...NIGHTS],
        meals: { mon: ["dinner"], tue: ["breakfast", "lunch", "dinner"], wed: ["breakfast", "lunch", "dinner"], thu: ["breakfast", "lunch", "dinner"], fri: ["breakfast", "lunch"] },
      },
    })
  }

  // Remove a member
  const removeMember = (id: string) => {
    if (members.length <= 1) return
    setMembers(members.filter(m => m.id !== id))
    const newAttendance = { ...attendance }
    delete newAttendance[id]
    setAttendance(newAttendance)
  }

  // Update member
  const updateMember = (id: string, updates: Partial<FamilyMember>) => {
    setMembers(members.map(m => {
      if (m.id !== id) return m
      const updated = { ...m, ...updates }
      // Auto-update age group when age changes
      if (updates.age !== undefined) {
        updated.ageGroup = getAgeGroup(updates.age)
      }
      return updated
    }))
  }

  // Toggle night attendance
  const toggleNight = (memberId: string, night: string) => {
    const memberAtt = attendance[memberId]
    if (!memberAtt) return

    const nights = memberAtt.nights.includes(night)
      ? memberAtt.nights.filter(n => n !== night)
      : [...memberAtt.nights, night]
    
    // Update meals based on nights
    const meals = { ...memberAtt.meals }
    if (!nights.includes(night)) {
      // Remove meals for that night and the next morning
      delete meals[night]
      const nextDay = NIGHTS[NIGHTS.indexOf(night as typeof NIGHTS[number]) + 1]
      if (nextDay && meals[nextDay]) {
        meals[nextDay] = meals[nextDay].filter(m => m !== "breakfast")
      }
    } else {
      // Add default meals
      meals[night] = MEALS[night as keyof typeof MEALS] || []
    }

    setAttendance({
      ...attendance,
      [memberId]: { ...memberAtt, nights, meals },
    })
  }

  // Toggle meal
  const toggleMeal = (memberId: string, day: string, meal: string) => {
    const memberAtt = attendance[memberId]
    if (!memberAtt) return

    const dayMeals = memberAtt.meals[day] || []
    const newDayMeals = dayMeals.includes(meal)
      ? dayMeals.filter(m => m !== meal)
      : [...dayMeals, meal]

    setAttendance({
      ...attendance,
      [memberId]: {
        ...memberAtt,
        meals: { ...memberAtt.meals, [day]: newDayMeals },
      },
    })
  }

  // Calculate costs
  const calculation = useMemo(() => {
    if (!ratesData?.rates) {
      return { members: [], lodging: 0, siteFee: 0, deductions: 0, additions: 0, total: 0 }
    }

    const attendingMembers = members.filter(m => attendance[m.id]?.attending)
    
    const memberCosts = attendingMembers.map(member => {
      const att = attendance[member.id]
      let baseCost = 0
      let deductions = 0
      let additions = 0

      // Determine which rate category to use
      const rateCategory = packageType === "regular" ? lodgingType : packageType

      // Get base lodging rate
      if (lodgingType === "motel") {
        if (member.ageGroup === "adult") {
          const occupancyName = `motel_${occupancyType}_adult`
          baseCost = getRate(rateCategory, occupancyName)
        } else {
          baseCost = getRate(rateCategory, `motel_${member.ageGroup}`)
        }
      } else if (lodgingType === "rv") {
        baseCost = getRate(rateCategory, `rv_${member.ageGroup}`)
      } else if (lodgingType === "tent") {
        baseCost = getRate(rateCategory, `tent_${member.ageGroup}`)
      } else if (lodgingType === "drivein") {
        baseCost = getRate("drivein", `drivein_${member.ageGroup}`)
      }

      // For regular package, calculate deductions for missed meals
      if (packageType === "regular" && lodgingType !== "drivein") {
        // Monday dinner deduction
        if (!att.nights.includes("mon") || !att.meals.mon?.includes("dinner")) {
          deductions += Math.abs(getRate("deduction", `monday_dinner_${member.ageGroup}`))
        }
        // Friday breakfast deduction  
        if (!att.meals.fri?.includes("breakfast")) {
          deductions += Math.abs(getRate("deduction", `friday_breakfast_${member.ageGroup}`))
        }
        // Friday lunch deduction
        if (!att.meals.fri?.includes("lunch")) {
          deductions += Math.abs(getRate("deduction", `friday_lunch_${member.ageGroup}`))
        }
      }

      // Drive-in meal additions
      if (lodgingType === "drivein") {
        Object.entries(att.meals).forEach(([day, meals]) => {
          meals.forEach(meal => {
            additions += getRate("meal_addition", `${meal}_${member.ageGroup}`)
          })
        })
      }

      return {
        member,
        baseCost,
        deductions,
        additions,
        total: baseCost - deductions + additions,
      }
    })

    // Site fees (for RV and Tent)
    let siteFee = 0
    if (lodgingType === "rv") {
      siteFee = getRate("rv", "rv_site_night") * numNights
    } else if (lodgingType === "tent") {
      siteFee = getRate("tent", "tent_site_night") * numNights
    }

    const totalLodging = memberCosts.reduce((sum, m) => sum + m.baseCost, 0)
    const totalDeductions = memberCosts.reduce((sum, m) => sum + m.deductions, 0)
    const totalAdditions = memberCosts.reduce((sum, m) => sum + m.additions, 0)
    const grandTotal = totalLodging - totalDeductions + totalAdditions + siteFee

    return {
      members: memberCosts,
      lodging: totalLodging,
      siteFee,
      deductions: totalDeductions,
      additions: totalAdditions,
      total: grandTotal,
    }
  }, [members, attendance, lodgingType, occupancyType, packageType, numNights, ratesData, getRate])

  // Reset to defaults
  const resetCalculator = () => {
    setLodgingType("motel")
    setOccupancyType("double")
    setNumNights(4)
    setPackageType("regular")
    setMembers([
      { id: "1", name: "Adult 1", ageGroup: "adult", age: 35 },
      { id: "2", name: "Adult 2", ageGroup: "adult", age: 33 },
    ])
    setAttendance({
      "1": { attending: true, nights: [...NIGHTS], meals: { mon: ["dinner"], tue: ["breakfast", "lunch", "dinner"], wed: ["breakfast", "lunch", "dinner"], thu: ["breakfast", "lunch", "dinner"], fri: ["breakfast", "lunch"] } },
      "2": { attending: true, nights: [...NIGHTS], meals: { mon: ["dinner"], tue: ["breakfast", "lunch", "dinner"], wed: ["breakfast", "lunch", "dinner"], thu: ["breakfast", "lunch", "dinner"], fri: ["breakfast", "lunch"] } },
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Calculator className="h-6 w-6" />
            Rate Calculator
          </h1>
          <p className="text-muted-foreground">
            Test all pricing scenarios for {year}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2027">2027</SelectItem>
              <SelectItem value="2026">2026</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={resetCalculator}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Configuration Panel */}
        <div className="lg:col-span-2 space-y-6">
          {/* Lodging Type */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Home className="h-5 w-5" />
                Lodging Type
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <RadioGroup
                value={lodgingType}
                onValueChange={(v) => setLodgingType(v as typeof lodgingType)}
                className="grid grid-cols-2 md:grid-cols-4 gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="motel" id="motel" />
                  <Label htmlFor="motel" className="flex items-center gap-2 cursor-pointer">
                    <Home className="h-4 w-4" />
                    Motel
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="rv" id="rv" />
                  <Label htmlFor="rv" className="flex items-center gap-2 cursor-pointer">
                    <Truck className="h-4 w-4" />
                    RV
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="tent" id="tent" />
                  <Label htmlFor="tent" className="flex items-center gap-2 cursor-pointer">
                    <Tent className="h-4 w-4" />
                    Tent
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="drivein" id="drivein" />
                  <Label htmlFor="drivein" className="flex items-center gap-2 cursor-pointer">
                    <Car className="h-4 w-4" />
                    Drive-In
                  </Label>
                </div>
              </RadioGroup>

              {lodgingType === "motel" && (
                <div className="pt-4 border-t">
                  <Label className="text-sm font-medium mb-2 block">Room Occupancy</Label>
                  <RadioGroup
                    value={occupancyType}
                    onValueChange={(v) => setOccupancyType(v as typeof occupancyType)}
                    className="grid grid-cols-2 md:grid-cols-4 gap-4"
                  >
                    {["single", "double", "triple", "quad"].map((occ) => (
                      <div key={occ} className="flex items-center space-x-2">
                        <RadioGroupItem value={occ} id={occ} />
                        <Label htmlFor={occ} className="cursor-pointer capitalize">
                          {occ}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              )}

              {(lodgingType === "rv" || lodgingType === "tent") && (
                <div className="pt-4 border-t">
                  <Label className="text-sm font-medium mb-2 block">Number of Nights</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setNumNights(Math.max(1, numNights - 1))}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <Input
                      type="number"
                      value={numNights}
                      onChange={(e) => setNumNights(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-20 text-center"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setNumNights(numNights + 1)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {lodgingType !== "drivein" && (
                <div className="pt-4 border-t">
                  <Label className="text-sm font-medium mb-2 block">Package Type</Label>
                  <Select value={packageType} onValueChange={(v) => setPackageType(v as typeof packageType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="regular">Regular 4/12 (Full Week)</SelectItem>
                      <SelectItem value="special_3_9">Special 3/9 (3 Nights/9 Meals)</SelectItem>
                      <SelectItem value="special_2_6">Special 2/6 (2 Nights/6 Meals)</SelectItem>
                      <SelectItem value="special_1_3">Special 1/3 (1 Night/3 Meals)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Family Members */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Family Members
                </CardTitle>
                <Button size="sm" onClick={addMember}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Person
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {members.map((member) => (
                  <div key={member.id} className="border rounded-lg p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <Input
                          value={member.name}
                          onChange={(e) => updateMember(member.id, { name: e.target.value })}
                          className="max-w-[200px]"
                        />
                        <div className="flex items-center gap-2">
                          <Label className="text-sm text-muted-foreground">Age:</Label>
                          <Input
                            type="number"
                            value={member.age}
                            onChange={(e) => updateMember(member.id, { age: parseInt(e.target.value) || 0 })}
                            className="w-20"
                            min={0}
                          />
                        </div>
                        <Badge variant="secondary">
                          {member.ageGroup === "adult" ? "Adult (18+)" :
                           member.ageGroup === "youth" ? "Youth (12-17)" :
                           member.ageGroup === "child" ? "Child (6-11)" : "Infant (0-5)"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id={`attending-${member.id}`}
                            checked={attendance[member.id]?.attending}
                            onCheckedChange={(checked) => {
                              setAttendance({
                                ...attendance,
                                [member.id]: { ...attendance[member.id], attending: checked === true },
                              })
                            }}
                          />
                          <Label htmlFor={`attending-${member.id}`} className="text-sm">
                            Attending
                          </Label>
                        </div>
                        {members.length > 1 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeMember(member.id)}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Attendance Details */}
                    {attendance[member.id]?.attending && packageType === "regular" && lodgingType !== "drivein" && (
                      <Tabs defaultValue="nights" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="nights">
                            <Calendar className="h-4 w-4 mr-2" />
                            Nights
                          </TabsTrigger>
                          <TabsTrigger value="meals">Meals</TabsTrigger>
                        </TabsList>
                        <TabsContent value="nights" className="pt-4">
                          <div className="flex flex-wrap gap-2">
                            {NIGHTS.map((night) => (
                              <div key={night} className="flex items-center gap-2">
                                <Checkbox
                                  id={`${member.id}-${night}`}
                                  checked={attendance[member.id]?.nights.includes(night)}
                                  onCheckedChange={() => toggleNight(member.id, night)}
                                />
                                <Label htmlFor={`${member.id}-${night}`} className="text-sm cursor-pointer">
                                  {NIGHT_LABELS[night]}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </TabsContent>
                        <TabsContent value="meals" className="pt-4">
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                            {Object.entries(MEALS).map(([day, availableMeals]) => (
                              <div key={day} className="space-y-2">
                                <Label className="font-medium capitalize">{day}</Label>
                                {availableMeals.map((meal) => (
                                  <div key={`${day}-${meal}`} className="flex items-center gap-2">
                                    <Checkbox
                                      id={`${member.id}-${day}-${meal}`}
                                      checked={attendance[member.id]?.meals[day]?.includes(meal)}
                                      onCheckedChange={() => toggleMeal(member.id, day, meal)}
                                    />
                                    <Label
                                      htmlFor={`${member.id}-${day}-${meal}`}
                                      className="text-xs cursor-pointer"
                                    >
                                      {MEAL_LABELS[meal]}
                                    </Label>
                                  </div>
                                ))}
                              </div>
                            ))}
                          </div>
                        </TabsContent>
                      </Tabs>
                    )}

                    {/* Drive-in meal selection */}
                    {lodgingType === "drivein" && attendance[member.id]?.attending && (
                      <div className="pt-2">
                        <Label className="text-sm font-medium mb-2 block">Meals to Add</Label>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                          {Object.entries(MEALS).map(([day, availableMeals]) => (
                            <div key={day} className="space-y-2">
                              <Label className="font-medium capitalize">{day}</Label>
                              {availableMeals.map((meal) => (
                                <div key={`${day}-${meal}`} className="flex items-center gap-2">
                                  <Checkbox
                                    id={`${member.id}-${day}-${meal}`}
                                    checked={attendance[member.id]?.meals[day]?.includes(meal)}
                                    onCheckedChange={() => toggleMeal(member.id, day, meal)}
                                  />
                                  <Label
                                    htmlFor={`${member.id}-${day}-${meal}`}
                                    className="text-xs cursor-pointer"
                                  >
                                    {MEAL_LABELS[meal]}
                                  </Label>
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Results Panel */}
        <div>
          <Card className="sticky top-24 border-primary/20 bg-gradient-to-br from-primary/5 to-background">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Cost Breakdown
              </CardTitle>
              <CardDescription>
                {year} • {packageType === "regular" ? "Regular 4/12" : packageType.replace("_", "/").toUpperCase()}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Per-member breakdown */}
              <div className="space-y-2">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Per Person
                </h4>
                {calculation.members.map(({ member, baseCost, deductions, additions, total }) => (
                  <div key={member.id} className="text-sm border-b pb-2 last:border-0">
                    <div className="flex justify-between font-medium">
                      <span>{member.name}</span>
                      <span>${total.toFixed(2)}</span>
                    </div>
                    <div className="text-xs text-muted-foreground space-y-0.5 mt-1">
                      <div className="flex justify-between">
                        <span>Base ({member.ageGroup})</span>
                        <span>${baseCost.toFixed(2)}</span>
                      </div>
                      {deductions > 0 && (
                        <div className="flex justify-between text-green-600">
                          <span>Deductions</span>
                          <span>-${deductions.toFixed(2)}</span>
                        </div>
                      )}
                      {additions > 0 && (
                        <div className="flex justify-between text-orange-600">
                          <span>Meal Additions</span>
                          <span>+${additions.toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Site fee */}
              {calculation.siteFee > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Site Fee</h4>
                  <div className="flex justify-between text-sm">
                    <span>{lodgingType === "rv" ? "RV" : "Tent"} Site ({numNights} nights)</span>
                    <span>${calculation.siteFee.toFixed(2)}</span>
                  </div>
                </div>
              )}

              {/* Summary */}
              <div className="pt-4 border-t-2 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Lodging Subtotal</span>
                  <span>${calculation.lodging.toFixed(2)}</span>
                </div>
                {calculation.deductions > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Total Deductions</span>
                    <span>-${calculation.deductions.toFixed(2)}</span>
                  </div>
                )}
                {calculation.additions > 0 && (
                  <div className="flex justify-between text-sm text-orange-600">
                    <span>Total Additions</span>
                    <span>+${calculation.additions.toFixed(2)}</span>
                  </div>
                )}
                {calculation.siteFee > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Site Fee</span>
                    <span>${calculation.siteFee.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="text-lg font-bold">Total</span>
                  <span className="text-2xl font-bold text-primary">
                    ${calculation.total.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Info note */}
              <div className="pt-4 border-t">
                <div className="flex gap-2 text-xs text-muted-foreground">
                  <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <p>
                    This calculator uses the {year} rate chart. Deductions apply for missed
                    Monday dinner, Friday breakfast, or Friday lunch. Drive-in guests pay per meal.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
