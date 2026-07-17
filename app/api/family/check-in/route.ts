import { NextResponse } from "next/server"
import { authUserContext } from "@/lib/clerk-auth"
import { resolveFamilyForUser } from "@/lib/family-auth"
import { getFamilyCheckIn } from "@/lib/family-check-in"

export const dynamic = "force-dynamic"

/**
 * Signed-in family's check-in / lodging status for an event year.
 * Always 200 when authenticated — Home shows empty state when not registered.
 */
export async function GET(request: Request) {
  try {
    const ctx = await authUserContext(request)
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const family = await resolveFamilyForUser(ctx.userId, ctx.email)
    const { searchParams } = new URL(request.url)
    const payload = await getFamilyCheckIn(family, searchParams.get("year"))
    return NextResponse.json(payload)
  } catch (error) {
    console.error("[family/check-in] GET error:", error)
    return NextResponse.json({ error: "Failed to load check-in status" }, { status: 500 })
  }
}
