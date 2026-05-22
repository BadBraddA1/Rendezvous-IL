import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getCurrentAdmin } from "@/lib/clerk-auth"

export async function GET(request: Request) {
  try {
    const admin = await getCurrentAdmin()
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const year = searchParams.get("year") || "2027"

    // Get the rate chart for the specified year
    const rateCharts = await sql`
      SELECT * FROM rate_charts WHERE year = ${parseInt(year)}
    `

    if (rateCharts.length === 0) {
      return NextResponse.json({ error: "Rate chart not found" }, { status: 404 })
    }

    const chart = rateCharts[0]

    // Get all rates for this chart, organized by category
    const rates = await sql`
      SELECT * FROM rates 
      WHERE rate_chart_id = ${chart.id}
      ORDER BY category, sort_order
    `

    // Group rates by category
    const ratesByCategory: Record<string, typeof rates> = {}
    for (const rate of rates) {
      if (!ratesByCategory[rate.category]) {
        ratesByCategory[rate.category] = []
      }
      ratesByCategory[rate.category].push(rate)
    }

    return NextResponse.json({
      year: chart.year,
      chartId: chart.id,
      rates: ratesByCategory,
    })
  } catch (error) {
    console.error("Error fetching calculator rates:", error)
    return NextResponse.json({ error: "Failed to fetch rates" }, { status: 500 })
  }
}
