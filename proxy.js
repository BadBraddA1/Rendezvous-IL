import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"

// Routes that require admin role
const isAdminRoute = createRouteMatcher(["/admin(.*)"])

// Routes that require any authenticated user
const isProtectedRoute = createRouteMatcher(["/registration(.*)"])

export default clerkMiddleware(async (auth, request) => {
  const { userId, sessionClaims } = await auth()

  // Admin routes require admin role in publicMetadata
  if (isAdminRoute(request)) {
    // Check if user is authenticated
    if (!userId) {
      return auth.redirectToSignIn()
    }
    
    // Check for admin role in publicMetadata
    const role = sessionClaims?.metadata?.role
    if (role !== "admin") {
      // Redirect non-admins to home page
      return Response.redirect(new URL("/", request.url))
    }
  }

  // Registration requires login (any authenticated user)
  if (isProtectedRoute(request)) {
    if (!userId) {
      return auth.redirectToSignIn()
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
