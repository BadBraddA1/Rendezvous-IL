import { type NextRequest, NextResponse } from "next/server"
import { checkAdminAuth, logAuditAction } from "@/lib/admin-auth"
import { getRequestAuditMeta } from "@/lib/audit-log"
import { sql } from "@/lib/db"

export async function GET() {
  const admin = await checkAdminAuth()
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const settings = await sql`SELECT * FROM system_settings`

    const settingsObj: any = {}
    settings.forEach((s) => {
      settingsObj[s.setting_key] = s.setting_value
    })

    return NextResponse.json(settingsObj)
  } catch (error) {
    console.error("[v0] Settings fetch error:", error)
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  const admin = await checkAdminAuth()
  if (!admin || admin.role === "viewer") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const settings = await req.json()

    for (const [key, value] of Object.entries(settings)) {
      await sql`
        UPDATE system_settings
        SET setting_value = ${value as string}, updated_by = ${admin.email}, updated_at = NOW()
        WHERE setting_key = ${key}
      `
    }

    const { ipAddress, userAgent } = getRequestAuditMeta(req)
    await logAuditAction(admin.email, "update_settings", "system_settings", undefined, settings, ipAddress, userAgent)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Settings update error:", error)
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 })
  }
}
