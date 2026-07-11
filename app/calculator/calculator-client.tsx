"use client"

import { useState, useMemo, useCallback, useEffect } from "react"
import useSWR from "swr"
import { useUser } from "@clerk/nextjs"
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
  CheckCircle2,
  History,
  Loader2,
  Clock,
  LogIn,
  Plus,
  Save,
  Trash2,
  UserPlus,
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
import { FamilyEstimatePanel } from "@/components/calculator/family-estimate"
import type { CalculatorFamilySeed } from "@/lib/calculator-family-seed"
import { CustomDateSelector } from "@/components/registration/custom-date-selector"

type CalcMember = {
  id: string
  firstName: string
  dateOfBirth: string
  isOver18: boolean
}

function ageOnEventDate(dob: string, eventYear: number): number | null {
  if (!dob) return null
  const birthDate = new Date(dob)
  if (Number.isNaN(birthDate.getTime())) return null
  const eventDate = new Date(`${eventYear}-05-03`)
  let age = eventDate.getFullYear() - birthDate.getFullYear()
  const monthDiff = eventDate.getMonth() - birthDate.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && eventDate.getDate() < birthDate.getDate())) {
    age--
  }
  return Math.max(0, age)
}

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
  initialEnabled: boolean
}

const statusFetcher = async (url: string): Promise<{ enabled: boolean }> => {
  const res = await fetch(url, { cache: "no-store" })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(typeof data.error === "string" ? data.error : "Failed to load calculator status")
  }
  return data
}

const lodgingOptions = [
  { value: "motel", label: "Motel", icon: Home },
  { value: "rv", label: "RV", icon: Truck },
  { value: "tent", label: "Tent", icon: Tent },
  { value: "drivein", label: "Drive-in", icon: Car },
] as const

type LodgingType = (typeof lodgingOptions)[number]["value"]

type FamilyApiResponse = {
  authenticated: boolean
  linked?: boolean
  priorRegistration?: CalculatorFamilySeed | null
  family?: { lastName: string }
}

const familyFetcher = async (url: string): Promise<FamilyApiResponse> => {
  const res = await fetch(url, { cache: "no-store" })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(typeof data.error === "string" ? data.error : "Failed to load family data")
  }
  return data
}

type EstimatePath = "choose" | "new" | "returning"

const ESTIMATE_PATH_KEY = "calculator-estimate-path"

function readStoredEstimatePath(): EstimatePath {
  if (typeof window === "undefined") return "choose"
  const stored = sessionStorage.getItem(ESTIMATE_PATH_KEY)
  if (stored === "new" || stored === "returning" || stored === "choose") return stored
  return "choose"
}

function storeEstimatePath(path: EstimatePath) {
  if (typeof window === "undefined") return
  sessionStorage.setItem(ESTIMATE_PATH_KEY, path)
}

