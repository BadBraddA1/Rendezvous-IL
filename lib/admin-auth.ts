import { cookies } from "next/headers"

const ADMIN_USERS = [
  { email: "adin@braddcorp.com", fullName: "Adin Bradd", role: "admin" },
  { email: "stephen@bradd.us", fullName: "Stephen Bradd", role: "admin" },
]

export async function checkAdminAuth() {
  const cookieStore = await cookies()
  const adminSession = cookieStore.get("admin_session")

  console.log("[v0] Checking admin auth, cookie exists:", !!adminSession)
  console.log("[v0] Cookie value:", adminSession?.value)

  if (!adminSession || adminSession.value !== "authenticated") {
    console.log("[v0] No valid session cookie")
    return null
  }

  console.log("[v0] Valid session found, returning default admin")
  // Return the first admin user as the authenticated admin
  return ADMIN_USERS[0]
}

export async function logAuditAction(
  adminEmail: string,
  action: string,
  resourceType?: string,
  resourceId?: number,
  details?: any,
  ipAddress?: string,
  userAgent?: string,
) {
  console.log("[v0] Audit log:", { adminEmail, action, resourceType, resourceId, details })
}
