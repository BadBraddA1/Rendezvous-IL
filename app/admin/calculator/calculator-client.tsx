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
  Calendar,
  Sparkles,
  Globe,
  GlobeLock,
  Loader2
} from "lucide-react"
import { Switch } from "@/components/ui/switch"
import useSWR, { mutate } from "swr"

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
/** RV and tent site fees are priced per night for the event (Mon–Thu). */
const MAX_LODGING_NIGHTS = NIGHTS.length

function clampLodgingNights(value: number): number {
  return Math.min(MAX_LODGING_NIGHTS, Math.max(1, value))
}
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

  // Public calculator status
  const { data: statusData, isLoading: statusLoading } = useSWR<{ enabled: boolean }>(
    "/api/admin/calculator/status",
    fetcher
  )
  const [isTogglingStatus, setIsTogglingStatus] = useState(false)

  const togglePublicCalculator = async () => {
    setIsTogglingStatus(true)
    try {
      const newStatus = !statusData?.enabled
      await fetch("/api/admin/calculator/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: newStatus }),
      })
      mutate("/api/admin/calculator/status")
    } catch (error) {
      console.error("Failed to toggle calculator status:", error)
    } finally {
      setIsTogglingStatus(false)
    }
  }

  // Lodging configuration
  const [lodgingType, setLodgingType] = useState<"motel" | "rv" | "tent" | "drivein">("motel")
  const [numNights, setNumNights] = useState(4)

  // Auto-detect package type based on attendance
  const detectPackageType = useCallback((memberAttendance: Record<string, MemberAttendance>): "regular" | "special_3_9" | "special_2_6" | "special_1_3" => {
    // Get the first attending member's attendance to determine package
    const firstAttendance = Object.values(memberAttendance).find(a => a.attending)
    if (!firstAttendance) return "regular"

    const nightCount = firstAttendance.nights.length
    const mealCount = Object.values(firstAttendance.meals).reduce((sum, meals) => sum + meals.length, 0)

    // Check for special packages (exact matches)
    if (nightCount === 3 && mealCount === 9) return "special_3_9"
    if (nightCount === 2 && mealCount === 6) return "special_2_6"
    if (nightCount === 1 && mealCount === 3) return "special_1_3"

    return "regular"
  }, [])

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
      // Add default meals (spread to create mutable array)
      const mealKey = night as keyof typeof MEALS
      meals[night] = mealKey in MEALS ? [...MEALS[mealKey]] : []
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

  // Calculate package type based on attendance
  const packageType = useMemo(() => {
    return detectPackageType(attendance)
  }, [attendance, detectPackageType])

  // Calculate costs
  const calculation = useMemo(() => {
    if (!ratesData?.rates) {
      return { members: [], lodging: 0, siteFee: 0, deductions: 0, additions: 0, total: 0, packageApplied: null }
    }

    const attendingMembers = members.filter(m => attendance[m.id]?.attending)
    
    // Auto-calculate occupancy based on attending adults
    const attendingAdults = attendingMembers.filter(m => m.ageGroup === "adult").length
    const occupancyType: "single" | "double" | "triple" | "quad" = 
      attendingAdults === 1 ? "single" : 
      attendingAdults === 2 ? "double" : 
      attendingAdults === 3 ? "triple" : "quad"
    
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
          baseCost = getRate(rateCategory, `motel_${occupancyType}_adult`)
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

      // For regular package, calculate deductions for missed meals (special packages have fixed prices)
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
      packageApplied: packageType !== "regular" ? packageType : null,
    }
  }, [members, attendance, lodgingType, numNights, ratesData, getRate, packageType])

  // Reset to defaults
  const resetCalculator = () => {
    setLodgingType("motel")
    setNumNights(4)
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
          <h1 className="text-section-title flex items-center gap-2">
            <Calculator className="h-6 w-6" />
            Rate Calculator
          </h1>
          <p className="text-lead text-muted-foreground">
            Test all pricing scenarios for {year}
          </p>
        </div>
        <div className="flex items-center gap-4">
          {/* Public Calculator Toggle */}
          <div className="flex items-center gap-3 px-4 py-2 rounded-lg border bg-card">
            <div className="flex items-center gap-2">
              {statusData?.enabled ? (
                <Globe className="h-4 w-4 text-success" />
              ) : (
                <GlobeLock className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="text-sm font-medium">Public Calculator</span>
            </div>
            <Switch
              checked={statusData?.enabled || false}
              onCheckedChange={togglePublicCalculator}
              disabled={statusLoading || isTogglingStatus}
            />
            {isTogglingStatus && <Loader2 className="h-4 w-4 animate-spin" />}
          </div>
          
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2027">2027</SelectItem>
              <SelectItem value="2026">2026</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={resetCalculator} aria-label="Reset calculator">
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>

      {/* Status Banner */}
      {!statusLoading && (
        <div className={`flex items-center gap-3 rounded-lg border p-3 ${
          statusData?.enabled
            ? "callout-success"
            : "callout-warning"
        }`}>
          {statusData?.enabled ? (
            <>
              <Globe className="h-5 w-5" />
              <span className="font-medium">Public calculator is live</span>
              <span className="text-sm opacity-75">- Families can estimate their costs at /calculator</span>
            </>
          ) : (
            <>
              <GlobeLock className="h-5 w-5" />
              <span className="font-medium">Public calculator is disabled</span>
              <span className="text-sm opacity-75">- Only admins can access it. Toggle on when ready to go public.</span>
            </>
          )}
        </div>
      )}

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
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="flex-1">
                      <span className="font-medium capitalize">{calculation.members.length > 0 ? (
                        members.filter(m => m.ageGroup === "adult" && attendance[m.id]?.attending).length === 1 ? "single" :
                        members.filter(m => m.ageGroup === "adult" && attendance[m.id]?.attending).length === 2 ? "double" :
                        members.filter(m => m.ageGroup === "adult" && attendance[m.id]?.attending).length === 3 ? "triple" : "quad"
                      ) : "double"}</span>
                      <span className="text-muted-foreground ml-1">
                        ({members.filter(m => m.ageGroup === "adult" && attendance[m.id]?.attending).length} {members.filter(m => m.ageGroup === "adult" && attendance[m.id]?.attending).length === 1 ? "adult" : "adults"})
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Occupancy is automatically set based on attending adults
                  </p>
                </div>
              )}

              {(lodgingType === "rv" || lodgingType === "tent") && (
                <div className="pt-4 border-t">
                  <Label className="text-sm font-medium mb-2 block">Number of Nights</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setNumNights(clampLodgingNights(numNights - 1))}
                      disabled={numNights <= 1}
                      aria-label="Decrease number of nights"
                    >
                      <Minus className="h-4 w-4" aria-hidden="true" />
                    </Button>
                    <Input
                      type="number"
                      min={1}
                      max={MAX_LODGING_NIGHTS}
                      value={numNights}
                      onChange={(e) =>
                        setNumNights(clampLodgingNights(parseInt(e.target.value, 10) || 1))
                      }
                      className="w-20 text-center"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setNumNights(clampLodgingNights(numNights + 1))}
                      disabled={numNights >= MAX_LODGING_NIGHTS}
                      aria-label="Increase number of nights"
                    >
                      <Plus className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Maximum {MAX_LODGING_NIGHTS} nights (Monday through Thursday).
                  </p>
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
                <Button size="sm" className="min-h-11" onClick={addMember}>
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
                            aria-label={`Remove ${member.name || "family member"}`}
                          >
                            <Minus className="h-4 w-4" aria-hidden="true" />
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
          <Card className="sticky top-24 border-primary/20 bg-surface-highlight">
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
                        <div className="flex justify-between text-success">
                          <span>Deductions</span>
                          <span>-${deductions.toFixed(2)}</span>
                        </div>
                      )}
                      {additions > 0 && (
                        <div className="flex justify-between text-warning">
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
                  <div className="flex justify-between text-sm text-success">
                    <span>Total Deductions</span>
                    <span>-${calculation.deductions.toFixed(2)}</span>
                  </div>
                )}
                {calculation.additions > 0 && (
                  <div className="flex justify-between text-sm text-warning">
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
                {/* Special Package Applied Notification */}
                {calculation.packageApplied && (
                  <div className="flex items-center gap-2 p-2 rounded-md bg-surface-highlight border border-success/30">
                    <Sparkles className="h-4 w-4 text-success" />
                    <span className="text-sm font-medium text-success">
                      {calculation.packageApplied === "special_3_9" && "3/9 Package Applied"}
                      {calculation.packageApplied === "special_2_6" && "2/6 Package Applied"}
                      {calculation.packageApplied === "special_1_3" && "1/3 Package Applied"}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="text-subheading">Total</span>
                  <span className="text-amount text-primary">
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
