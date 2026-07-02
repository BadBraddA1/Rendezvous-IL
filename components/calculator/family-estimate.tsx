"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  Calculator,
  Home,
  Tent,
  Truck,
  Car,
  Users,
  Plus,
  Minus,
  TrendingDown,
  TrendingUp,
  Minus as MinusIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  getAgeGroup,
  type LodgingType,
} from "@/lib/admin-calculator-cost"
import type { CalculatorEstimate } from "@/lib/calculator-estimate"
import {
  fullWeekAttendance,
  LODGING_NIGHTS,
  type MemberAttendance,
} from "@/lib/calculator-schedule"
import { formatMoney, formatSiteFeeLine, formatUnitLine } from "@/lib/rate-display"
import { CalculatorSchedulePicker } from "@/components/admin/calculator-schedule-picker"
import { CalculatorSiteNights } from "@/components/admin/calculator-site-nights"
import type { CalculatorFamilySeed } from "@/lib/calculator-family-seed"

type Rate = {
  id: number
  category: string
  name: string
  label: string
  amount: string
  description: string | null
}

type RatesData = {
  year: number
  rates: Record<string, Rate[]>
}

const LODGING_OPTIONS = [
  { value: "motel" as const, label: "Motel", icon: Home },
  { value: "rv" as const, label: "RV", icon: Truck },
  { value: "tent" as const, label: "Tent", icon: Tent },
  { value: "drivein" as const, label: "Drive-in", icon: Car },
]

