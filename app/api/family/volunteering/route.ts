import { NextResponse } from "next/server"
import { authUserContext } from "@/lib/clerk-auth"
import { resolveFamilyForUser } from "@/lib/family-auth"
import {
  getFamilyVolunteering,
  hasVolunteeringContent,
} from "@/lib/family-volunteering"

export const dynamic = "force-dynamic"

/**
 * Signed-in family's volunteering for an event year:
 * confirmed worship slots, lesson topics, pending lesson-bid actions,
 * and name-matched special assignments. Empty when nothing applies.
 */
export async function GET(request: Request) {
  try {
    const ctx = await authUserContext(request)
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const family = await resolveFamilyForUser(ctx.userId, ctx.email)
    if (!family) {
      return NextResponse.json(
        {
          error:
            "No family profile found for this account. Open Family account on the website once to link your registration.",
        },
        { status: 404 },
      )
    }

    const { searchParams } = new URL(request.url)
    const payload = await getFamilyVolunteering(family, searchParams.get("year"))
    return NextResponse.json({
      ...payload,
      hasContent: hasVolunteeringContent(payload),
    })
  } catch (error) {
    console.error("[family/volunteering] GET error:", error)
    return NextResponse.json({ error: "Failed to load volunteering" }, { status: 500 })
  }
}
