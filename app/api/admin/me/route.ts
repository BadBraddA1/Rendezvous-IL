import { NextResponse } from "next/server"
import { getCurrentAdmin, getAdminPermissions, isAuthenticated } from "@/lib/clerk-auth"
import { permissionsRecord } from "@/lib/admin-dash-permissions"

export const dynamic = "force-dynamic"

/**
 * Clerk session probe for native apps (Bearer) + staff payload for the new web admin shell.
 * Keep `authenticated` / `admin` / `permissions` for iOS/Android; `staff` / `prefs` for AdminShell.
 */
export async function GET(request: Request) {
  const authenticated = await isAuthenticated(request)
  const admin = await getCurrentAdmin(request)

  return NextResponse.json({
    authenticated,
    admin,
    permissions: admin ? getAdminPermissions(admin.role) : null,
    staff: admin
      ? {
          role: admin.role,
          directedSessions: [] as string[],
          email: admin.email,
          fullName: admin.fullName,
          permissions: permissionsRecord(admin.role),
        }
      : null,
    prefs: { views: {} },
  })
}