export function CalculatorClient({ ratesData, initialEnabled }: CalculatorClientProps) {
  const { isSignedIn, isLoaded: authLoaded } = useUser()
  const [familySeed, setFamilySeed] = useState<CalculatorFamilySeed | null>(null)
  const [estimatePath, setEstimatePath] = useState<EstimatePath>("choose")

  useEffect(() => {
    setEstimatePath(readStoredEstimatePath())
  }, [])

  const {
    data: statusData,
    error: statusError,
    isLoading: statusLoading,
  } = useSWR<{ enabled: boolean }>("/api/calculator/status", statusFetcher, {
    fallbackData: { enabled: initialEnabled },
    revalidateOnFocus: true,
    revalidateOnMount: true,
  })

  const isEnabled = statusError
    ? initialEnabled
    : (statusData?.enabled ?? initialEnabled)

  // Fire immediately (before Clerk JS finishes loading) — the API answers
  // { authenticated: false } cheaply for guests, so this is safe and shaves
  // Clerk's client init time off the lookup.
  const familyApiUrl = ratesData?.year ? `/api/calculator/family?year=${ratesData.year}` : null

  const { data: familyData, isLoading: familyLoading } = useSWR<FamilyApiResponse>(
    familyApiUrl,
    familyFetcher,
    { revalidateOnFocus: false },
  )

  useEffect(() => {
    if (estimatePath === "returning" && familyData?.priorRegistration) {
      setFamilySeed(familyData.priorRegistration)
    }
  }, [estimatePath, familyData?.priorRegistration])

  const calculatorRedirect = "/calculator"
  const pendingFamilyAutoLoad =
    estimatePath === "returning" &&
    authLoaded &&
    isSignedIn &&
    isEnabled &&
    !familySeed &&
    (familyLoading || Boolean(familyData?.priorRegistration))

  const setPath = (path: EstimatePath) => {
    storeEstimatePath(path)
    setEstimatePath(path)
  }

  const chooseNewFamily = () => {
    setFamilySeed(null)
    setPath("new")
  }

  const chooseReturningFamily = () => {
    setPath("returning")
    if (familyData?.priorRegistration) {
      setFamilySeed(familyData.priorRegistration)
    }
  }

  const resetToPathChooser = () => {
    setFamilySeed(null)
    setPath("choose")
  }

  const [members, setMembers] = useState<CalcMember[]>([
    { id: "1", firstName: "", dateOfBirth: "", isOver18: true },
    { id: "2", firstName: "", dateOfBirth: "", isOver18: true },
  ])
  const [lodgingType, setLodgingType] = useState<LodgingType>("motel")
  const [savingPrefill, setSavingPrefill] = useState(false)
  const [prefillSaved, setPrefillSaved] = useState(false)
  const [prefillError, setPrefillError] = useState<string | null>(null)

  const numNights = 4

  const eventYear = ratesData?.year ?? 2027

  // Bucket each person by their age on the event date, like the registration
  // form does. Rows without a birth date count as adults.
  const { adults, youth, children, infants } = useMemo(() => {
    let adults = 0
    let youth = 0
    let children = 0
    let infants = 0
    for (const member of members) {
      const age = member.isOver18 ? 18 : ageOnEventDate(member.dateOfBirth, eventYear)
      if (age === null || age >= 18) adults++
      else if (age >= 12) youth++
      else if (age >= 6) children++
      else infants++
    }
    return { adults, youth, children, infants }
  }, [members, eventYear])

  const updateMember = (id: string, updates: Partial<CalcMember>) => {
    setPrefillSaved(false)
    setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, ...updates } : m)))
  }

  const addMember = () => {
    setPrefillSaved(false)
    setMembers((prev) => [
      ...prev,
      { id: String(Date.now()), firstName: "", dateOfBirth: "", isOver18: false },
    ])
  }

  const removeMember = (id: string) => {
    setPrefillSaved(false)
    setMembers((prev) => (prev.length > 1 ? prev.filter((m) => m.id !== id) : prev))
  }

  const savePrefill = async () => {
    setSavingPrefill(true)
    setPrefillError(null)
    try {
      const res = await fetch("/api/calculator/prefill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year: eventYear,
          prefill: {
            members: members.map((m) => ({
              firstName: m.firstName,
              dateOfBirth: m.dateOfBirth,
              isOver18: m.isOver18,
            })),
            lodgingType,
          },
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Could not save")
      setPrefillSaved(true)
    } catch (error) {
      setPrefillError(error instanceof Error ? error.message : "Could not save. Try again.")
    } finally {
      setSavingPrefill(false)
    }
  }

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

  if (statusLoading && !isEnabled) {
    return (
      <div className="mx-auto flex max-w-md justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-label="Loading calculator" />
      </div>
    )
  }

  if (!isEnabled) {
    return (
      <div className="mx-auto max-w-md">
        <Card className="border-primary/15 text-center">
          <CardHeader className="border-b border-primary/10 bg-surface-tint">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-surface-highlight">
              <Calculator className="h-8 w-8 text-primary" aria-hidden="true" />
            </div>
            <CardTitle className="text-section-title">Rate calculator</CardTitle>
            <CardDescription className="text-base">Coming soon</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Clock className="h-5 w-5 shrink-0" aria-hidden="true" />
              <span>We&apos;re preparing the 2027 rates</span>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              The rate calculator will be available soon. Check back later to estimate your family&apos;s
              registration costs for Rendezvous 2027.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

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

      {estimatePath === "choose" ? (
        <Card className="mx-auto max-w-lg border-primary/15">
          <CardContent className="space-y-4 p-4 sm:p-6">
            <div className="text-sm font-medium">How would you like to estimate?</div>
            <div className="space-y-2">
              <Button
                type="button"
                variant="outline"
                className="h-auto w-full whitespace-normal bg-transparent px-4 py-3 text-left"
                onClick={chooseNewFamily}
              >
                <span className="flex w-full items-start gap-3">
                  <UserPlus className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                  <span>
                    <span className="block font-medium">New family</span>
                    <span className="mt-0.5 block text-sm font-normal text-muted-foreground">
                      Build an estimate from scratch — add people, ages, and lodging.
                    </span>
                  </span>
                </span>
              </Button>
              <div className="border-t border-border/60 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-auto w-full whitespace-normal bg-transparent px-4 py-3 text-left"
                  onClick={chooseReturningFamily}
                >
                  <span className="flex w-full items-start gap-3">
                    <History className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                    <span>
                      <span className="block font-medium">Returning family</span>
                      <span className="mt-0.5 block text-sm font-normal text-muted-foreground">
                        Use last year&apos;s registration — pre-filled family, lodging, and a
                        year-over-year comparison.
                      </span>
                    </span>
                  </span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : pendingFamilyAutoLoad ? (
        <Card className="mb-6 border-primary/20 bg-primary/5">
          <CardContent className="flex items-center justify-center gap-3 p-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">
              Looking up your family&apos;s prior registration…
            </p>
          </CardContent>
        </Card>
      ) : estimatePath === "returning" && authLoaded && !isSignedIn ? (
        <Card className="mx-auto max-w-lg border-primary/20 bg-primary/5">
          <CardContent className="space-y-4 p-4 sm:p-6">
            <div className="flex items-start gap-3">
              <LogIn className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
              <div>
                <p className="font-medium">Sign in for your returning-family estimate</p>
                <p className="text-sm text-muted-foreground">
                  Use the email from last year — we&apos;ll pre-fill your family, lodging, nights,
                  and meals, and show how {ratesData.year} compares.
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button asChild className="flex-1">
                <Link href={`/sign-in?redirect_url=${encodeURIComponent(calculatorRedirect)}`}>
                  <LogIn className="mr-2 h-4 w-4" aria-hidden="true" />
                  Sign in
                </Link>
              </Button>
              <Button asChild variant="outline" className="flex-1">
                <Link href={`/sign-up?redirect_url=${encodeURIComponent(calculatorRedirect)}`}>
                  Create account
                </Link>
              </Button>
            </div>
            <Button type="button" variant="ghost" className="w-full" onClick={resetToPathChooser}>
              Back to choices
            </Button>
          </CardContent>
        </Card>
      ) : estimatePath === "returning" &&
        authLoaded &&
        isSignedIn &&
        !familySeed &&
        familyData?.linked === false ? (
        <Card className="mx-auto max-w-lg border-primary/20 bg-primary/5">
          <CardContent className="space-y-4 p-4 sm:p-6">
            <div className="flex items-start gap-3">
              <History className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
              <div>
                <p className="font-medium">Link your account to your registration</p>
                <p className="text-sm text-muted-foreground">
                  We couldn&apos;t match your sign-in email to a family record yet. Open your account
                  page to link your profile, then come back for an auto-filled estimate.
                </p>
              </div>
            </div>
            <Button asChild className="w-full">
              <Link href="/account">Go to account</Link>
            </Button>
            <Button type="button" variant="ghost" className="w-full" onClick={resetToPathChooser}>
              Back to choices
            </Button>
          </CardContent>
        </Card>
      ) : familySeed ? (
        <FamilyEstimatePanel
          seed={familySeed}
          ratesData={ratesData}
          onReset={resetToPathChooser}
        />
      ) : estimatePath === "returning" && authLoaded && isSignedIn && !familyLoading ? (
        <Card className="mx-auto max-w-lg border-primary/20 bg-primary/5">
          <CardContent className="space-y-4 p-4 sm:p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
              <div>
                <p className="font-medium">No prior registration found</p>
                <p className="text-sm text-muted-foreground">
                  We couldn&apos;t find a previous Rendezvous registration for this account. You can
                  still build a new-family estimate from scratch.
                </p>
              </div>
            </div>
            <Button type="button" className="w-full" onClick={chooseNewFamily}>
              Estimate as a new family
            </Button>
            <Button type="button" variant="ghost" className="w-full" onClick={resetToPathChooser}>
              Back to choices
            </Button>
          </CardContent>
        </Card>
      ) : (
      <div className="grid gap-6 lg:grid-cols-3 lg:items-start">
        <div className="space-y-6 lg:col-span-2">
          <div className="flex justify-start">
            <Button type="button" variant="ghost" size="sm" onClick={resetToPathChooser} className="gap-1.5">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Back to choices
            </Button>
          </div>
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
              <CardDescription>
                Add each person like on the registration form — names are optional here, but if
                you save at the end they'll pre-fill your registration.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {members.map((member, index) => {
                const age = member.isOver18 ? null : ageOnEventDate(member.dateOfBirth, eventYear)
                return (
                  <div key={member.id} className="flex items-start gap-3 rounded-lg border border-border/60 p-3">
                    <div className="flex-1 space-y-3">
                      <div>
                        <Label htmlFor={`calc-name-${member.id}`}>First name (optional)</Label>
                        <Input
                          id={`calc-name-${member.id}`}
                          value={member.firstName}
                          placeholder={`Person ${index + 1}`}
                          onChange={(e) => updateMember(member.id, { firstName: e.target.value })}
                        />
                      </div>
                      <CustomDateSelector
                        id={`calc-dob-${member.id}`}
                        label="Date of birth (anyone under 18)"
                        value={member.dateOfBirth}
                        onChange={(date) =>
                          updateMember(member.id, { dateOfBirth: date, isOver18: false })
                        }
                        isOver18={member.isOver18}
                        onOver18Change={(isOver18) =>
                          updateMember(member.id, { isOver18, dateOfBirth: "" })
                        }
                      />
                      {age !== null && member.dateOfBirth && (
                        <p className="text-sm text-muted-foreground">
                          Age on May 3, {eventYear}: {age} {age === 1 ? "year" : "years"} old
                          {age <= 5 && (
                            <Badge variant="secondary" className="ml-2">
                              Free
                            </Badge>
                          )}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeMember(member.id)}
                      disabled={members.length === 1}
                      aria-label={`Remove ${member.firstName || `person ${index + 1}`}`}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                )
              })}
              <Button onClick={addMember} variant="outline" className="w-full bg-transparent">
                <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                Add family member
              </Button>
              <p className="text-xs text-muted-foreground">
                Pricing groups: adults (18+), youth (12–17), children (6–11); infants and children
                5 and under are free.
              </p>
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

              <div className="border-t border-primary/15 pt-4">
                {authLoaded && isSignedIn ? (
                  <div className="space-y-2">
                    <Button
                      onClick={savePrefill}
                      disabled={savingPrefill}
                      variant="outline"
                      className="w-full"
                    >
                      {savingPrefill ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                      ) : (
                        <Save className="mr-2 h-4 w-4" aria-hidden="true" />
                      )}
                      Save for registration
                    </Button>
                    {prefillSaved && (
                      <p className="flex items-start gap-1.5 text-xs text-muted-foreground" role="status">
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-600" aria-hidden="true" />
                        Saved! Your family members and lodging will pre-fill the {eventYear}{" "}
                        registration form.
                      </p>
                    )}
                    {prefillError && (
                      <p className="text-xs text-destructive" role="alert">
                        {prefillError}
                      </p>
                    )}
                  </div>
                ) : authLoaded ? (
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    <Link
                      href={`/sign-in?redirect_url=${encodeURIComponent(calculatorRedirect)}`}
                      className="text-primary hover:underline"
                    >
                      Sign in
                    </Link>{" "}
                    to save this info — we&apos;ll pre-fill your registration form with it.
                  </p>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      )}
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

