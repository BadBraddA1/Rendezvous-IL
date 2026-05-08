import { NextResponse } from "next/server"

const protectedRoutes = ["/admin"]
const publicRoutes = ["/admin/login", "/admin/auth", "/api/admin/auth"]

export async function proxy(request) {
  const { pathname } = request.nextUrl

  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route))

  if (isPublicRoute) {
    console.log("[v0] Public route, allowing access:", pathname)
    return NextResponse.next()
  }

  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route))

  if (isProtectedRoute) {
    const sessionCookie = request.cookies.get("admin_session")?.value
    console.log("[v0] Protected route check:", pathname)
    console.log("[v0] Session cookie:", sessionCookie)

    if (!sessionCookie || sessionCookie !== "authenticated") {
      console.log("[v0] No valid session, redirecting to login")
      const url = new URL("/admin/login", request.url)
      return NextResponse.redirect(url)
    }

    console.log("[v0] Valid session, allowing access")
    // Valid session, allow access
    const response = NextResponse.next()
    response.headers.set("X-Admin-Authenticated", "true")
    return response
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/admin/:path*"],
}
