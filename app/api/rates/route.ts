import { NextResponse } from "next/server"
import { sql, type SqlRow } from "@/lib/db"

export const dynamic = "force-dynamic"

/**
 * Serialize rates for iOS/Android clients.
 * Native apps decode `amount` as String and `is_active` as Bool — raw SQL
 * often returns numbers/0|1, which breaks Codable and shows “Rates unavailable”.
 */
function serializeRate(row: SqlRow) {
  return {
    id: Number(row.id),
    rate_chart_id: Number(row.rate_chart_id),
    category: String(row.category ?? ""),
    name: String(row.name ?? ""),
    label: String(row.label ?? ""),
    amount: String(row.amount ?? "0"),
    description: row.description != null ? String(row.description) : null,
    sort_order: Number(row.sort_order ?? 0),
    created_at: row.created_at != null ? String(row.created_at) : null,
    updated_at: row.updated_at != null ? String(row.updated_at) : null,
  }
}

function serializeRateChart(row: SqlRow) {
  return {
    id: Number(row.id),
    year: Number(row.year),
    is_active: Number(row.is_active) === 1 || row.is_active === true,
    created_at: row.created_at != null ? String(row.created_at) : null,
    updated_at: row.updated_at != null ? String(row.updated_at) : null,
    early_reg_deadline:
      row.early_reg_deadline != null ? String(row.early_reg_deadline) : null,
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const year = searchParams.get("year")

    let rateChartRow: SqlRow | undefined

    if (year) {
      const charts = await sql`
        SELECT * FROM rate_charts WHERE year = ${parseInt(year, 10)} LIMIT 1
      `
      rateChartRow = charts[0]
    } else {
      const charts = await sql`
        SELECT * FROM rate_charts WHERE is_active = true LIMIT 1
      `
      rateChartRow = charts[0]
    }

    if (!rateChartRow) {
      return NextResponse.json({ error: "No rate chart found" }, { status: 404 })
    }

    const rateChart = serializeRateChart(rateChartRow)

    const rateRows = await sql`
      SELECT * FROM rates
      WHERE rate_chart_id = ${rateChart.id}
      ORDER BY category, sort_order
    `

    const rates = rateRows.map(serializeRate)

    const groupedRates: Record<string, ReturnType<typeof serializeRate>[]> = {}
    for (const rate of rates) {
      if (!groupedRates[rate.category]) {
        groupedRates[rate.category] = []
      }
      groupedRates[rate.category].push(rate)
    }

    let registrationFee = 0
    let isLateRegistration = false

    if (groupedRates.registration) {
      const earlyFee = groupedRates.registration.find((r) => r.name === "early_registration")
      const lateFee = groupedRates.registration.find((r) => r.name === "late_registration")

      if (rateChart.early_reg_deadline) {
        const deadline = new Date(rateChart.early_reg_deadline)
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        if (today > deadline) {
          isLateRegistration = true
          registrationFee = lateFee ? parseFloat(lateFee.amount) : 0
        } else {
          registrationFee = earlyFee ? parseFloat(earlyFee.amount) : 0
        }
      } else {
        registrationFee = earlyFee ? parseFloat(earlyFee.amount) : 0
      }
    }

    return NextResponse.json({
      rateChart,
      rates: groupedRates,
      allRates: rates,
      registrationFee,
      isLateRegistration,
      earlyRegDeadline: rateChart.early_reg_deadline,
    })
  } catch (error) {
    console.error("Error fetching rates:", error)
    return NextResponse.json({ error: "Failed to fetch rates" }, { status: 500 })
  }
}
