import { sql } from "@/lib/db"

async function fetchRatesForChart(chart: { id: number; year: number }) {
  const rates = await sql`
    SELECT * FROM rates
    WHERE rate_chart_id = ${chart.id}
    ORDER BY category, sort_order
  `

  const ratesByCategory: Record<string, typeof rates> = {}
  for (const rate of rates) {
    if (!ratesByCategory[rate.category]) {
      ratesByCategory[rate.category] = []
    }
    ratesByCategory[rate.category].push(rate)
  }

  return {
    year: chart.year,
    chartId: chart.id,
    rates: ratesByCategory,
  }
}

export async function fetchRatesByYear(year: number) {
  const charts = await sql`
    SELECT * FROM rate_charts WHERE year = ${year} LIMIT 1
  `

  if (charts.length === 0) {
    return null
  }

  return fetchRatesForChart(charts[0])
}

/** Prefer event year, then any active rate chart (public calculator). */
export async function fetchCalculatorRates(preferredYear = 2027) {
  const byYear = await fetchRatesByYear(preferredYear)
  if (byYear) return byYear

  const active = await sql`
    SELECT * FROM rate_charts WHERE is_active = true LIMIT 1
  `
  if (active.length === 0) return null

  return fetchRatesForChart(active[0])
}
