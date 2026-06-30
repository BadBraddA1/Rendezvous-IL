"use client"

import { useState } from "react"
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
import {
  payingAttendeeLabel,
  motelOccupancyFromPayingCount,
} from "@/lib/motel-occupancy"
import {
  formatMoney,
  formatSiteFeeLine,
  formatUnitLine,
} from "@/lib/rate-display"
import {
  driveInEntryDays,
  packageTypeLabel,
} from "@/lib/rate-lookup"
import {
  computeAdminCalculatorCost,
  detectPackageType,
  getAgeGroup,
} from "@/lib/admin-calculator-cost"
import {
  useCalculatorRates,
} from "@/lib/calculator-rates-swr"
import { AdminRetryButton } from "@/components/admin/admin-panel-states"

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
  age: number
}

interface MemberAttendance {
  attending: boolean
  nights: string[]
  meals: Record<string, string[]>
}

const fetcher = async (url: string) => {
  const res = await fetch(url, { cache: "no-store" })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(typeof data.error === "string" ? data.error : "Failed to load calculator data")
  }
  return data
}

const DEFAULT_MEALS: MemberAttendance["meals"] = {
  mon: ["dinner"],
  tue: ["breakfast", "lunch", "dinner"],
  wed: ["breakfast", "lunch", "dinner"],
  thu: ["breakfast", "lunch", "dinner"],
  fri: ["breakfast", "lunch"],
}

function defaultAttendance(): MemberAttendance {
  return {
    attending: true,
    nights: [...NIGHTS],
    meals: {
      mon: [...DEFAULT_MEALS.mon],
      tue: [...DEFAULT_MEALS.tue],
      wed: [...DEFAULT_MEALS.wed],
      thu: [...DEFAULT_MEALS.thu],
      fri: [...DEFAULT_MEALS.fri],
    },
  }
}

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

function ageGroupLabel(ageGroup: ReturnType<typeof getAgeGroup>): string {
  switch (ageGroup) {
    case "adult":
      return "Adult (18+)"
    case "youth":
      return "Youth (12-17)"
    case "child":
      return "Child (6-11)"
    default:
      return "Infant (0-5)"
  }
}

