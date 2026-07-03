import { NextResponse } from "next/server"
import { getCurrentAdmin, getAdminPermissions, isAuthenticated } from "@/lib/clerk-auth"

export const dynamic = "force-dynamic"

/** Clerk session probe for native apps — requires Bearer session token. */
export async function GET(request: Request) {
  const authenticated = await isAuthenticated(request)
  const admin = await getCurrentAdmin(request)

  return NextResponse.json({
    authenticated,
    admin,
    permissions: admin ? getAdminPermissions(admin.role) : null,
  })
}
