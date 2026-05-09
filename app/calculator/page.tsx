import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { CalculatorClient } from "./calculator-client"
import { sql } from "@/lib/db"

async function getActiveRates() {
  try {
    const charts = await sql`
      SELECT * FROM rate_charts WHERE is_active = true LIMIT 1
    `
    
    if (charts.length === 0) {
      return null
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
  const ratesData = await getActiveRates()

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container mx-auto px-4 py-12">
        <CalculatorClient ratesData={ratesData} />
      </main>
      <SiteFooter />
    </div>
  )
}
