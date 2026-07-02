import { NextResponse } from "next/server"
import { auth, currentUser } from "@clerk/nextjs/server"
import { buildCalculatorFamilySeed, getPriorRegistration } from "@/lib/calculator-family-seed"
import { getFamilyByClerkId, resolveFamilyForUser, getFamilyMembers } from "@/lib/family-auth"

export const dynamic = "force-dynamic"

/** Signed-in family — prior registration seed for public calculator pre-fill. */
export async function GET(request: Request) {
  try {
    const { userId } = await auth({ acceptsToken: "session_token" })
    if (!userId) {
      return NextResponse.json({ authenticated: false })
    }

    // Fast path: already-linked families skip the Clerk currentUser() network call.
    let family = await getFamilyByClerkId(userId)
    if (!family) {
      const user = await currentUser()
      const email = user?.emailAddresses[0]?.emailAddress
      family = await resolveFamilyForUser(userId, email)
    }

    if (!family) {
      return NextResponse.json({
        authenticated: true,
        linked: false,
      })
    }

    const { searchParams } = new URL(request.url)
    const targetYear = Number(searchParams.get("year") ?? "2027")

    const [profileMembers, prior] = await Promise.all([
      getFamilyMembers(family.id),
      family.email ? getPriorRegistration(family.email, targetYear, family.id) : Promise.resolve(null),
    ])

    const seed = family.email
      ? await buildCalculatorFamilySeed({
          familyEmail: family.email,
          familyId: family.id,
          profileMembers,
          targetYear,
          prior,
        })
      : null

    return NextResponse.json({
      authenticated: true,
      linked: true,
      family: {
        id: family.id,
        lastName: family.family_last_name,
        email: family.email,
      },
      profileMemberCount: profileMembers.length,
      priorRegistration: seed,
    })
  } catch (error) {
    console.error("Error fetching family calculator data:", error)
    return NextResponse.json({ error: "Failed to fetch family data" }, { status: 500 })
  }
}
