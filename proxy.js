import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"

// Routes that require admin role
const isAdminRoute = createRouteMatcher(["/admin(.*)"])

// Routes that require any authenticated user
const isProtectedRoute = createRouteMatcher(["/registration(.*)"])

// Public routes that should never redirect
const isPublicRoute = createRouteMatcher([
  "/",
  "/schedule(.*)",
  "/about(.*)",
  "/biblebowl(.*)",
  "/faq(.*)",
  "/calculator(.*)",
  "/map2027(.*)",
  "/eod(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/login(.*)",
  "/auth-redirect(.*)",
  "/api(.*)",
  "/privacy(.*)",
])

export default clerkMiddleware(async (auth, request) => {
  const { userId, sessionClaims } = await auth()

  // Skip auth check for public routes
  if (isPublicRoute(request)) {
    return
  }

  // Admin routes require admin role in publicMetadata
  if (isAdminRoute(request)) {
    if (!userId) {
      return Response.redirect(new URL("/sign-in", request.url))
    }
    
    // Check for admin role in publicMetadata
    const role = sessionClaims?.metadata?.role
    if (role !== "admin") {
      return Response.redirect(new URL("/", request.url))
    }
  }

  // Registration requires login (any authenticated user)
  if (isProtectedRoute(request)) {
    if (!userId) {
      return Response.redirect(new URL("/sign-in", request.url))
    }
  }
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
}
