import { NextResponse } from "next/server"
import { hashPassword } from "@/lib/auth"
import { sql } from "@/lib/db"

// This endpoint creates the first admin user with a secure password
export async function POST(request: Request) {
  try {
    const { email, fullName, setupKey } = await request.json()

    if (setupKey !== process.env.ADMIN_SETUP_KEY) {
      return NextResponse.json({ error: "Invalid setup key" }, { status: 403 })
    }

    // Check if any admins already exist
    const existingAdmins = await sql`SELECT COUNT(*) as count FROM admin_users`
    if (existingAdmins[0].count > 0) {
      return NextResponse.json(
        { error: "Admin users already exist. Contact an existing admin to create new accounts." },
        { status: 400 },
      )
    }

    const defaultPassword = "12345678"
    const passwordHash = await hashPassword(defaultPassword)

    // Create the first admin user with hashed password and must_change_password flag
    const result = await sql`
      INSERT INTO admin_users (email, full_name, role, password_hash, must_change_password)
      VALUES (${email}, ${fullName}, 'admin', ${passwordHash}, true)
      RETURNING id, email, full_name, role, created_at
    `

    return NextResponse.json({
      success: true,
      message:
        "Admin user created successfully. Default password is '12345678'. You will be required to change it on first login.",
      admin: result[0],
    })
  } catch (error) {
    console.error("[v0] Admin setup error:", error)
    return NextResponse.json({ error: "Failed to create admin user" }, { status: 500 })
  }
}
