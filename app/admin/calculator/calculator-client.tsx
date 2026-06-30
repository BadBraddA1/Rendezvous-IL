"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
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
  Globe,
  GlobeLock,
  Loader2,
} from "lucide-react"
import { Switch } from "@/components/ui/switch"
import useSWR, { mutate } from "swr"
import { payingAttendeeLabel, motelOccupancyFromPayingCount } from "@/lib/motel-occupancy"
import { formatMoney, formatSiteFeeLine } from "@/lib/rate-display"
import { packageTypeLabel } from "@/lib/rate-lookup"
import { computeAdminCalculatorCost, getAgeGroup } from "@/lib/admin-calculator-cost"
import {
  fullWeekAttendance,
  LODGING_NIGHTS,
  type MemberAttendance,
} from "@/lib/calculator-schedule"
import { countSelectedMeals } from "@/lib/calculator-meals"
import { useCalculatorRates } from "@/lib/calculator-rates-swr"
import { AdminRetryButton } from "@/components/admin/admin-panel-states"
import { CalculatorSchedulePicker } from "@/components/admin/calculator-schedule-picker"
import { CalculatorSiteNights } from "@/components/admin/calculator-site-nights"
import { cn } from "@/lib/utils"

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

const fetcher = async (url: string) => {
  const res = await fetch(url, { cache: "no-store" })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(typeof data.error === "string" ? data.error : "Failed to load calculator data")
  }
  return data
}

const MAX_LODGING_NIGHTS = LODGING_NIGHTS.length

