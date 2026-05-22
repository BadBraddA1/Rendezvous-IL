"use client"

import { useState, useMemo, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
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
  ArrowLeft,
  AlertCircle,
  User,
  Calendar,
  Save,
  Sparkles,
  LogIn
} from "lucide-react"
import Link from "next/link"

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
  rates: Record<string, Rate[]>
}

interface FamilyMemberData {
  id: string
  firstName: string
  lastName: string
  dateOfBirth: string | null
  age: number
  ageGroup: "adult" | "youth" | "child" | "infant"
  isBaptized: boolean
  gender: string | null
}

interface FamilyData {
  isReturningFamily: boolean
  family: {
    id: number
    lastName: string
    email: string | null
  }
  members: FamilyMemberData[]
  lastRegistration: {
    lodgingType: string
    year: number
  } | null
  expressPreferences: {
    lodging_type: string
    occupancy_type: string | null
    member_preferences: Record<string, MemberAttendance>
  } | null
}

interface CalculatorClientProps {
  ratesData: RatesData | null
  familyData?: FamilyData | null
}

interface MemberAttendance {
  attending: boolean
  nights: string[]
  meals: Record<string, string[]>
}

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

function getDefaultAttendance(): MemberAttendance {
  return {
    attending: true,
    nights: [...NIGHTS],
    meals: {
      mon: ["dinner"],
      tue: ["breakfast", "lunch", "dinner"],
      wed: ["breakfast", "lunch", "dinner"],
      thu: ["breakfast", "lunch", "dinner"],
      fri: ["breakfast", "lunch"],
    },
  }
}

