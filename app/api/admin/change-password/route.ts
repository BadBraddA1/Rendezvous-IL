import { type NextRequest, NextResponse } from "next/server"
import { hashPassword, verifyPassword, logAuditAction } from "@/lib/auth"
import { jwtVerify, SignJWT } from "jose"
import { sql } from "@/lib/db"

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "your-secret-key-change-in-production")

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("admin_session")?.value

    if (!token) {
      return NextResponse.json({ error: "Unauthorized - No session token" }, { status: 401 })
    }

    let session
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET)
      session = payload
    } catch (error) {
      return NextResponse.json({ error: "Unauthorized - Invalid session" }, { status: 401 })
    }

    const { currentPassword, newPassword } = await req.json()

    // Validate new password
    if (!newPassword || newPassword.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 })
    }

    // Get current admin user
    const [admin] = await sql`
      SELECT * FROM admin_users WHERE email = ${session.email}
    `

    if (!admin) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Verify current password
    const isValid = await verifyPassword(currentPassword, admin.password_hash)
    if (!isValid) {
      await logAuditAction(
        session.email as string,
        "password_change_failed",
        "admin_user",
        admin.id,
        { reason: "Invalid current password" },
        req,
      )
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 401 })
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword)

    // Update password and clear must_change_password flag
    await sql`
      UPDATE admin_users 
      SET password_hash = ${newPasswordHash}, 
          must_change_password = false,
          updated_at = CURRENT_TIMESTAMP
      WHERE email = ${session.email}
    `

    const newToken = await new SignJWT({
      email: admin.email,
      role: admin.role,
      mustChangePassword: false,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("8h")
      .sign(JWT_SECRET)

    // Set the new session cookie
    const response = NextResponse.json({ success: true })
    response.cookies.set("admin_session", newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 8, // 8 hours
      path: "/",
    })

    // Log password change
    await logAuditAction(session.email as string, "password_changed", "admin_user", admin.id, undefined, req)

    return response
  } catch (error) {
    console.error("[v0] Password change error:", error)
    return NextResponse.json({ error: "Failed to change password" }, { status: 500 })
  }
}