const LODGING_OPTIONS = [
  { value: "motel" as const, label: "Motel", icon: Home },
  { value: "rv" as const, label: "RV", icon: Truck },
  { value: "tent" as const, label: "Tent", icon: Tent },
  { value: "drivein" as const, label: "Drive-in", icon: Car },
]

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

  const [lodgingType, setLodgingType] = useState<"motel" | "rv" | "tent" | "drivein">("motel")
  const [numNights, setNumNights] = useState(4)
  const [sameScheduleForAll, setSameScheduleForAll] = useState(true)

  const [members, setMembers] = useState<FamilyMember[]>([
    { id: "1", name: "Adult 1", age: 35 },
    { id: "2", name: "Adult 2", age: 33 },
  ])

  const [attendance, setAttendance] = useState<Record<string, MemberAttendance>>({
    "1": fullWeekAttendance(),
    "2": fullWeekAttendance(),
  })

  const scheduleLeadMemberId =
    members.find((m) => attendance[m.id]?.attending)?.id ?? members[0]?.id

  const setMemberAttendance = (memberId: string, next: MemberAttendance) => {
    setAttendance((prev) => {
      if (!sameScheduleForAll) {
        return { ...prev, [memberId]: next }
      }
      const updated = { ...prev }
      for (const member of members) {
        const current = updated[member.id]
        if (!current?.attending) continue
        updated[member.id] = {
          ...next,
          attending: current.attending,
        }
      }
      return updated
    })
  }

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

  for (const { ageGroup, total } of calculation.members) {
    ageGroupSummary[ageGroup].count += 1
    if (ageGroup === "infant") continue
    ageGroupSummary[ageGroup].lineTotal += total
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
      [newId]: fullWeekAttendance(),
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

  const resetCalculator = () => {
    setLodgingType("motel")
    setNumNights(4)
    setSameScheduleForAll(true)
    setMembers([
      { id: "1", name: "Adult 1", age: 35 },
      { id: "2", name: "Adult 2", age: 33 },
    ])
    setAttendance({
      "1": fullWeekAttendance(),
      "2": fullWeekAttendance(),
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
                Lodging
              </CardTitle>
              <CardDescription>Tap a lodging type — RV and tent include site nights below.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                {LODGING_OPTIONS.map(({ value, label, icon: Icon }) => (
                  <Button
                    key={value}
                    type="button"
                    variant={lodgingType === value ? "default" : "outline"}
                    className={cn(
                      "h-auto min-h-11 flex-col gap-1 py-3",
                      lodgingType === value && "shadow-sm",
                    )}
                    onClick={() => setLodgingType(value)}
                    aria-pressed={lodgingType === value}
                  >
                    <Icon className="h-5 w-5" aria-hidden="true" />
                    <span>{label}</span>
                  </Button>
                ))}
              </div>

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
                <div className="border-t pt-4">
                  <CalculatorSiteNights
                    value={numNights}
                    max={MAX_LODGING_NIGHTS}
                    onChange={setNumNights}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Family
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Set ages, then pick one schedule for everyone or customize per person.
                  </CardDescription>
                </div>
                <Button size="sm" className="min-h-11 shrink-0" onClick={addMember}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add person
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {members.filter((m) => attendance[m.id]?.attending).length > 1 && (
                <div className="flex items-center justify-between gap-3 rounded-lg border bg-card px-3 py-2">
                  <Label htmlFor="same-schedule" className="text-sm font-medium cursor-pointer">
                    Same schedule for whole family
                  </Label>
                  <Switch
                    id="same-schedule"
                    checked={sameScheduleForAll}
                    onCheckedChange={setSameScheduleForAll}
                  />
                </div>
              )}

              {sameScheduleForAll &&
                scheduleLeadMemberId &&
                attendance[scheduleLeadMemberId]?.attending && (
                  <CalculatorSchedulePicker
                    attendance={attendance[scheduleLeadMemberId]}
                    onChange={(next) => setMemberAttendance(scheduleLeadMemberId, next)}
                    driveIn={lodgingType === "drivein"}
                  />
                )}

              <div className="space-y-3">
                {members.map((member) => {
                  const memberAtt = attendance[member.id]
                  const showOwnSchedule = memberAtt?.attending && !sameScheduleForAll

                  return (
                  <div key={member.id} className="rounded-lg border p-3 space-y-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <Input
                          value={member.name}
                          onChange={(e) => updateMember(member.id, { name: e.target.value })}
                          className="h-11 w-full max-w-[9rem]"
                          aria-label="Name"
                        />
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-11 w-11 shrink-0"
                            onClick={() => updateMember(member.id, { age: Math.max(0, member.age - 1) })}
                            aria-label="Decrease age"
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <Input
                            type="number"
                            value={member.age}
                            onChange={(e) =>
                              updateMember(member.id, { age: parseInt(e.target.value, 10) || 0 })
                            }
                            className="h-11 w-14 text-center tabular-nums px-1"
                            min={0}
                            aria-label="Age"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-11 w-11 shrink-0"
                            onClick={() => updateMember(member.id, { age: member.age + 1 })}
                            aria-label="Increase age"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        <Badge variant="secondary">{ageGroupLabel(getAgeGroup(member.age))}</Badge>
                      </div>
                      <div className="flex items-center justify-between gap-2 sm:justify-end">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id={`attending-${member.id}`}
                            checked={memberAtt?.attending}
                            onCheckedChange={(checked) => {
                              setAttendance((prev) => ({
                                ...prev,
                                [member.id]: {
                                  ...(prev[member.id] ?? fullWeekAttendance()),
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
                            className="h-11 w-11"
                            onClick={() => removeMember(member.id)}
                            aria-label={`Remove ${member.name || "family member"}`}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>

                    {showOwnSchedule && memberAtt && (
                      <CalculatorSchedulePicker
                        attendance={memberAtt}
                        onChange={(next) => setMemberAttendance(member.id, next)}
                        driveIn={lodgingType === "drivein"}
                        compact={lodgingType === "drivein"}
                      />
                    )}

                    {sameScheduleForAll &&
                      memberAtt?.attending &&
                      member.id !== scheduleLeadMemberId && (
                        <p className="text-xs text-muted-foreground">
                          Uses the family schedule above.
                        </p>
                      )}
                  </div>
                  )
                })}
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
                {year} · Per-person pricing (nights &amp; meals update each person&apos;s rate)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Per age group summary */}
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Lodging (per person)</h4>
                <dl className="space-y-1 text-sm">
                  {ageGroupSummary.adult.count > 0 && (
                    <div className="flex flex-wrap justify-between gap-x-4 gap-y-1">
                      <dt className="min-w-0">
                        {ageGroupSummary.adult.count} adult{ageGroupSummary.adult.count === 1 ? "" : "s"}
                      </dt>
                      <dd className="tabular-nums shrink-0">${formatMoney(ageGroupSummary.adult.lineTotal)}</dd>
                    </div>
                  )}
                  {ageGroupSummary.youth.count > 0 && (
                    <div className="flex flex-wrap justify-between gap-x-4 gap-y-1">
                      <dt className="min-w-0">
                        {ageGroupSummary.youth.count} youth
                      </dt>
                      <dd className="tabular-nums shrink-0">${formatMoney(ageGroupSummary.youth.lineTotal)}</dd>
                    </div>
                  )}
                  {ageGroupSummary.child.count > 0 && (
                    <div className="flex flex-wrap justify-between gap-x-4 gap-y-1">
                      <dt className="min-w-0">
                        {ageGroupSummary.child.count} child{ageGroupSummary.child.count === 1 ? "ren" : ""}
                      </dt>
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
                {calculation.members.map(({ member, ageGroup, packageType, baseCost, deductions, additions, total }) => {
                  const att = attendance[member.id]
                  const nightCount = att?.nights.length ?? 0
                  const mealCount = att ? countSelectedMeals(att.meals) : 0
                  return (
                  <div key={member.id} className="text-sm border-b pb-2 last:border-0">
                    <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 font-medium">
                      <span className="min-w-0">{member.name}</span>
                      <span className="tabular-nums shrink-0">
                        {ageGroup === "infant" ? "Free" : `$${formatMoney(total)}`}
                      </span>
                    </div>
                    {ageGroup !== "infant" && (
                      <div className="text-xs text-muted-foreground space-y-0.5 mt-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span>{nightCount} night{nightCount === 1 ? "" : "s"} · {mealCount} meal{mealCount === 1 ? "" : "s"}</span>
                          {packageType !== "regular" && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                              {packageTypeLabel(packageType)}
                            </Badge>
                          )}
                        </div>
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
                        <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 font-medium text-foreground/80">
                          <span>Net for {member.name.split(" ")[0]}</span>
                          <span className="tabular-nums shrink-0">${formatMoney(total)}/person</span>
                        </div>
                      </div>
                    )}
                  </div>
                  )
                })}
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
                {calculation.members.some((m) => m.packageType !== "regular") && (
                  <div className="flex items-center gap-2 rounded-md border border-success/30 bg-surface-highlight p-2">
                    <span className="text-sm font-medium text-success">
                      Partial-week packages (3/9, 2/6, 1/3) available from the schedule dropdown.
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
                    Pick a package preset or tap night buttons — meals stay in sync automatically.
                    Turn off &quot;Same schedule for whole family&quot; to price each person separately.
                    RV/tent site fee uses the lodging night buttons above.
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
