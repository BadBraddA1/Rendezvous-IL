import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { CalculatorClient } from "./calculator-client"
import { sql } from "@/lib/db"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Calculator, Clock } from "lucide-react"

async function isCalculatorEnabled() {
  try {
    const result = await sql`
      SELECT value FROM app_settings WHERE key = 'public_calculator_enabled'
    `
    return result[0]?.value === "true"
  } catch (error) {
    console.error("Error checking calculator status:", error)
    return false
  }
}

async function getActiveRates() {
  try {
    const charts = await sql`
      SELECT * FROM rate_charts WHERE is_active = true LIMIT 1
    `
    
    if (charts.length === 0) {
      // Fallback to 2027 if no active chart
      const charts2027 = await sql`
        SELECT * FROM rate_charts WHERE year = 2027 LIMIT 1
      `
      if (charts2027.length === 0) return null
      
      const rateChart = charts2027[0]
      const rates = await sql`
        SELECT * FROM rates 
        WHERE rate_chart_id = ${rateChart.id}
        ORDER BY category, sort_order
      `
      
      const groupedRates: Record<string, typeof rates> = {}
      for (const rate of rates) {
        if (!groupedRates[rate.category]) {
          groupedRates[rate.category] = []
        }
        groupedRates[rate.category].push(rate)
      }
      
      return { year: rateChart.year, rates: groupedRates }
    }
    
    const rateChart = charts[0]
    
    const rates = await sql`
      SELECT * FROM rates 
      WHERE rate_chart_id = ${rateChart.id}
      ORDER BY category, sort_order
    `
    
    // Group rates by category
    const groupedRates: Record<string, typeof rates> = {}
    for (const rate of rates) {
      if (!groupedRates[rate.category]) {
        groupedRates[rate.category] = []
      }
      groupedRates[rate.category].push(rate)
    }
    
    return {
      year: rateChart.year,
      rates: groupedRates,
    }
  } catch (error) {
    console.error("Error fetching rates:", error)
    return null
  }
}

export default async function CalculatorPage() {
  const [ratesData, isEnabled] = await Promise.all([
    getActiveRates(),
    isCalculatorEnabled(),
  ])

  // Show coming soon page if calculator is disabled
  if (!isEnabled) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <main className="container mx-auto px-4 pt-20 pb-12 md:pt-24">
          <div className="max-w-md mx-auto">
            <Card className="text-center">
              <CardHeader>
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <Calculator className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-2xl">Rate Calculator</CardTitle>
                <CardDescription className="text-base">
                  Coming Soon
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                  <Clock className="h-5 w-5" />
                  <span>We&apos;re preparing the 2027 rates</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  The rate calculator will be available soon. Check back later to estimate your family&apos;s registration costs for Rendezvous 2027.
                </p>
              </CardContent>
            </Card>
          </div>
        </main>
        <SiteFooter />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container mx-auto px-4 pt-20 pb-12 md:pt-24">
        <CalculatorClient ratesData={ratesData} />
      </main>
      <SiteFooter />
    </div>
  )
}
