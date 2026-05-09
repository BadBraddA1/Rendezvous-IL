import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"

// Only protect account routes at the middleware level
// Admin routes handle their own auth to avoid redirect loops
const isAccountRoute = createRouteMatcher(["/account(.*)"])

export default clerkMiddleware(async (auth, req) => {
  // Only require auth for account routes
  // Admin pages handle their own auth checks in-page
  if (isAccountRoute(req)) {
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