export function AdminCalculatorClient() {
  const [year, setYear] = useState("2027")
  const {
    data: ratesData,
    error: ratesError,
    isLoading,
    isValidating,
    mutate: reloadRates,
  } = useCalculatorRates<RatesData>(year)

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

  // Family members for testing
  const [members, setMembers] = useState<FamilyMember[]>([
    { id: "1", name: "Adult 1", age: 35 },
    { id: "2", name: "Adult 2", age: 33 },
  ])

  // Attendance tracking per member
  const [attendance, setAttendance] = useState<Record<string, MemberAttendance>>({
    "1": defaultAttendance(),
    "2": defaultAttendance(),
  })

  const packageType = detectPackageType(attendance)

  const calculation = computeAdminCalculatorCost({
    members,
    attendance,
    lodgingType,
    numNights,
    rates: ratesData?.rates,
  })

  const ageGroupSummary = {
    adult: { count: 0, unit: 0, lineTotal: 0 },
    youth: { count: 0, unit: 0, lineTotal: 0 },
    child: { count: 0, unit: 0, lineTotal: 0 },
    infant: { count: 0, unit: 0, lineTotal: 0 },
  } as Record<
    ReturnType<typeof getAgeGroup>,
    { count: number; unit: number; lineTotal: number }
  >

  for (const { ageGroup, baseCost } of calculation.members) {
    ageGroupSummary[ageGroup].count += 1
    if (ageGroup === "infant") continue
    ageGroupSummary[ageGroup].unit = baseCost
    ageGroupSummary[ageGroup].lineTotal += baseCost
  }

  // Add a new member
  const addMember = () => {
    const newId = String(Math.max(0, ...members.map((m) => parseInt(m.id, 10))) + 1)
    setMembers((prev) => [
      ...prev,
      { id: newId, name: `Person ${newId}`, age: 30 },
    ])
    setAttendance((prev) => ({
      ...prev,
      [newId]: defaultAttendance(),
    }))
  }

  // Remove a member
  const removeMember = (id: string) => {
    setMembers((prev) => {
      if (prev.length <= 1) return prev
      return prev.filter((m) => m.id !== id)
    })
    setAttendance((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }

  // Update member
  const updateMember = (id: string, updates: Partial<FamilyMember>) => {
    setMembers((prev) =>
      prev.map((m) => (m.id === id ? { ...m, ...updates } : m)),
    )
  }

  // Toggle night attendance
  const toggleNight = (memberId: string, night: string) => {
    setAttendance((prev) => {
      const memberAtt = prev[memberId]
      if (!memberAtt) return prev

      const nights = memberAtt.nights.includes(night)
        ? memberAtt.nights.filter((n) => n !== night)
        : [...memberAtt.nights, night]

      const meals = { ...memberAtt.meals }
      if (!nights.includes(night)) {
        delete meals[night]
        const nextDay = NIGHTS[NIGHTS.indexOf(night as (typeof NIGHTS)[number]) + 1]
        if (nextDay && meals[nextDay]) {
          meals[nextDay] = meals[nextDay].filter((m) => m !== "breakfast")
        }
      } else {
        const mealKey = night as keyof typeof MEALS
        meals[night] = mealKey in MEALS ? [...MEALS[mealKey]] : []
      }

      return {
        ...prev,
        [memberId]: { ...memberAtt, nights, meals },
      }
    })
  }

  // Toggle meal
  const toggleMeal = (memberId: string, day: string, meal: string) => {
    setAttendance((prev) => {
      const memberAtt = prev[memberId]
      if (!memberAtt) return prev

      const dayMeals = memberAtt.meals[day] || []
      const newDayMeals = dayMeals.includes(meal)
        ? dayMeals.filter((m) => m !== meal)
        : [...dayMeals, meal]

      return {
        ...prev,
        [memberId]: {
          ...memberAtt,
          meals: { ...memberAtt.meals, [day]: newDayMeals },
        },
      }
    })
  }

  // Reset to defaults
  const resetCalculator = () => {
    setLodgingType("motel")
    setNumNights(4)
    setMembers([
      { id: "1", name: "Adult 1", age: 35 },
      { id: "2", name: "Adult 2", age: 33 },
    ])
    setAttendance({
      "1": defaultAttendance(),
      "2": defaultAttendance(),
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (ratesError || !ratesData?.rates) {
    return (
      <div className="space-y-4">
        <header className="admin-page-header">
          <h1 className="text-section-title flex items-center gap-2">
            <Calculator className="h-6 w-6" />
            Rate Calculator
          </h1>
        </header>
        <Card className="callout-destructive border-destructive/30">
          <CardHeader>
            <CardTitle className="text-subheading">Could not load {year} rates</CardTitle>
            <CardDescription>
              {ratesError?.message || `No rate chart found for ${year}. Create one under Admin → Rates.`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AdminRetryButton onRetry={() => reloadRates()} />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="admin-page-header space-y-4">
        <div>
          <h1 className="text-section-title flex items-center gap-2">
            <Calculator className="h-6 w-6" />
            Rate Calculator
          </h1>
          <p className="text-lead text-muted-foreground">
            Test all pricing scenarios for {year}
          </p>
        </div>
        <div className="admin-toolbar">
          <div className="flex items-center gap-3 rounded-lg border bg-card px-4 py-2 admin-toolbar-action">
            <div className="flex items-center gap-2">
              {statusData?.enabled ? (
                <Globe className="h-4 w-4 text-success" />
              ) : (
                <GlobeLock className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="text-sm font-medium">Public calculator</span>
            </div>
            <Switch
              checked={statusData?.enabled || false}
              onCheckedChange={togglePublicCalculator}
              disabled={statusLoading || isTogglingStatus}
            />
            {isTogglingStatus && <Loader2 className="h-4 w-4 animate-spin" />}
          </div>

          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="admin-toolbar-action w-full sm:w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2027">2027</SelectItem>
              <SelectItem value="2026">2026</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            className="admin-toolbar-action gap-2"
            onClick={() => reloadRates()}
            disabled={isValidating}
          >
            {isValidating ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
            )}
            Refresh rates
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="admin-toolbar-action shrink-0"
            onClick={resetCalculator}
            aria-label="Reset calculator"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </header>

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
                  <div className="flex flex-wrap items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="min-w-0 flex-1">
                      {(() => {
                        const occupancyType = motelOccupancyFromPayingCount(
                          calculation.payingAttendeeCount,
                        )
                        return (
                          <>
                            <span className="font-medium capitalize">{occupancyType}</span>
                            <span className="text-muted-foreground ml-1">
                              ({payingAttendeeLabel(calculation.payingAttendeeCount)})
                            </span>
                          </>
                        )
                      })()}
                    </div>
                    {calculation.motelAdultUnit > 0 && (
                      <div className="text-right tabular-nums">
                        <span className="font-semibold">${formatMoney(calculation.motelAdultUnit)}</span>
                        <span className="text-sm text-muted-foreground">/person (adult)</span>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Occupancy is based on paying attendees (age 6+), not adults only. Infants do not
                    count.
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
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
                        <Input
                          value={member.name}
                          onChange={(e) => updateMember(member.id, { name: e.target.value })}
                          className="w-full sm:max-w-[200px]"
                        />
                        <div className="flex items-center gap-2">
                          <Label className="text-sm text-muted-foreground shrink-0">Age:</Label>
                          <Input
                            type="number"
                            value={member.age}
                            onChange={(e) => updateMember(member.id, { age: parseInt(e.target.value) || 0 })}
                            className="w-20"
                            min={0}
                          />
                        </div>
                        <Badge variant="secondary" className="w-fit">
                          {ageGroupLabel(getAgeGroup(member.age))}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between gap-2 sm:justify-end">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id={`attending-${member.id}`}
                            checked={attendance[member.id]?.attending}
                            onCheckedChange={(checked) => {
                              setAttendance((prev) => ({
                                ...prev,
                                [member.id]: {
                                  ...(prev[member.id] ?? defaultAttendance()),
                                  attending: checked === true,
                                },
                              }))
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
        <div className="min-w-0">
          <Card className="site-sticky-top border-primary/20 bg-surface-highlight lg:sticky">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Cost Breakdown
              </CardTitle>
              <CardDescription>
                {year} · {packageTypeLabel(packageType)}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Per age group summary */}
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Lodging (per person)</h4>
                <dl className="space-y-1 text-sm">
                  {ageGroupSummary.adult.count > 0 && (
                    <div className="flex flex-wrap justify-between gap-x-4 gap-y-1">
                      <dt className="min-w-0">{formatUnitLine(ageGroupSummary.adult.count, ageGroupSummary.adult.unit, "per person")}</dt>
                      <dd className="tabular-nums shrink-0">${formatMoney(ageGroupSummary.adult.lineTotal)}</dd>
                    </div>
                  )}
                  {ageGroupSummary.youth.count > 0 && (
                    <div className="flex flex-wrap justify-between gap-x-4 gap-y-1">
                      <dt className="min-w-0">{formatUnitLine(ageGroupSummary.youth.count, ageGroupSummary.youth.unit, "per person")}</dt>
                      <dd className="tabular-nums shrink-0">${formatMoney(ageGroupSummary.youth.lineTotal)}</dd>
                    </div>
                  )}
                  {ageGroupSummary.child.count > 0 && (
                    <div className="flex flex-wrap justify-between gap-x-4 gap-y-1">
                      <dt className="min-w-0">{formatUnitLine(ageGroupSummary.child.count, ageGroupSummary.child.unit, "per person")}</dt>
                      <dd className="tabular-nums shrink-0">${formatMoney(ageGroupSummary.child.lineTotal)}</dd>
                    </div>
                  )}
                  {ageGroupSummary.infant.count > 0 && (
                    <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 text-muted-foreground">
                      <dt>{ageGroupSummary.infant.count} infant{ageGroupSummary.infant.count === 1 ? "" : "s"} (0–5)</dt>
                      <dd>Free</dd>
                    </div>
                  )}
                </dl>
              </div>

              {/* Per-member breakdown */}
              <div className="space-y-2 border-t pt-3">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  By person
                </h4>
                {calculation.members.map(({ member, ageGroup, baseCost, deductions, additions, total }) => (
                  <div key={member.id} className="text-sm border-b pb-2 last:border-0">
                    <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 font-medium">
                      <span className="min-w-0">{member.name}</span>
                      <span className="tabular-nums shrink-0">
                        {ageGroup === "infant" ? "Free" : `$${formatMoney(total)}`}
                      </span>
                    </div>
                    {ageGroup !== "infant" && (
                      <div className="text-xs text-muted-foreground space-y-0.5 mt-1">
                        <div className="flex flex-wrap justify-between gap-x-4 gap-y-1">
                          <span>Lodging ({ageGroup})</span>
                          <span className="tabular-nums shrink-0">${formatMoney(baseCost)}/person</span>
                        </div>
                        {deductions > 0 && (
                          <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 text-success">
                            <span>Meal deductions</span>
                            <span className="tabular-nums shrink-0">-${formatMoney(deductions)}</span>
                          </div>
                        )}
                        {additions > 0 && (
                          <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 text-warning">
                            <span>Meal additions</span>
                            <span className="tabular-nums shrink-0">+${formatMoney(additions)}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Site fee */}
              {calculation.siteFee > 0 && (
                <div className="space-y-2 border-t pt-3">
                  <h4 className="font-semibold text-sm">Site fee (per site)</h4>
                  <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 text-sm">
                    <span className="min-w-0">{formatSiteFeeLine(numNights, calculation.siteNightRate)}</span>
                    <span className="tabular-nums shrink-0">${formatMoney(calculation.siteFee)}</span>
                  </div>
                </div>
              )}

              {/* Summary */}
              <div className="space-y-2 border-t-2 border-primary/20 pt-4" aria-live="polite" aria-atomic="true">
                <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 text-sm">
                  <span>Lodging subtotal ({calculation.payingAttendeeCount} paying)</span>
                  <span className="tabular-nums shrink-0">${formatMoney(calculation.lodging)}</span>
                </div>
                {calculation.deductions > 0 && (
                  <div className="flex justify-between text-sm text-success">
                    <span>Total deductions</span>
                    <span>-${formatMoney(calculation.deductions)}</span>
                  </div>
                )}
                {calculation.additions > 0 && (
                  <div className="flex justify-between text-sm text-warning">
                    <span>Total additions</span>
                    <span>+${formatMoney(calculation.additions)}</span>
                  </div>
                )}
                {calculation.siteFee > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Site fee</span>
                    <span>${formatMoney(calculation.siteFee)}</span>
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
                    ${formatMoney(calculation.total)}
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
