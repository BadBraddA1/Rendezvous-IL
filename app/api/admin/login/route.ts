import { type NextRequest, NextResponse } from "next/server"
import { createSession } from "@/lib/auth"

const ADMIN_USERS = [
  { email: "adin@braddcorp.com", password: "Soapbox12!", fullName: "Adin Bradd", role: "admin" },
  { email: "stephen@bradd.us", password: "Soapbox1", fullName: "Stephen Bradd", role: "admin" },
]

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()
    console.log("[v0] Login attempt:", email)

    const normalizedEmail = email.toLowerCase()
    const admin = ADMIN_USERS.find((u) => u.email === normalizedEmail && u.password === password)

    if (!admin) {
      console.log("[v0] Login failed - invalid credentials")
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    console.log("[v0] Admin found:", admin.email)

    const token = await createSession({
      email: admin.email,
      role: admin.role,
      fullName: admin.fullName,
    })

    console.log("[v0] Token created, setting cookie...")

    const response = NextResponse.json({
      success: true,
      admin: {
        email: admin.email,
        role: admin.role,
        fullName: admin.fullName,
      },
    })

    response.cookies.set({
      name: "admin_session",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 24 hours
      path: "/",
    })

    console.log("[v0] Cookie set, returning response")
    return response
  } catch (error) {
    console.error("[v0] Login error:", error)
    return NextResponse.json({ error: "Login failed" }, { status: 500 })
  }
}
