import { sql } from "@/lib/db"

export interface Rate {
  id: number
  rate_chart_id: number
  category: string
  name: string
  label: string
  amount: string
  description: string | null
  sort_order: number
}

export interface RateChart {
  id: number
  year: number
  is_active: boolean
}

export interface GroupedRates {
  lodging: Rate[]
  site_fee: Rate[]
  extra: Rate[]
  other: Rate[]
}

export interface RatesData {
  rateChart: RateChart
  rates: GroupedRates
}

/**
 * Get the active rate chart with all rates
 */
export async function getActiveRates(): Promise<RatesData | null> {
  try {
    const charts = await sql`
      SELECT * FROM rate_charts WHERE is_active = true LIMIT 1
    `
    
    if (charts.length === 0) {
      return null
    }
    
    const rateChart = charts[0] as RateChart
    
    const ratesResult = await sql`
      SELECT * FROM rates 
      WHERE rate_chart_id = ${rateChart.id}
      ORDER BY category, sort_order
    `
    
    // Group rates by category
    const rates: GroupedRates = {
      lodging: [],
      site_fee: [],
      extra: [],
      other: [],
    }
    
    for (const rate of ratesResult) {
      const category = rate.category as keyof GroupedRates
      if (rates[category]) {
        rates[category].push(rate as Rate)
      }
    }
    
    return { rateChart, rates }
  } catch (error) {
    console.error("Error fetching active rates:", error)
    return null
  }
}

/**
 * Get a specific rate amount by category and name
 */
export function getRateAmount(rates: GroupedRates, category: keyof GroupedRates, name: string): number {
  const rate = rates[category]?.find(r => r.name === name)
  return rate ? parseFloat(rate.amount) : 0
}

/**
 * Build a rates lookup object for easy access
 */
export function buildRatesLookup(rates: GroupedRates): {
  lodging: Record<string, number>
  siteFee: Record<string, number>
  extra: Record<string, number>
  other: Record<string, number>
} {
  const lookup = {
    lodging: {} as Record<string, number>,
    siteFee: {} as Record<string, number>,
    extra: {} as Record<string, number>,
    other: {} as Record<string, number>,
  }
  
  for (const rate of rates.lodging) {
    lookup.lodging[rate.name] = parseFloat(rate.amount)
  }
  for (const rate of rates.site_fee) {
    lookup.siteFee[rate.name] = parseFloat(rate.amount)
  }
  for (const rate of rates.extra) {
    lookup.extra[rate.name] = parseFloat(rate.amount)
  }
  for (const rate of rates.other) {
    lookup.other[rate.name] = parseFloat(rate.amount)
  }
  
  return lookup
}
