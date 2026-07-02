import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { getCalculatorPrefill, saveCalculatorPrefill } from "@/lib/calculator-prefill"
import { parseRegistrationEventYear } from "@/lib/registration-event-years"

export const dynamic = "force-dynamic"

/** Saved calculator family info, used to auto-populate the registration form. */
export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Sign in required" }, { status: 401 })

  try {
    const year = parseRegistrationEventYear(req.nextUrl.searchParams.get("year"))
    const prefill = await getCalculatorPrefill(userId, year)
    return NextResponse.json({ prefill })
  } catch (error) {
    console.error("[calculator/prefill] GET error:", error)
    return NextResponse.json({ error: "Failed to load saved info" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Sign in required" }, { status: 401 })

  try {
    const body = await req.json().catch(() => ({}))
    const year = parseRegistrationEventYear(body.year)
    const saved = await saveCalculatorPrefill(userId, year, body.prefill)
    if (!saved) {
      return NextResponse.json(
        { error: "Add at least one family member before saving" },
        { status: 400 },
      )
    }
    return NextResponse.json({ success: true, prefill: saved })
  } catch (error) {
    console.error("[calculator/prefill] POST error:", error)
    return NextResponse.json({ error: "Failed to save" }, { status: 500 })
  }
}
