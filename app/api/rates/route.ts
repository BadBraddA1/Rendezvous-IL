import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const year = searchParams.get("year")
    
    let rateChart
    
    if (year) {
      // Get specific year
      const charts = await sql`
        SELECT * FROM rate_charts WHERE year = ${parseInt(year)} LIMIT 1
      `
      rateChart = charts[0]
    } else {
      // Get active year
      const charts = await sql`
        SELECT * FROM rate_charts WHERE is_active = true LIMIT 1
      `
      rateChart = charts[0]
    }
    
    if (!rateChart) {
      return NextResponse.json({ error: "No rate chart found" }, { status: 404 })
    }
    
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
    
    // Determine which registration fee to use based on deadline
    let registrationFee = 0
    let isLateRegistration = false
    
    if (groupedRates.registration) {
      const earlyFee = groupedRates.registration.find(r => r.name === "early_registration")
      const lateFee = groupedRates.registration.find(r => r.name === "late_registration")
      
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
        // No deadline set, use early fee
        registrationFee = earlyFee ? parseFloat(earlyFee.amount) : 0
      }
    }
    
    return NextResponse.json({
      rateChart,
      rates: groupedRates,
      allRates: rates,
      registrationFee,
      isLateRegistration,
      earlyRegDeadline: rateChart.early_reg_deadline
    })
  } catch (error) {
    console.error("Error fetching rates:", error)
    return NextResponse.json({ error: "Failed to fetch rates" }, { status: 500 })
  }
}
