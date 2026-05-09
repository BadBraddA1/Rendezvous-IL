import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getCurrentAdmin } from "@/lib/clerk-auth"

export async function GET() {
  try {
    const admin = await getCurrentAdmin()
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const rateCharts = await sql`
      SELECT * FROM rate_charts ORDER BY year DESC
    `

    const chartsWithRates = await Promise.all(
      rateCharts.map(async (chart) => {
        const rates = await sql`
          SELECT * FROM rates 
          WHERE rate_chart_id = ${chart.id}
          ORDER BY category, sort_order
        `
        return { ...chart, rates }
      })
    )

    return NextResponse.json({ rateCharts: chartsWithRates })
  } catch (error) {
    console.error("Error fetching rate charts:", error)
    return NextResponse.json({ error: "Failed to fetch rate charts" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const admin = await getCurrentAdmin()
    if (!admin || admin.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { action, year, rateId, amount, copyFromYear, setActive } = body

    if (action === "create_year") {
      // Create new year's rate chart
      const existing = await sql`
        SELECT id FROM rate_charts WHERE year = ${year}
      `
      if (existing.length > 0) {
        return NextResponse.json({ error: "Year already exists" }, { status: 400 })
      }

      const [newChart] = await sql`
        INSERT INTO rate_charts (year, is_active) 
        VALUES (${year}, false) 
        RETURNING id
      `

      if (copyFromYear) {
        // Copy rates from another year
        const sourceChart = await sql`
          SELECT id FROM rate_charts WHERE year = ${copyFromYear}
        `
        if (sourceChart.length > 0) {
          await sql`
            INSERT INTO rates (rate_chart_id, category, name, label, amount, description, sort_order)
            SELECT ${newChart.id}, category, name, label, amount, description, sort_order
            FROM rates WHERE rate_chart_id = ${sourceChart[0].id}
          `
        }
      }

      return NextResponse.json({ success: true, chartId: newChart.id })
    }

    if (action === "update_rate") {
      await sql`
        UPDATE rates SET amount = ${amount}, updated_at = NOW()
        WHERE id = ${rateId}
      `
      return NextResponse.json({ success: true })
    }

    if (action === "set_active") {
      // Deactivate all, then activate the selected year
      await sql`UPDATE rate_charts SET is_active = false`
      await sql`UPDATE rate_charts SET is_active = true WHERE year = ${year}`
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("Error managing rates:", error)
    return NextResponse.json({ error: "Failed to manage rates" }, { status: 500 })
  }
}
