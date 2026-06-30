import { NextResponse } from "next/server"
import { buildCalculatorEstimate } from "@/lib/calculator-estimate"
import { fetchRatesByYear } from "@/lib/calculator-rates-db"
import type { CalculatorMember, LodgingType } from "@/lib/admin-calculator-cost"
import type { MemberAttendance } from "@/lib/calculator-schedule"

export const dynamic = "force-dynamic"

type EstimateBody = {
  year?: number
  members: CalculatorMember[]
  attendance: Record<string, MemberAttendance>
  lodgingType: LodgingType
  numNights: number
}

/** Server-side calculator — detects package from nights/meals and prices accordingly. */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as EstimateBody
    const year = body.year ?? 2027

    if (!Array.isArray(body.members) || !body.attendance || !body.lodgingType) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 })
    }

    const ratesData = await fetchRatesByYear(year)
    if (!ratesData) {
      return NextResponse.json({ error: "Rate chart not found" }, { status: 404 })
    }

    const estimate = buildCalculatorEstimate({
      members: body.members,
      attendance: body.attendance,
      lodgingType: body.lodgingType,
      numNights: body.numNights ?? 4,
      rates: ratesData.rates,
    })

    return NextResponse.json({
      year: ratesData.year,
      estimate,
    })
  } catch (error) {
    console.error("[calculator/estimate]", error)
    return NextResponse.json({ error: "Failed to calculate estimate" }, { status: 500 })
  }
}
