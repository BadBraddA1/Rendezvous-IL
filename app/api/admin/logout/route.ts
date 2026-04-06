import { NextResponse } from "next/server"
import { clearSession, getSession, logAuditAction } from "@/lib/auth"

export async function POST(req: Request) {
  try {
    const session = await getSession()

    if (session) {
      // Log logout action before clearing session
      await logAuditAction(session.email, "admin_logout", "session", undefined, undefined, req)
    }

    // Clear the session cookie
    await clearSession()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Logout error:", error)
    return NextResponse.json({ error: "Logout failed" }, { status: 500 })
  }
}
