import { NextResponse } from "next/server"
import { isPublicCalculatorEnabled } from "@/lib/calculator-settings"

export const dynamic = "force-dynamic"

/** Public read-only — whether /calculator is live. */
export async function GET() {
  try {
    const enabled = await isPublicCalculatorEnabled()
    return NextResponse.json(
      { enabled },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    )
  } catch (error) {
    console.error("[calculator/status]", error)
    return NextResponse.json({ error: "Failed to fetch status" }, { status: 500 })
  }
}
