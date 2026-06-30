"use client"

import { useState, useMemo, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Badge } from "@/components/ui/badge"
import {
  Calculator,
  Users,
  Home,
  Tent,
  Truck,
  Car,
  ArrowLeft,
  AlertCircle,
  Calendar,
  type LucideIcon,
} from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import {
  countPayingAttendees,
  motelOccupancyFromPayingCount,
  payingAttendeeLabel,
} from "@/lib/motel-occupancy"
import {
  formatMoney,
  formatSiteFeeLine,
  formatUnitLine,
} from "@/lib/rate-display"

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

interface CalculatorClientProps {
  ratesData: RatesData | null
}

const lodgingOptions = [
  { value: "motel", label: "Motel", icon: Home },
  { value: "rv", label: "RV", icon: Truck },
  { value: "tent", label: "Tent", icon: Tent },
  { value: "drivein", label: "Drive-in", icon: Car },
] as const

type LodgingType = (typeof lodgingOptions)[number]["value"]

export function CalculatorClient({ ratesData }: CalculatorClientProps) {
  const [adults, setAdults] = useState(2)
  const [youth, setYouth] = useState(0)
  const [children, setChildren] = useState(0)
  const [infants, setInfants] = useState(0)
  const [lodgingType, setLodgingType] = useState<LodgingType>("motel")

  const numNights = 4

  const payingCount = countPayingAttendees({ adults, youth, children })

  const occupancyType = useMemo(
    () => motelOccupancyFromPayingCount(payingCount),
    [payingCount],
  )

  const getRate = useCallback(
    (category: string, namePattern: string): number => {
      if (!ratesData?.rates?.[category]) return 0
      const rate = ratesData.rates[category].find((r) => r.name.includes(namePattern))
      return rate ? parseFloat(rate.amount) : 0
    },
    [ratesData],
  )

  const simpleCalculation = useMemo(() => {
    if (!ratesData?.rates) {
      return {
        adults: 0,
        youth: 0,
        children: 0,
        infants: 0,
        siteFee: 0,
        total: 0,
        adultUnit: 0,
        youthUnit: 0,
        childUnit: 0,
        siteNightRate: 0,
      }
    }

    const rateCategory = lodgingType

    let adultUnit = 0
    let youthUnit = 0
    let childUnit = 0
    let adultCost = 0
    let youthCost = 0
    let childCost = 0
    const infantCost = 0

    if (lodgingType === "motel") {
      adultUnit = getRate(rateCategory, `motel_${occupancyType}_adult`)
      youthUnit = getRate(rateCategory, "motel_youth")
      childUnit = getRate(rateCategory, "motel_child")
      adultCost = adults * adultUnit
      youthCost = youth * youthUnit
      childCost = children * childUnit
    } else if (lodgingType === "rv") {
      adultUnit = getRate(rateCategory, "rv_adult")
      youthUnit = getRate(rateCategory, "rv_youth")
      childUnit = getRate(rateCategory, "rv_child")
      adultCost = adults * adultUnit
      youthCost = youth * youthUnit
      childCost = children * childUnit
    } else if (lodgingType === "tent") {
      adultUnit = getRate(rateCategory, "tent_adult")
      youthUnit = getRate(rateCategory, "tent_youth")
      childUnit = getRate(rateCategory, "tent_child")
      adultCost = adults * adultUnit
      youthCost = youth * youthUnit
      childCost = children * childUnit
    } else if (lodgingType === "drivein") {
      const daysCount = 5
      const adultEntry = getRate("drivein", "drivein_adult") * daysCount
      const youthEntry = getRate("drivein", "drivein_youth") * daysCount
      const childEntry = getRate("drivein", "drivein_child") * daysCount

      const adultMeals =
        getRate("meal_addition", "breakfast_adult") * 4 +
        getRate("meal_addition", "lunch_adult") * 5 +
        getRate("meal_addition", "dinner_adult") * 4
      const youthMeals =
        getRate("meal_addition", "breakfast_youth") * 4 +
        getRate("meal_addition", "lunch_youth") * 5 +
        getRate("meal_addition", "dinner_youth") * 4
      const childMeals =
        getRate("meal_addition", "breakfast_child") * 4 +
        getRate("meal_addition", "lunch_child") * 5 +
        getRate("meal_addition", "dinner_child") * 4

      adultUnit = adultEntry + adultMeals
      youthUnit = youthEntry + youthMeals
      childUnit = childEntry + childMeals
      adultCost = adults * adultUnit
      youthCost = youth * youthUnit
      childCost = children * childUnit
    }

    let siteFee = 0
    let siteNightRate = 0
    if (lodgingType === "rv") {
      siteNightRate = getRate("rv", "rv_site_night")
      siteFee = siteNightRate * numNights
    } else if (lodgingType === "tent") {
      siteNightRate = getRate("tent", "tent_site_night")
      siteFee = siteNightRate * numNights
    }

    return {
      adults: adultCost,
      youth: youthCost,
      children: childCost,
      infants: infantCost,
      siteFee,
      total: adultCost + youthCost + childCost + siteFee,
      adultUnit,
      youthUnit,
      childUnit,
      siteNightRate,
    }
  }, [adults, youth, children, lodgingType, occupancyType, numNights, ratesData, getRate])

  if (!ratesData) {
    return (
      <div className="mx-auto max-w-2xl">
        <Card className="border-destructive/30">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <AlertCircle className="h-8 w-8 text-destructive" aria-hidden="true" />
            </div>
            <CardTitle className="font-display">Calculator unavailable</CardTitle>
            <CardDescription>
              Pricing information is not currently available. Please check back later.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button asChild className="h-11 gap-2">
              <Link href="/">
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Back to home
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-8 text-center md:mb-10">
        <h1 className="text-page-title mb-3 text-balance">
          {ratesData.year} cost calculator
        </h1>
        <p className="text-lead text-muted-foreground">Estimate your total cost for Rendezvous</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-3 lg:items-start">
        <div className="space-y-6 lg:col-span-2">
          <Card className="border-primary/15">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-widget-heading">
                <Home className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                Lodging type
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <RadioGroup
                value={lodgingType}
                onValueChange={(v) => setLodgingType(v as LodgingType)}
                className="grid grid-cols-2 gap-3 md:grid-cols-4"
              >
                {lodgingOptions.map(({ value, label, icon: Icon }) => (
                  <LodgingOption
                    key={value}
                    value={value}
                    label={label}
                    icon={Icon}
                    selected={lodgingType === value}
                  />
                ))}
              </RadioGroup>

              {lodgingType === "motel" && (
                <div className="border-t border-primary/15 pt-4">
                  <Label className="mb-2 block text-sm font-medium">Room occupancy</Label>
                  <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-surface-tint/50 p-3">
                    <div className="flex-1">
                      <span className="font-medium capitalize">{occupancyType}</span>
                      <span className="ml-1 text-muted-foreground">
                        ({payingAttendeeLabel(payingCount)})
                      </span>
                    </div>
                    <div className="text-right tabular-nums">
                      <span className="font-semibold">${formatMoney(simpleCalculation.adultUnit)}</span>
                      <span className="text-sm text-muted-foreground">/person</span>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Occupancy is based on paying attendees (adults, youth, and children age 6+). Infants
                    are free and do not count.
                  </p>
                </div>
              )}

              {lodgingType !== "drivein" && (
                <div className="border-t border-primary/15 pt-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>Full week attendance (Mon–Fri)</span>
                  </div>
                </div>
              )}

              {lodgingType === "drivein" && (
                <div className="border-t border-primary/15 pt-4">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Calendar className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>Full week (Mon–Fri) with all meals</span>
                  </div>
                  <dl className="mt-3 space-y-2 text-sm text-muted-foreground">
                    <div className="flex justify-between gap-4">
                      <dt>Daily entry fee</dt>
                      <dd className="tabular-nums">${getRate("drivein", "drivein_adult")}/day per adult</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt>Meals included</dt>
                      <dd>12 meals (breakfast, lunch, dinner)</dd>
                    </div>
                  </dl>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-primary/15">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-widget-heading">
                <Users className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                Family members
              </CardTitle>
              <CardDescription>Enter the number of people in each age group</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <NumberField
                  id="adults"
                  label="Adults (18+)"
                  value={adults}
                  onChange={setAdults}
                />
                <NumberField id="youth" label="Youth (12–17)" value={youth} onChange={setYouth} />
                <NumberField id="children" label="Children (6–11)" value={children} onChange={setChildren} />
                <div className="space-y-2">
                  <Label htmlFor="infants">Infants (0–5)</Label>
                  <div className="flex items-center gap-2">
                    <NumberField id="infants" label="Infants (0–5)" value={infants} onChange={setInfants} hideLabel />
                    <Badge variant="secondary" className="shrink-0">
                      Free
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="site-sticky-top lg:sticky">
          <Card className="border-primary/15 bg-surface-highlight">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-widget-heading">
                <Calculator className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                Cost estimate
              </CardTitle>
              <CardDescription>
                Rendezvous {ratesData.year} · Full week (Mon–Fri)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h2 className="text-sm font-semibold">Lodging</h2>
                <dl className="space-y-1 text-sm">
                  {adults > 0 && (
                    <div className="flex justify-between gap-4">
                      <dt>{formatUnitLine(adults, simpleCalculation.adultUnit)}</dt>
                      <dd className="tabular-nums">${formatMoney(simpleCalculation.adults)}</dd>
                    </div>
                  )}
                  {youth > 0 && (
                    <div className="flex justify-between gap-4">
                      <dt>{formatUnitLine(youth, simpleCalculation.youthUnit)}</dt>
                      <dd className="tabular-nums">${formatMoney(simpleCalculation.youth)}</dd>
                    </div>
                  )}
                  {children > 0 && (
                    <div className="flex justify-between gap-4">
                      <dt>{formatUnitLine(children, simpleCalculation.childUnit)}</dt>
                      <dd className="tabular-nums">${formatMoney(simpleCalculation.children)}</dd>
                    </div>
                  )}
                  {infants > 0 && (
                    <div className="flex justify-between gap-4 text-muted-foreground">
                      <dt>
                        {infants} infant{infants > 1 ? "s" : ""} (0–5)
                      </dt>
                      <dd>Free</dd>
                    </div>
                  )}
                </dl>
                {simpleCalculation.siteFee > 0 && (
                  <div className="border-t border-primary/15 pt-2">
                    <div className="flex justify-between gap-4 text-sm">
                      <span>{formatSiteFeeLine(numNights, simpleCalculation.siteNightRate)}</span>
                      <span className="tabular-nums">${formatMoney(simpleCalculation.siteFee)}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t-2 border-primary/20 pt-4" aria-live="polite" aria-atomic="true">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-subheading">Estimated total</span>
                  <span className="text-amount text-primary tabular-nums">
                    ${formatMoney(simpleCalculation.total)}
                  </span>
                </div>
              </div>

              <p className="text-xs leading-relaxed text-muted-foreground">
                This is an estimate. Final pricing may vary based on registration options.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function LodgingOption({
  value,
  label,
  icon: Icon,
  selected,
}: {
  value: LodgingType
  label: string
  icon: LucideIcon
  selected: boolean
}) {
  const id = `lodging-${value}`

  return (
    <div
      className={cn(
        "rounded-lg border border-primary/15 transition-colors",
        selected && "bg-surface-highlight ring-2 ring-primary/40",
      )}
    >
      <div className="flex min-h-11 items-center gap-2 p-3">
        <RadioGroupItem value={value} id={id} className="shrink-0" />
        <Label htmlFor={id} className="flex flex-1 cursor-pointer items-center gap-2 font-medium">
          <Icon className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          {label}
        </Label>
      </div>
    </div>
  )
}

function NumberField({
  id,
  label,
  value,
  onChange,
  hideLabel = false,
}: {
  id: string
  label: string
  value: number
  onChange: (value: number) => void
  hideLabel?: boolean
}) {
  return (
    <div className={hideLabel ? "flex-1" : "space-y-2"}>
      {!hideLabel && <Label htmlFor={id}>{label}</Label>}
      <Input
        id={id}
        type="number"
        min={0}
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(Math.max(0, parseInt(e.target.value, 10) || 0))}
        className="h-11 tabular-nums"
        aria-label={hideLabel ? label : undefined}
      />
    </div>
  )
}
