import { NextResponse } from "next/server"
import { listAttendedYears } from "@/lib/attended-years"
import { listMemberChatChannels } from "@/lib/chat/channels"
import { authUserContext, getCurrentAdmin } from "@/lib/clerk-auth"
import { getEnabledDirectoryYears } from "@/lib/directory-settings"
import { resolveFamilyForUser } from "@/lib/family-auth"
import { userHasRegistrationForYear } from "@/lib/family-directory"
import { parseRegistrationEventYear } from "@/lib/registration-event-years"

export const dynamic = "force-dynamic"

/**
 * Diagnostic probe for the native app — shows what the server sees for this Bearer token.
 * No secrets; safe to call from the signed-in app.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization") || request.headers.get("Authorization")
  const hasBearer = Boolean(authHeader?.toLowerCase().startsWith("bearer "))

  const ctx = await authUserContext(request)
  if (!ctx) {
    return NextResponse.json(
      {
        authenticated: false,
        hasBearer,
        error: "Could not authenticate Bearer session token",
      },
      { status: 401 },
    )
  }

  const admin = await getCurrentAdmin(request)
  const attendedYears = await listAttendedYears(ctx.userId, ctx.email)
  const channels = await listMemberChatChannels(ctx.userId, ctx.email, Boolean(admin))
  const directoryYears = await getEnabledDirectoryYears()
  const family = await resolveFamilyForUser(ctx.userId, ctx.email)

  const directoryAccess: Record<string, boolean> = {}
  for (const year of directoryYears) {
    directoryAccess[String(year)] = await userHasRegistrationForYear(
      ctx.userId,
      ctx.email,
      parseRegistrationEventYear(year),
    )
  }

  return NextResponse.json({
    authenticated: true,
    hasBearer,
    userId: ctx.userId,
    email: ctx.email ?? null,
    isAdmin: Boolean(admin),
    adminRole: admin?.role ?? null,
    attendedYears,
    channelCount: channels.length,
    channelIds: channels.map((c) => c.id),
    directoryYears,
    directoryAccess,
    hasFamilyProfile: Boolean(family),
    familyId: family?.id ?? null,
  })
}
