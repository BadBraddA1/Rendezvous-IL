import { NextResponse } from "next/server"
import { authUserContext } from "@/lib/clerk-auth"
import { resolveFamilyForUser } from "@/lib/family-auth"
import { getYearHub } from "@/lib/year-hub"

export const dynamic = "force-dynamic"

/**
 * Signed-in family's season hub for an event year (default 2027).
 * Always 200 when authenticated — clients show register CTA when not registered.
 */
export async function GET(request: Request) {
  try {
    const ctx = await authUserContext(request)
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const family = await resolveFamilyForUser(ctx.userId, ctx.email)
    const { searchParams } = new URL(request.url)
    const payload = await getYearHub(family, searchParams.get("year"))
    return NextResponse.json(payload)
  } catch (error) {
    console.error("[family/year-hub] GET error:", error)
    return NextResponse.json({ error: "Failed to load year hub" }, { status: 500 })
  }
}
