import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"

// Define protected routes - all admin routes require authentication
const isProtectedRoute = createRouteMatcher(["/admin(.*)"])

// Define public routes that should never be protected
const isPublicRoute = createRouteMatcher([
  "/",
  "/about(.*)",
  "/schedule(.*)",
  "/lodging(.*)",
  "/faq(.*)",
  "/register(.*)",
  "/biblebowl(.*)",
  "/privacy(.*)",
  "/map2027(.*)",
  "/live-updates(.*)",
  "/api/register(.*)",
  "/api/contact(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
])

export default clerkMiddleware(async (auth, req) => {
  // Protect admin routes
  if (isProtectedRoute(req)) {
    await auth.protect()
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