export function CalculatorClient({ ratesData, familyData }: CalculatorClientProps) {
  // Mode: "simple" for anonymous users, "detailed" for logged-in returning families
  const [mode, setMode] = useState<"simple" | "detailed">(
    familyData?.isReturningFamily ? "detailed" : "simple"
  )
  
  // Simple mode state
  const [adults, setAdults] = useState(familyData?.members?.filter(m => m.ageGroup === "adult").length || 2)
  const [youth, setYouth] = useState(familyData?.members?.filter(m => m.ageGroup === "youth").length || 0)
  const [children, setChildren] = useState(familyData?.members?.filter(m => m.ageGroup === "child").length || 0)
  const [infants, setInfants] = useState(familyData?.members?.filter(m => m.ageGroup === "infant").length || 0)
  
  // Lodging configuration
  const [lodgingType, setLodgingType] = useState<"motel" | "rv" | "tent" | "drivein">(
    (familyData?.expressPreferences?.lodging_type as typeof lodgingType) || 
    (familyData?.lastRegistration?.lodgingType as typeof lodgingType) || 
    "motel"
  )
  
  // For simple mode, always use full week (4 nights for lodging, 5 days for drive-in)
  const numNights = 4

  // Auto-calculate occupancy based on number of adults
  const occupancyType = useMemo((): "single" | "double" | "triple" | "quad" => {
    if (adults === 1) return "single"
    if (adults === 2) return "double"
    if (adults === 3) return "triple"
    return "quad" // 4+ adults
  }, [adults])

  // Auto-detect package type based on attendance (detailed mode only)
  const detectPackageType = useCallback((memberAttendance?: Record<string, MemberAttendance>): "regular" | "special_3_9" | "special_2_6" | "special_1_3" => {
    if (!memberAttendance || Object.keys(memberAttendance).length === 0) {
      return "regular"
    }
    
    // For detailed mode, check actual attendance
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

  // For detailed mode - use actual family members
  const initialAttendance = useMemo(() => {
    if (familyData?.expressPreferences?.member_preferences) {
      return familyData.expressPreferences.member_preferences
    }
    
    const att: Record<string, MemberAttendance> = {}
    familyData?.members?.forEach(m => {
      att[m.id] = getDefaultAttendance()
    })
    return att
  }, [familyData])

  const [attendance, setAttendance] = useState<Record<string, MemberAttendance>>(initialAttendance)

  // Helper to get rate amount by category and name pattern
  const getRate = useCallback((category: string, namePattern: string): number => {
    if (!ratesData?.rates?.[category]) return 0
    const rate = ratesData.rates[category].find(r => r.name.includes(namePattern))
    return rate ? parseFloat(rate.amount) : 0
  }, [ratesData])

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
      delete meals[night]
      const nextDay = NIGHTS[NIGHTS.indexOf(night as typeof NIGHTS[number]) + 1]
      if (nextDay && meals[nextDay]) {
        meals[nextDay] = meals[nextDay].filter(m => m !== "breakfast")
      }
    } else {
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

  // Simple mode calculation
  const simpleCalculation = useMemo(() => {
    if (!ratesData?.rates || mode !== "simple") {
      return { adults: 0, youth: 0, children: 0, infants: 0, siteFee: 0, total: 0, packageApplied: null }
    }

    // Detect if partial stay qualifies for a special package (only for detailed mode now)
    const packageType = "regular" // Simple mode always uses regular full week pricing
    const rateCategory = packageType === "regular" ? lodgingType : packageType
    
    let adultCost = 0
    let youthCost = 0
    let childCost = 0
    const infantCost = 0

    if (lodgingType === "motel") {
      adultCost = adults * getRate(rateCategory, `motel_${occupancyType}_adult`)
      youthCost = youth * getRate(rateCategory, "motel_youth")
      childCost = children * getRate(rateCategory, "motel_child")
    } else if (lodgingType === "rv") {
      adultCost = adults * getRate(rateCategory, "rv_adult")
      youthCost = youth * getRate(rateCategory, "rv_youth")
      childCost = children * getRate(rateCategory, "rv_child")
    } else if (lodgingType === "tent") {
      adultCost = adults * getRate(rateCategory, "tent_adult")
      youthCost = youth * getRate(rateCategory, "tent_youth")
      childCost = children * getRate(rateCategory, "tent_child")
    } else if (lodgingType === "drivein") {
      const daysCount = 5 // Simple mode always shows full week (5 days)
      // Drive-in = daily entry fee + all meals
      // Entry fees
      const adultEntry = adults * getRate("drivein", "drivein_adult") * daysCount
      const youthEntry = youth * getRate("drivein", "drivein_youth") * daysCount
      const childEntry = children * getRate("drivein", "drivein_child") * daysCount
      
      // Meal costs (all 15 meals: 5 days x 3 meals)
      // Mon: D only, Tue-Thu: B/L/D, Fri: B/L = 1 + 9 + 2 = 12 meals total for full week
      const adultMeals = adults * (
        getRate("meal_addition", "breakfast_adult") * 4 + // Tue-Fri breakfast
        getRate("meal_addition", "lunch_adult") * 5 +     // Mon-Fri lunch
        getRate("meal_addition", "dinner_adult") * 4      // Mon-Thu dinner
      )
      const youthMeals = youth * (
        getRate("meal_addition", "breakfast_youth") * 4 +
        getRate("meal_addition", "lunch_youth") * 5 +
        getRate("meal_addition", "dinner_youth") * 4
      )
      const childMeals = children * (
        getRate("meal_addition", "breakfast_child") * 4 +
        getRate("meal_addition", "lunch_child") * 5 +
        getRate("meal_addition", "dinner_child") * 4
      )
      
      adultCost = adultEntry + adultMeals
      youthCost = youthEntry + youthMeals
      childCost = childEntry + childMeals
    }

    let siteFee = 0
    if (lodgingType === "rv") {
      siteFee = getRate("rv", "rv_site_night") * numNights
    } else if (lodgingType === "tent") {
      siteFee = getRate("tent", "tent_site_night") * numNights
    }

    return {
      adults: adultCost,
      youth: youthCost,
      children: childCost,
      infants: infantCost,
      siteFee,
      total: adultCost + youthCost + childCost + siteFee,
      packageApplied: packageType !== "regular" ? packageType : null,
    }
  }, [adults, youth, children, lodgingType, occupancyType, numNights, ratesData, getRate, mode])

  // Detailed mode calculation (for returning families)
  const detailedCalculation = useMemo(() => {
    if (!ratesData?.rates || mode !== "detailed" || !familyData?.members) {
      return { members: [], siteFee: 0, deductions: 0, total: 0, packageApplied: null }
    }

    // Auto-detect package type based on attendance
    const packageType = detectPackageType(attendance)

    const attendingMembers = familyData.members.filter(m => attendance[m.id]?.attending)
    
    // Auto-calculate occupancy based on attending adults
    const attendingAdults = attendingMembers.filter(m => m.ageGroup === "adult").length
    const detailedOccupancy: "single" | "double" | "triple" | "quad" = 
      attendingAdults === 1 ? "single" : 
      attendingAdults === 2 ? "double" : 
      attendingAdults === 3 ? "triple" : "quad"
    
    const memberCosts = attendingMembers.map(member => {
      const att = attendance[member.id]
      let baseCost = 0
      let deductions = 0
      let additions = 0

      const rateCategory = packageType === "regular" ? lodgingType : packageType

      if (lodgingType === "motel") {
        if (member.ageGroup === "adult") {
          baseCost = getRate(rateCategory, `motel_${detailedOccupancy}_adult`)
        } else {
          baseCost = getRate(rateCategory, `motel_${member.ageGroup}`)
        }
      } else if (lodgingType === "rv") {
        baseCost = getRate(rateCategory, `rv_${member.ageGroup}`)
      } else if (lodgingType === "tent") {
        baseCost = getRate(rateCategory, `tent_${member.ageGroup}`)
      } else if (lodgingType === "drivein") {
        // Drive-in: entry fee per day they're attending
        const daysAttending = att.nights.length + (att.nights.includes("thu") ? 1 : 0) // nights + Friday if staying Thu
        // Actually for drive-in, count unique days from meals
        const daysWithMeals = new Set(Object.keys(att.meals).filter(day => att.meals[day as keyof typeof att.meals]?.length > 0))
        const numDays = daysWithMeals.size || 1
        baseCost = getRate("drivein", `drivein_${member.ageGroup}`) * numDays
      }

      // Calculate deductions for regular package only (special packages have fixed prices)
      if (packageType === "regular" && lodgingType !== "drivein" && att) {
        if (!att.nights.includes("mon") || !att.meals.mon?.includes("dinner")) {
          deductions += Math.abs(getRate("deduction", `monday_dinner_${member.ageGroup}`))
        }
        if (!att.meals.fri?.includes("breakfast")) {
          deductions += Math.abs(getRate("deduction", `friday_breakfast_${member.ageGroup}`))
        }
        if (!att.meals.fri?.includes("lunch")) {
          deductions += Math.abs(getRate("deduction", `friday_lunch_${member.ageGroup}`))
        }
      }

      // Drive-in meal additions
      if (lodgingType === "drivein" && att) {
        Object.entries(att.meals).forEach(([, meals]) => {
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

    let siteFee = 0
    if (lodgingType === "rv") {
      siteFee = getRate("rv", "rv_site_night") * numNights
    } else if (lodgingType === "tent") {
      siteFee = getRate("tent", "tent_site_night") * numNights
    }

    const totalDeductions = memberCosts.reduce((sum, m) => sum + m.deductions, 0)
    const grandTotal = memberCosts.reduce((sum, m) => sum + m.total, 0) + siteFee

    return {
      members: memberCosts,
      siteFee,
      deductions: totalDeductions,
      total: grandTotal,
      packageApplied: packageType !== "regular" ? packageType : null,
    }
  }, [familyData, attendance, lodgingType, numNights, ratesData, getRate, mode, detectPackageType])

  // Save express registration preferences
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)

  const savePreferences = async () => {
    if (!familyData) return
    
    setIsSaving(true)
    setSaveMessage(null)
    
    try {
      const response = await fetch("/api/express-registration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          familyId: familyData.family.id,
          lodgingType,
          occupancyType: lodgingType === "motel" ? occupancyType : null,
          memberPreferences: attendance,
          estimatedTotal: detailedCalculation.total,
        }),
      })

      if (response.ok) {
        setSaveMessage("Preferences saved! They will be pre-filled when registration opens.")
      } else {
        setSaveMessage("Failed to save preferences. Please try again.")
      }
    } catch {
      setSaveMessage("Failed to save preferences. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  if (!ratesData) {
    return (
      <div className="mx-auto max-w-2xl">
        <Card className="border-destructive/20">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle>Calculator Unavailable</CardTitle>
            <CardDescription>
              Pricing information is not currently available. Please check back later.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button asChild>
              <Link href="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Home
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-8 text-center">
        <h1 className="mb-4 text-balance text-4xl font-bold tracking-tight md:text-5xl">
          {ratesData.year} Cost Calculator
        </h1>
        <p className="text-balance text-lg text-muted-foreground">
          {familyData?.isReturningFamily 
            ? `Welcome back, ${familyData.family.lastName} family! See your personalized estimate below.`
            : "Estimate your total cost for Rendezvous"}
        </p>
      </div>

      {/* Returning Family Banner */}
      {familyData?.isReturningFamily && (
        <Alert className="mb-6 border-primary/20 bg-primary/5">
          <Sparkles className="h-4 w-4" />
          <AlertTitle>Returning Family Benefits</AlertTitle>
          <AlertDescription>
            Your family members are pre-loaded below. You can customize attendance for each person
            and save your preferences for express registration when it opens.
          </AlertDescription>
        </Alert>
      )}

      {/* Sign in prompt for anonymous users */}
      {!familyData && (
        <Alert className="mb-6">
          <LogIn className="h-4 w-4" />
          <AlertTitle>Sign in for a personalized estimate</AlertTitle>
          <AlertDescription>
            If you registered last year, sign in to see a personalized breakdown with your family
            members and save your preferences for express registration.
            <Button variant="link" asChild className="p-0 h-auto ml-2">
              <Link href="/sign-in?redirect_url=/calculator">Sign In</Link>
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Mode toggle for returning families */}
      {familyData?.isReturningFamily && (
        <div className="mb-6 flex justify-center">
          <Tabs value={mode} onValueChange={(v) => setMode(v as typeof mode)}>
            <TabsList>
              <TabsTrigger value="detailed">
                <User className="h-4 w-4 mr-2" />
                My Family
              </TabsTrigger>
              <TabsTrigger value="simple">
                <Users className="h-4 w-4 mr-2" />
                Simple Calculator
              </TabsTrigger>
            </TabsList>
          </Tabs>
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
                      <span className="font-medium capitalize">{occupancyType}</span>
                      <span className="text-muted-foreground ml-1">
                        ({adults} {adults === 1 ? "adult" : "adults"})
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-semibold">${getRate(simpleCalculation.packageApplied || "motel", `motel_${occupancyType}_adult`)}</span>
                      <span className="text-sm text-muted-foreground">/adult</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Occupancy is automatically set based on the number of adults
                  </p>
                </div>
              )}

              {/* Simple mode info - full week only for anonymous users */}
              {lodgingType !== "drivein" && mode === "simple" && (
                <div className="pt-4 border-t">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Full week attendance (Mon-Fri)</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Sign in to customize attendance for individual family members
                  </p>
                </div>
              )}

              {/* Drive-In Simple Mode Info */}
              {lodgingType === "drivein" && mode === "simple" && (
                <div className="pt-4 border-t">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Calendar className="h-4 w-4" />
                    <span>Full week (Mon-Fri) with all meals</span>
                  </div>
                  <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Daily entry fee:</span>
                      <span>${getRate("drivein", "drivein_adult")}/day per adult</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Meals included:</span>
                      <span>12 meals (B/L/D)</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">
                    Sign in to select specific days and meals per family member.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
          {mode === "simple" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Family Members
                </CardTitle>
                <CardDescription>Enter the number of people in each age group</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="adults">Adults (18+)</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="adults"
                        type="number"
                        min="0"
                        value={adults}
                        onChange={(e) => setAdults(Math.max(0, parseInt(e.target.value) || 0))}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="youth">Youth (12-17)</Label>
                    <Input
                      id="youth"
                      type="number"
                      min="0"
                      value={youth}
                      onChange={(e) => setYouth(Math.max(0, parseInt(e.target.value) || 0))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="children">Children (6-11)</Label>
                    <Input
                      id="children"
                      type="number"
                      min="0"
                      value={children}
                      onChange={(e) => setChildren(Math.max(0, parseInt(e.target.value) || 0))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="infants">Infants (0-5)</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="infants"
                        type="number"
                        min="0"
                        value={infants}
                        onChange={(e) => setInfants(Math.max(0, parseInt(e.target.value) || 0))}
                      />
                      <Badge variant="secondary">FREE</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Detailed Mode: Per-member configuration */}
          {mode === "detailed" && familyData?.members && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  {familyData.family.lastName} Family Members
                </CardTitle>
                <CardDescription>
                  Select who is attending and customize their schedule
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {familyData.members.map((member) => (
                    <div key={member.id} className="border rounded-lg p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <Checkbox
                            id={`attending-${member.id}`}
                            checked={attendance[member.id]?.attending}
                            onCheckedChange={(checked) => {
                              setAttendance({
                                ...attendance,
                                [member.id]: { 
                                  ...attendance[member.id], 
                                  attending: checked === true,
                                  ...(checked ? {} : { nights: [], meals: {} })
                                },
                              })
                            }}
                          />
                          <div>
                            <Label htmlFor={`attending-${member.id}`} className="text-base font-medium cursor-pointer">
                              {member.firstName} {member.lastName}
                            </Label>
                            <p className="text-sm text-muted-foreground">
                              Age {member.age} ({member.ageGroup === "adult" ? "Adult" :
                               member.ageGroup === "youth" ? "Youth 12-17" :
                               member.ageGroup === "child" ? "Child 6-11" : "Infant 0-5"})
                            </p>
                          </div>
                        </div>
                        {attendance[member.id]?.attending && (
                          <Badge variant={member.ageGroup === "infant" ? "secondary" : "default"}>
                            {member.ageGroup === "infant" ? "FREE" : 
                              `$${detailedCalculation.members.find(m => m.member.id === member.id)?.total.toFixed(2) || "0.00"}`}
                          </Badge>
                        )}
                      </div>

                      {/* Attendance Details */}
                      {attendance[member.id]?.attending && packageType === "regular" && lodgingType !== "drivein" && (
                        <div className="pl-8 pt-2 border-t">
                          <p className="text-sm font-medium mb-3 flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            Customize Attendance (deselect to get credit)
                          </p>
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                            {Object.entries(MEALS).map(([day, availableMeals]) => (
                              <div key={day} className="space-y-2">
                                <Label className="font-medium capitalize">{day === "fri" ? "Friday" : NIGHT_LABELS[day]}</Label>
                                {day !== "fri" && (
                                  <div className="flex items-center gap-2 mb-2">
                                    <Checkbox
                                      id={`${member.id}-night-${day}`}
                                      checked={attendance[member.id]?.nights.includes(day)}
                                      onCheckedChange={() => toggleNight(member.id, day)}
                                    />
                                    <Label
                                      htmlFor={`${member.id}-night-${day}`}
                                      className="text-xs cursor-pointer text-muted-foreground"
                                    >
                                      Staying
                                    </Label>
                                  </div>
                                )}
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
          )}
        </div>

        {/* Results Panel */}
        <div>
          <Card className="sticky top-24 border-primary/20 bg-gradient-to-br from-primary/5 to-background">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Cost Estimate
              </CardTitle>
              <CardDescription>
                Rendezvous {ratesData.year} • {
                  mode === "detailed" && detailedCalculation.packageApplied 
                    ? detailedCalculation.packageApplied.replace("special_", "").replace("_", "/").toUpperCase() + " Package"
                    : "Full Week (Mon-Fri)"
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Simple mode breakdown */}
              {mode === "simple" && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Lodging</h4>
                  <div className="space-y-1 text-sm">
                    {adults > 0 && (
                      <div className="flex justify-between">
                        <span>{adults} Adult{adults > 1 ? "s" : ""}</span>
                        <span>${simpleCalculation.adults.toFixed(2)}</span>
                      </div>
                    )}
                    {youth > 0 && (
                      <div className="flex justify-between">
                        <span>{youth} Youth (12-17)</span>
                        <span>${simpleCalculation.youth.toFixed(2)}</span>
                      </div>
                    )}
                    {children > 0 && (
                      <div className="flex justify-between">
                        <span>{children} Child{children > 1 ? "ren" : ""} (6-11)</span>
                        <span>${simpleCalculation.children.toFixed(2)}</span>
                      </div>
                    )}
                    {infants > 0 && (
                      <div className="flex justify-between text-muted-foreground">
                        <span>{infants} Infant{infants > 1 ? "s" : ""} (0-5)</span>
                        <span>FREE</span>
                      </div>
                    )}
                  </div>
                  {simpleCalculation.siteFee > 0 && (
                    <div className="pt-2 border-t">
                      <div className="flex justify-between text-sm">
                        <span>Site Fee ({numNights} nights)</span>
                        <span>${simpleCalculation.siteFee.toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Detailed mode breakdown */}
              {mode === "detailed" && familyData && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Per Person
                  </h4>
                  {detailedCalculation.members.map(({ member, baseCost, deductions, total }) => (
                    <div key={member.id} className="text-sm border-b pb-2 last:border-0">
                      <div className="flex justify-between font-medium">
                        <span>{member.firstName}</span>
                        <span>${total.toFixed(2)}</span>
                      </div>
                      <div className="text-xs text-muted-foreground space-y-0.5 mt-1">
                        <div className="flex justify-between">
                          <span>{member.ageGroup === "adult" ? `Adult (${occupancyType})` : member.ageGroup}</span>
                          <span>${baseCost.toFixed(2)}</span>
                        </div>
                        {deductions > 0 && (
                          <div className="flex justify-between text-green-600">
                            <span>Meal credits</span>
                            <span>-${deductions.toFixed(2)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {detailedCalculation.siteFee > 0 && (
                    <div className="pt-2">
                      <div className="flex justify-between text-sm">
                        <span>Site Fee ({numNights} nights)</span>
                        <span>${detailedCalculation.siteFee.toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Special Package Applied Notification */}
              {mode === "detailed" && detailedCalculation.packageApplied && (
                <Alert className="border-green-200 bg-green-50">
                  <Sparkles className="h-4 w-4 text-green-600" />
                  <AlertTitle className="text-green-800">Special Package Applied!</AlertTitle>
                  <AlertDescription className="text-green-700">
                    {detailedCalculation.packageApplied === "special_3_9" && "3 Night / 9 Meal package rate applied - you save money vs. the full week rate!"}
                    {detailedCalculation.packageApplied === "special_2_6" && "2 Night / 6 Meal package rate applied - you save money vs. the full week rate!"}
                    {detailedCalculation.packageApplied === "special_1_3" && "1 Night / 3 Meal package rate applied - you save money vs. the full week rate!"}
                  </AlertDescription>
                </Alert>
              )}

              {/* Total */}
              <div className="pt-4 border-t-2">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold">Estimated Total</span>
                  <span className="text-2xl font-bold text-primary flex items-center">
                    <DollarSign className="h-6 w-6" />
                    {mode === "simple" 
                      ? simpleCalculation.total.toFixed(2)
                      : detailedCalculation.total.toFixed(2)
                    }
                  </span>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                This is an estimate. Final pricing may vary based on registration options.
              </p>

              {/* Save preferences button for returning families */}
              {familyData?.isReturningFamily && mode === "detailed" && (
                <div className="pt-4 border-t">
                  <Button 
                    className="w-full" 
                    onClick={savePreferences}
                    disabled={isSaving}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {isSaving ? "Saving..." : "Save for Express Registration"}
                  </Button>
                  {saveMessage && (
                    <p className={`text-xs mt-2 ${saveMessage.includes("Failed") ? "text-destructive" : "text-green-600"}`}>
                      {saveMessage}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    Save your preferences now and they&apos;ll be pre-filled when 2027 registration opens.
                  </p>
                </div>
              )}

              <div className="pt-4 flex flex-col gap-2">
                <Button asChild className="w-full">
                  <Link href="/registration">Register Now</Link>
                </Button>
                <Button variant="outline" asChild className="w-full">
                  <Link href="/">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Home
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
