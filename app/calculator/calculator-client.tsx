"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { 
  Calculator, 
  Users, 
  Home, 
  Tent,
  DollarSign,
  ArrowLeft,
  AlertCircle
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

interface CalculatorClientProps {
  ratesData: RatesData | null
}

export function CalculatorClient({ ratesData }: CalculatorClientProps) {
  const [adults, setAdults] = useState(0)
  const [teens, setTeens] = useState(0)
  const [children5to11, setChildren5to11] = useState(0)
  const [toddlers, setToddlers] = useState(0)
  const [infants, setInfants] = useState(0)
  const [lodgingType, setLodgingType] = useState<string>("")
  const [climbingTower, setClimbingTower] = useState(false)
  const [climbingCount, setClimbingCount] = useState(0)
  const [tshirts, setTshirts] = useState(0)

  // Extract rates from data
  const lodgingRates = useMemo(() => {
    if (!ratesData?.rates?.lodging) return {}
    const rates: Record<string, number> = {}
    for (const rate of ratesData.rates.lodging) {
      rates[rate.name] = parseFloat(rate.amount)
    }
    return rates
  }, [ratesData])

  const siteFeeRates = useMemo(() => {
    if (!ratesData?.rates?.site_fee) return []
    return ratesData.rates.site_fee.map(rate => ({
      value: rate.name,
      label: rate.label,
      price: parseFloat(rate.amount),
    }))
  }, [ratesData])

  const climbingTowerRate = useMemo(() => {
    if (!ratesData?.rates?.extra) return 10
    const rate = ratesData.rates.extra.find(r => r.name === "climbing_tower")
    return rate ? parseFloat(rate.amount) : 10
  }, [ratesData])

  const tshirtRate = useMemo(() => {
    if (!ratesData?.rates?.extra) return 15
    const rate = ratesData.rates.extra.find(r => r.name === "tshirt")
    return rate ? parseFloat(rate.amount) : 15
  }, [ratesData])

  const totalPeople = adults + teens + children5to11 + toddlers + infants
  const eligibleForClimbing = adults + teens + children5to11

  const calculation = useMemo(() => {
    // Lodging costs
    const adultCost = adults * (lodgingRates.adult || 130)
    const teenCost = teens * (lodgingRates.teen || 100)
    const childCost = children5to11 * (lodgingRates.child_5_11 || 75)
    const toddlerCost = toddlers * (lodgingRates.toddler || 25)
    const infantCost = infants * (lodgingRates.infant || 0)
    
    const lodgingTotal = adultCost + teenCost + childCost + toddlerCost + infantCost

    // Site fee
    const selectedSite = siteFeeRates.find(s => s.value === lodgingType)
    const siteFee = selectedSite?.price || 0

    // Climbing tower
    const climbingFee = climbingTower ? climbingCount * climbingTowerRate : 0

    // T-shirts
    const tshirtFee = tshirts * tshirtRate

    const total = lodgingTotal + siteFee + climbingFee + tshirtFee

    return {
      adultCost,
      teenCost,
      childCost,
      toddlerCost,
      infantCost,
      lodgingTotal,
      siteFee,
      climbingFee,
      tshirtFee,
      total,
    }
  }, [adults, teens, children5to11, toddlers, infants, lodgingType, climbingTower, climbingCount, tshirts, lodgingRates, siteFeeRates, climbingTowerRate, tshirtRate])

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
    <div className="mx-auto max-w-4xl">
      <div className="mb-8 text-center">
        <h1 className="mb-4 text-balance text-4xl font-bold tracking-tight md:text-5xl">
          Lodging Cost Calculator
        </h1>
        <p className="text-balance text-lg text-muted-foreground">
          Estimate your total cost for Rendezvous {ratesData.year}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Input Section */}
        <div className="space-y-6">
          {/* Family Members */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Family Members
              </CardTitle>
              <CardDescription>Enter the number of people in each age group</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
                    <span className="text-sm text-muted-foreground whitespace-nowrap">
                      ${lodgingRates.adult || 130}/ea
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="teens">Teens (12-17)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="teens"
                      type="number"
                      min="0"
                      value={teens}
                      onChange={(e) => setTeens(Math.max(0, parseInt(e.target.value) || 0))}
                    />
                    <span className="text-sm text-muted-foreground whitespace-nowrap">
                      ${lodgingRates.teen || 100}/ea
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="children">Children (5-11)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="children"
                      type="number"
                      min="0"
                      value={children5to11}
                      onChange={(e) => setChildren5to11(Math.max(0, parseInt(e.target.value) || 0))}
                    />
                    <span className="text-sm text-muted-foreground whitespace-nowrap">
                      ${lodgingRates.child_5_11 || 75}/ea
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="toddlers">Toddlers (2-4)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="toddlers"
                      type="number"
                      min="0"
                      value={toddlers}
                      onChange={(e) => setToddlers(Math.max(0, parseInt(e.target.value) || 0))}
                    />
                    <span className="text-sm text-muted-foreground whitespace-nowrap">
                      ${lodgingRates.toddler || 25}/ea
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="infants">Infants (0-1)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="infants"
                      type="number"
                      min="0"
                      value={infants}
                      onChange={(e) => setInfants(Math.max(0, parseInt(e.target.value) || 0))}
                    />
                    <span className="text-sm text-muted-foreground whitespace-nowrap">
                      FREE
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Lodging Type */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Home className="h-5 w-5" />
                Lodging Type
              </CardTitle>
              <CardDescription>Select your camping arrangement</CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup value={lodgingType} onValueChange={setLodgingType}>
                {siteFeeRates.map((option) => (
                  <div key={option.value} className="flex items-center justify-between py-2">
                    <div className="flex items-center space-x-3">
                      <RadioGroupItem value={option.value} id={option.value} />
                      <Label htmlFor={option.value} className="cursor-pointer">
                        {option.label}
                      </Label>
                    </div>
                    <span className="text-sm font-medium">${option.price}</span>
                  </div>
                ))}
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Extras */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tent className="h-5 w-5" />
                Extras
              </CardTitle>
              <CardDescription>Additional activities</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-3">
                <Checkbox
                  id="climbing"
                  checked={climbingTower}
                  onCheckedChange={(checked) => {
                    setClimbingTower(checked === true)
                    if (!checked) setClimbingCount(0)
                  }}
                />
                <Label htmlFor="climbing" className="cursor-pointer">
                  Climbing Tower (${climbingTowerRate}/person)
                </Label>
              </div>
                {climbingTower && (
                <div className="ml-6 space-y-2">
                  <Label htmlFor="climbingCount">
                    Number of climbers (max {eligibleForClimbing})
                  </Label>
                  <Input
                    id="climbingCount"
                    type="number"
                    min="0"
                    max={eligibleForClimbing}
                    value={climbingCount}
                    onChange={(e) => setClimbingCount(Math.min(eligibleForClimbing, Math.max(0, parseInt(e.target.value) || 0)))}
                    className="w-24"
                  />
                </div>
              )}
              
              <div className="pt-4 border-t">
                <div className="space-y-2">
                  <Label htmlFor="tshirts">T-Shirts (${tshirtRate}/each)</Label>
                  <Input
                    id="tshirts"
                    type="number"
                    min="0"
                    value={tshirts}
                    onChange={(e) => setTshirts(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-24"
                  />
                  <p className="text-xs text-muted-foreground">All sizes same price</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Results Section */}
        <div>
          <Card className="sticky top-24 border-primary/20 bg-gradient-to-br from-primary/5 to-background">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Cost Estimate
              </CardTitle>
              <CardDescription>
                Rendezvous {ratesData.year} • {totalPeople} {totalPeople === 1 ? "person" : "people"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Lodging Breakdown */}
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Lodging</h4>
                <div className="space-y-1 text-sm">
                  {adults > 0 && (
                    <div className="flex justify-between">
                      <span>{adults} Adult{adults > 1 ? "s" : ""}</span>
                      <span>${calculation.adultCost.toFixed(2)}</span>
                    </div>
                  )}
                  {teens > 0 && (
                    <div className="flex justify-between">
                      <span>{teens} Teen{teens > 1 ? "s" : ""}</span>
                      <span>${calculation.teenCost.toFixed(2)}</span>
                    </div>
                  )}
                  {children5to11 > 0 && (
                    <div className="flex justify-between">
                      <span>{children5to11} Child{children5to11 > 1 ? "ren" : ""} (5-11)</span>
                      <span>${calculation.childCost.toFixed(2)}</span>
                    </div>
                  )}
                  {toddlers > 0 && (
                    <div className="flex justify-between">
                      <span>{toddlers} Toddler{toddlers > 1 ? "s" : ""}</span>
                      <span>${calculation.toddlerCost.toFixed(2)}</span>
                    </div>
                  )}
                  {infants > 0 && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>{infants} Infant{infants > 1 ? "s" : ""}</span>
                      <span>FREE</span>
                    </div>
                  )}
                </div>
                <div className="flex justify-between font-medium pt-1 border-t">
                  <span>Lodging Subtotal</span>
                  <span>${calculation.lodgingTotal.toFixed(2)}</span>
                </div>
              </div>

              {/* Site Fee */}
              {lodgingType && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Site Fee</h4>
                  <div className="flex justify-between text-sm">
                    <span>{siteFeeRates.find(s => s.value === lodgingType)?.label}</span>
                    <span>${calculation.siteFee.toFixed(2)}</span>
                  </div>
                </div>
              )}

              {/* Extras */}
              {(climbingTower && climbingCount > 0) || tshirts > 0 ? (
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Extras</h4>
                  {climbingTower && climbingCount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span>Climbing Tower ({climbingCount})</span>
                      <span>${calculation.climbingFee.toFixed(2)}</span>
                    </div>
                  )}
                  {tshirts > 0 && (
                    <div className="flex justify-between text-sm">
                      <span>T-Shirts ({tshirts})</span>
                      <span>${calculation.tshirtFee.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              ) : null}

              {/* Total */}
              <div className="pt-4 border-t-2">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold">Estimated Total</span>
                  <span className="text-2xl font-bold text-primary flex items-center">
                    <DollarSign className="h-6 w-6" />
                    {calculation.total.toFixed(2)}
                  </span>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                This is an estimate. Final pricing may vary based on registration options and any applicable discounts.
              </p>

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
