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
  DollarSign,
  ArrowLeft,
  AlertCircle,
  Calendar,
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
  // Simple mode state
  const [adults, setAdults] = useState(2)
  const [youth, setYouth] = useState(0)
  const [children, setChildren] = useState(0)
  const [infants, setInfants] = useState(0)
  
  // Lodging configuration
  const [lodgingType, setLodgingType] = useState<"motel" | "rv" | "tent" | "drivein">("motel")
  
  // For simple mode, always use full week (4 nights for lodging, 5 days for drive-in)
  const numNights = 4

  // Auto-calculate occupancy based on number of adults
  const occupancyType = useMemo((): "single" | "double" | "triple" | "quad" => {
    if (adults === 1) return "single"
    if (adults === 2) return "double"
    if (adults === 3) return "triple"
    return "quad" // 4+ adults
  }, [adults])

  // Helper to get rate amount by category and name pattern
  const getRate = useCallback((category: string, namePattern: string): number => {
    if (!ratesData?.rates?.[category]) return 0
    const rate = ratesData.rates[category].find(r => r.name.includes(namePattern))
    return rate ? parseFloat(rate.amount) : 0
  }, [ratesData])

  // Simple mode calculation
  const simpleCalculation = useMemo(() => {
    if (!ratesData?.rates) {
      return { adults: 0, youth: 0, children: 0, infants: 0, siteFee: 0, total: 0 }
    }

    const rateCategory = lodgingType
    
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
    }
  }, [adults, youth, children, lodgingType, occupancyType, numNights, ratesData, getRate])

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
          Estimate your total cost for Rendezvous
        </p>
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
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="flex-1">
                      <span className="font-medium capitalize">{occupancyType}</span>
                      <span className="text-muted-foreground ml-1">
                        ({adults} {adults === 1 ? "adult" : "adults"})
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-semibold">${getRate("motel", `motel_${occupancyType}_adult`)}</span>
                      <span className="text-sm text-muted-foreground">/adult</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Occupancy is automatically set based on the number of adults
                  </p>
                </div>
              )}

              {/* Full week info */}
              {lodgingType !== "drivein" && (
                <div className="pt-4 border-t">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Full week attendance (Mon-Fri)</span>
                  </div>
                </div>
              )}

              {/* Drive-In Info */}
              {lodgingType === "drivein" && (
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
                </div>
              )}
            </CardContent>
          </Card>

          {/* Family Members */}
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
                Rendezvous {ratesData.year} &bull; Full Week (Mon-Fri)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Breakdown */}
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

              {/* Total */}
              <div className="pt-4 border-t-2">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold">Estimated Total</span>
                  <span className="text-2xl font-bold text-primary flex items-center">
                    <DollarSign className="h-6 w-6" />
                    {simpleCalculation.total.toFixed(2)}
                  </span>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                This is an estimate. Final pricing may vary based on registration options.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
