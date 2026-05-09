import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"

// Define protected routes
const isAdminRoute = createRouteMatcher(["/admin(.*)"])
const isAccountRoute = createRouteMatcher(["/account(.*)"])

export default clerkMiddleware(async (auth, req) => {
  // Protect admin routes - require authentication
  if (isAdminRoute(req)) {
    await auth.protect()
  }

  // Protect account routes - require authentication
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
