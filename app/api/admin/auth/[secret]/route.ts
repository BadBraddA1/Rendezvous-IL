import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest, { params }: { params: Promise<{ secret: string }> }) {
  console.log("[v0] API route - Secret auth attempt")

  const { secret: providedSecret } = await params
  const expectedSecret = process.env.ADMIN_SECRET || "braddcorp-is-the-best"

  console.log("[v0] API route - Provided secret:", providedSecret)
  console.log("[v0] API route - Expected secret:", expectedSecret)

  if (providedSecret === expectedSecret) {
    console.log("[v0] API route - Valid secret, creating redirect response with cookie")

    // Create redirect response
    const response = NextResponse.redirect(new URL("/admin", request.url))

    // Set cookie in the redirect response
    response.cookies.set("admin_session", "authenticated", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 90, // 90 days
      path: "/",
    })

    console.log("[v0] API route - Cookie set in response, returning redirect")
    return response
  }

  console.log("[v0] API route - Invalid secret, redirecting to login")
  return NextResponse.redirect(new URL("/admin/login?error=invalid", request.url))
}
