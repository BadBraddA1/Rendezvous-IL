import { clerkMiddleware } from "@clerk/nextjs/server"

// Use basic clerkMiddleware without custom logic
// Auth protection is handled in individual pages/layouts
export default clerkMiddleware()

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
    // Clerk internal routes
    "/__clerk/(.*)",
  ],
}
