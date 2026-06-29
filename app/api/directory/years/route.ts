import { NextResponse } from "next/server"
import { getEnabledDirectoryYears } from "@/lib/directory-settings"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const years = await getEnabledDirectoryYears()
    return NextResponse.json({ years })
  } catch (error) {
    console.error("[directory/years] GET error:", error)
    return NextResponse.json({ years: [2026] })
  }
}
