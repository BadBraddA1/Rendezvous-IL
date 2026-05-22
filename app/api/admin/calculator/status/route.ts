import { NextResponse } from "next/server"
import { auth, currentUser } from "@clerk/nextjs/server"
import { sql } from "@/lib/db"

// Force dynamic to prevent build-time database connection
export const dynamic = "force-dynamic"

type AdminRole = "admin" | "editor" | "viewer"

async function getAdminInfo() {
  const { userId } = await auth()
  if (!userId) return null

  const user = await currentUser()
  if (!user) return null

  const publicMetadata = user.publicMetadata as { role?: string } | undefined
  const role = publicMetadata?.role as AdminRole | undefined

  if (!role || !["admin", "editor", "viewer"].includes(role)) {
    return null
  }

  return { role: role as AdminRole }
}

// GET - Fetch current calculator status
export async function GET() {
  try {
    const result = await sql`
      SELECT value FROM app_settings WHERE key = 'public_calculator_enabled'
    `
    
    const enabled = result[0]?.value === "true"
    
    return NextResponse.json({ enabled })
  } catch (error) {
    console.error("Error fetching calculator status:", error)
    return NextResponse.json({ error: "Failed to fetch status" }, { status: 500 })
  }
}

// POST - Toggle calculator status (admin only)
export async function POST(request: Request) {
  try {
    const admin = await getAdminInfo()
    
    if (!admin || admin.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const { enabled } = await request.json()
    
    await sql`
      INSERT INTO app_settings (key, value, updated_at)
      VALUES ('public_calculator_enabled', ${enabled ? "true" : "false"}, NOW())
      ON CONFLICT (key) DO UPDATE SET value = ${enabled ? "true" : "false"}, updated_at = NOW()
    `

    return NextResponse.json({ success: true, enabled })
  } catch (error) {
    console.error("Error updating calculator status:", error)
    return NextResponse.json({ error: "Failed to update status" }, { status: 500 })
  }
}
