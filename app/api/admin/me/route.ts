import { NextResponse } from "next/server"
import { getCurrentAdmin, getAdminPermissions, isAuthenticated } from "@/lib/clerk-auth"

export const dynamic = "force-dynamic"

/** Clerk session probe for native apps — requires Bearer session token. */
export async function GET() {
  const authenticated = await isAuthenticated()
  const admin = await getCurrentAdmin()

  return NextResponse.json({
    authenticated,
    admin,
    permissions: admin ? getAdminPermissions(admin.role) : null,
  })
}