type Props = {
  seed: CalculatorFamilySeed
  ratesData: RatesData
  onReset?: () => void
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

export function FamilyEstimatePanel({ seed, ratesData, onReset }: Props) {
  const [lodgingType, setLodgingType] = useState<LodgingType>(seed.lodgingType)
  const [numNights, setNumNights] = useState(seed.numNights)
  const [sameScheduleForAll, setSameScheduleForAll] = useState(seed.sameScheduleForAll)
  const [members, setMembers] = useState(seed.members)
  const [attendance, setAttendance] = useState(seed.attendance)

  const scheduleLeadMemberId =
    members.find((member) => attendance[member.id]?.attending)?.id ?? members[0]?.id

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

  const [calculation, setCalculation] = useState<CalculatorEstimate | null>(null)
  const [calcError, setCalcError] = useState<string | null>(null)
  const [calcLoading, setCalcLoading] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      setCalcLoading(true)
      setCalcError(null)
      try {
        const response = await fetch("/api/calculator/estimate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            year: ratesData.year,
            members,
            attendance,
            lodgingType,
            numNights,
          }),
          signal: controller.signal,
        })
        const data = await response.json()
        if (!response.ok) {
          throw new Error(typeof data.error === "string" ? data.error : "Estimate failed")
        }
        setCalculation(data.estimate)
      } catch (error) {
        if (controller.signal.aborted) return
        setCalcError(error instanceof Error ? error.message : "Estimate failed")
      } finally {
        if (!controller.signal.aborted) setCalcLoading(false)
      }
    }, 250)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [members, attendance, lodgingType, numNights, ratesData.year])

  const priorReference =
    seed.comparison.priorYearCalculated ?? seed.comparison.priorYearPaid
  const difference = (calculation?.total ?? 0) - priorReference

  const updateMemberAge = (id: string, delta: number) => {
    setMembers((prev) =>
      prev.map((member) =>
        member.id === id
          ? { ...member, age: Math.max(0, Math.min(99, member.age + delta)) }
          : member,
      ),
    )
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3 lg:items-start">
      <div className="space-y-6 lg:col-span-2">
        <Card className="border-primary/15 bg-primary/5">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium">
                Loaded from {seed.familyLastName} family · Rendezvous {seed.sourceYear}
              </p>
              <p className="text-sm text-muted-foreground">
                Youth and children are aged forward for {ratesData.year}. Adjust nights, meals, or
                lodging to see your new estimate.
              </p>
            </div>
            {onReset && (
              <Button type="button" variant="outline" size="sm" onClick={onReset}>
                Start over
              </Button>
            )}
          </CardContent>
        </Card>

        {sameScheduleForAll && scheduleLeadMemberId && (
          <CalculatorSchedulePicker
            attendance={attendance[scheduleLeadMemberId] ?? fullWeekAttendance()}
            onChange={(next) => setMemberAttendance(scheduleLeadMemberId, next)}
            driveIn={lodgingType === "drivein"}
          />
        )}

        <Card className="border-primary/15">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-widget-heading">
              <Home className="h-5 w-5 shrink-0 text-primary" />
              Lodging type
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {LODGING_OPTIONS.map(({ value, label, icon: Icon }) => {
                const selected = lodgingType === value
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setLodgingType(value)}
                    className={cn(
                      "flex min-h-11 flex-col items-center justify-center gap-1 rounded-lg border p-3 text-sm font-medium transition-colors",
                      selected
                        ? "border-primary bg-surface-highlight ring-2 ring-primary/40"
                        : "border-primary/15 hover:bg-muted/50",
                    )}
                  >
                    <Icon className="h-4 w-4 text-primary" />
                    {label}
                  </button>
                )
              })}
            </div>

            {(lodgingType === "rv" || lodgingType === "tent") && (
              <CalculatorSiteNights
                value={numNights}
                max={LODGING_NIGHTS.length}
                onChange={setNumNights}
              />
            )}
          </CardContent>
        </Card>

        <Card className="border-primary/15">
          <CardHeader className="space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-widget-heading">
                  <Users className="h-5 w-5 shrink-0 text-primary" />
                  Your family
                </CardTitle>
                <CardDescription>
                  From your profile and {seed.sourceYear} registration
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="same-schedule"
                  checked={sameScheduleForAll}
                  onCheckedChange={setSameScheduleForAll}
                />
                <Label htmlFor="same-schedule" className="text-sm font-normal">
                  Same schedule for all
                </Label>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {members.map((member) => {
              const att = attendance[member.id]
              const ageGroup = getAgeGroup(member.age)
              const line = calculation?.members.find((row) => row.member.id === member.id)

              return (
                <div key={member.id} className="rounded-lg border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">{member.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {ageGroupLabel(ageGroup)}
                        {line && <> · {line.scheduleLabel}</>}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => updateMemberAge(member.id, -1)}
                        aria-label={`Decrease age for ${member.name}`}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="w-8 text-center text-sm font-medium tabular-nums">
                        {member.age}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => updateMemberAge(member.id, 1)}
                        aria-label={`Increase age for ${member.name}`}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                      {line && (
                        <Badge variant="secondary" className="tabular-nums">
                          ${formatMoney(line.total)}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {!sameScheduleForAll && att && (
                    <div className="mt-4 border-t pt-4">
                      <CalculatorSchedulePicker
                        attendance={att}
                        onChange={(next) => setMemberAttendance(member.id, next)}
                        driveIn={lodgingType === "drivein"}
                      />
                    </div>
                  )}

                  {sameScheduleForAll && att && line && (
                    <p className="mt-2 text-xs text-muted-foreground">{line.pricingNote}</p>
                  )}
                </div>
              )
            })}
          </CardContent>
        </Card>

        <p className="text-sm text-muted-foreground">
          Need to update names or birthdays?{" "}
          <Link href="/account/profile" className="font-medium text-primary underline-offset-4 hover:underline">
            Edit your family profile
          </Link>
        </p>
      </div>

      <div className="site-sticky-top lg:sticky">
        <Card className="border-primary/15 bg-surface-highlight">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-widget-heading">
              <Calculator className="h-5 w-5 shrink-0 text-primary" />
              Your estimate
            </CardTitle>
            <CardDescription>
              Rendezvous {ratesData.year} · based on last year&apos;s plan
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {calcError && (
              <p className="text-sm text-destructive">{calcError}</p>
            )}
            {calcLoading && !calculation && (
              <p className="text-sm text-muted-foreground">Calculating…</p>
            )}
            {calculation && (
            <>
            <div className="space-y-2">
              <h2 className="text-sm font-semibold">Per person</h2>
              <dl className="space-y-1 text-sm">
                {calculation.members.map((line) => (
                  <div key={line.member.id} className="flex justify-between gap-4">
                    <dt className="truncate">{line.member.name}</dt>
                    <dd className="shrink-0 tabular-nums">${formatMoney(line.total)}</dd>
                  </div>
                ))}
              </dl>
              {calculation.siteFee > 0 && (
                <div className="border-t border-primary/15 pt-2">
                  <div className="flex justify-between gap-4 text-sm">
                    <span>{formatSiteFeeLine(numNights, calculation.siteNightRate)}</span>
                    <span className="tabular-nums">${formatMoney(calculation.siteFee)}</span>
                  </div>
                </div>
              )}
              {calculation.deductions > 0 && (
                <div className="flex justify-between gap-4 text-sm text-muted-foreground">
                  <span>Meal deductions</span>
                  <span className="tabular-nums">−${formatMoney(calculation.deductions)}</span>
                </div>
              )}
            </div>

            <div className="border-t-2 border-primary/20 pt-4" aria-live="polite" aria-atomic="true">
              <div className="flex items-center justify-between gap-4">
                <span className="text-subheading">{ratesData.year} estimate</span>
                <span className="text-amount text-primary tabular-nums">
                  ${formatMoney(calculation.total)}
                </span>
              </div>
            </div>

            <div className="rounded-lg border border-primary/15 bg-background/80 p-3 text-sm">
              <p className="mb-2 font-medium">Compared to {seed.sourceYear}</p>
              <dl className="space-y-1 text-muted-foreground">
                <div className="flex justify-between gap-4">
                  <dt>
                    {seed.comparison.priorYearCalculated != null
                      ? `${seed.sourceYear} (same plan)`
                      : `${seed.sourceYear} (paid)`}
                  </dt>
                  <dd className="tabular-nums text-foreground">
                    ${formatMoney(priorReference)}
                  </dd>
                </div>
                <div className="flex justify-between gap-4 font-medium text-foreground">
                  <dt className="flex items-center gap-1.5">
                    {difference > 0 ? (
                      <TrendingUp className="h-4 w-4 text-warning" aria-hidden="true" />
                    ) : difference < 0 ? (
                      <TrendingDown className="h-4 w-4 text-success" aria-hidden="true" />
                    ) : (
                      <MinusIcon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    )}
                    Difference
                  </dt>
                  <dd
                    className={cn(
                      "tabular-nums",
                      difference > 0 && "text-warning",
                      difference < 0 && "text-success",
                    )}
                  >
                    {difference > 0 ? "+" : difference < 0 ? "−" : ""}$
                    {formatMoney(Math.abs(difference))}
                  </dd>
                </div>
              </dl>
              {seed.comparison.priorYearPaid !== priorReference && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Your {seed.sourceYear} registration total was $
                  {formatMoney(seed.comparison.priorYearPaid)} including shirts, fees, and extras.
                </p>
              )}
            </div>

            {lodgingType === "motel" && calculation.motelAdultUnit > 0 && (
              <p className="text-xs text-muted-foreground">
                Motel adult rate: {formatUnitLine(1, calculation.motelAdultUnit)} (room occupancy from paying
                attendees)
              </p>
            )}

            <p className="text-xs leading-relaxed text-muted-foreground">
              Estimate only — registration fees, shirts, and add-ons are not included.
            </p>
            </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
