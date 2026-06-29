import { NextResponse } from "next/server"
import { auth, currentUser } from "@clerk/nextjs/server"
import {
  getDirectoryYearSettings,
  setDirectoryYearEnabled,
} from "@/lib/directory-settings"
import { logAuditAction } from "@/lib/admin-auth"
import { getRequestAuditMeta } from "@/lib/audit-log"
import {
  parseRegistrationEventYear,
  type RegistrationEventYear,
} from "@/lib/registration-event-years"

export const dynamic = "force-dynamic"

type AdminRole = "admin" | "editor" | "viewer" | "checkin"

async function getAdminRole(): Promise<AdminRole | null> {
  const { userId } = await auth()
  if (!userId) return null

  const user = await currentUser()
  const role = user?.publicMetadata?.role as AdminRole | undefined
  if (!role || !(role === "admin" || role === "editor" || role === "viewer" || role === "checkin")) {
    return null
  }
  return role
}

export async function GET() {
  try {
    const years = await getDirectoryYearSettings()
    return NextResponse.json({ years })
  } catch (error) {
    console.error("[admin/directory/status] GET error:", error)
    return NextResponse.json({ error: "Failed to load directory settings" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const role = await getAdminRole()
    if (role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const body = await request.json()
    const year = parseRegistrationEventYear(body.year)
    const enabled = Boolean(body.enabled)

    await setDirectoryYearEnabled(year as RegistrationEventYear, enabled)

    const user = await currentUser()
    const adminEmail = user?.emailAddresses[0]?.emailAddress || "admin"
    const { ipAddress, userAgent } = getRequestAuditMeta(request)
    await logAuditAction(
      adminEmail,
      enabled ? "enable_directory_year" : "disable_directory_year",
      "directory",
      year,
      { year, enabled },
      ipAddress,
      userAgent,
    )

    const years = await getDirectoryYearSettings()
    return NextResponse.json({ success: true, years })
  } catch (error) {
    console.error("[admin/directory/status] POST error:", error)
    return NextResponse.json({ error: "Failed to update directory settings" }, { status: 500 })
  }
}
