import { NextResponse } from "next/server"
import { auth, currentUser } from "@clerk/nextjs/server"
import { logAuditAction } from "@/lib/admin-auth"
import { getRequestAuditMeta } from "@/lib/audit-log"
import {
  getRegistrationPreviewSettings,
  setExpressRegistrationPreviewEnabled,
  setRegistrationTestEnabled,
} from "@/lib/registration-settings"

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
    const role = await getAdminRole()
    if (!role) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const settings = await getRegistrationPreviewSettings()
    return NextResponse.json(settings)
  } catch (error) {
    console.error("[admin/registration/status] GET error:", error)
    return NextResponse.json({ error: "Failed to load registration settings" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const role = await getAdminRole()
    if (role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const body = await request.json()
    const before = await getRegistrationPreviewSettings()
    const { ipAddress, userAgent } = getRequestAuditMeta(request)
    const user = await currentUser()
    const adminEmail = user?.emailAddresses[0]?.emailAddress || "admin"

    if (typeof body.testRegistrationEnabled === "boolean") {
      await setRegistrationTestEnabled(body.testRegistrationEnabled)
      await logAuditAction(
        adminEmail,
        body.testRegistrationEnabled ? "enable_registration_test" : "disable_registration_test",
        "registration",
        undefined,
        {
          from: { enabled: before.testRegistrationEnabled },
          to: { enabled: body.testRegistrationEnabled },
        },
        ipAddress,
        userAgent,
      )
    }

    if (typeof body.expressRegistrationPreviewEnabled === "boolean") {
      await setExpressRegistrationPreviewEnabled(body.expressRegistrationPreviewEnabled)
      await logAuditAction(
        adminEmail,
        body.expressRegistrationPreviewEnabled
          ? "enable_express_registration_preview"
          : "disable_express_registration_preview",
        "registration",
        undefined,
        {
          from: { enabled: before.expressRegistrationPreviewEnabled },
          to: { enabled: body.expressRegistrationPreviewEnabled },
        },
        ipAddress,
        userAgent,
      )
    }

    const settings = await getRegistrationPreviewSettings()
    return NextResponse.json({ success: true, ...settings })
  } catch (error) {
    console.error("[admin/registration/status] POST error:", error)
    return NextResponse.json({ error: "Failed to update registration settings" }, { status: 500 })
  }
}
