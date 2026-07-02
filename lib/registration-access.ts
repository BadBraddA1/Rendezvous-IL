import { headers } from "next/headers"
import { getCurrentAdmin } from "@/lib/clerk-auth"
import { isLocalhostHost } from "@/lib/page-tour"
import {
  isExpressRegistrationPreviewEnabled,
  isRegistrationTestEnabled,
} from "@/lib/registration-settings"

/** True when running `pnpm dev` on localhost — skips Clerk + admin toggle for test registration. */
export async function isLocalRegistrationTestBypass(): Promise<boolean> {
  if (process.env.NODE_ENV !== "development") return false
  const host = (await headers()).get("host") ?? ""
  const hostname = host.split(":")[0]?.toLowerCase() ?? ""
  return isLocalhostHost(hostname)
}

/** Admin test registration page + POST /api/registration while preview is enabled. */
export async function canAccessRegistrationTest(): Promise<boolean> {
  if (await isLocalRegistrationTestBypass()) return true

  const admin = await getCurrentAdmin()
  if (!admin) return false
  return isRegistrationTestEnabled()
}

/**
 * Toggle on + signed-in admin. Deliberately does NOT require a linked family:
 * the page auto-links the family by email after this gate, and the API routes
 * check for a family themselves — requiring one here made the page claim the
 * preview was off for admins who simply hadn't been linked yet.
 */
export async function canAccessExpressRegistrationPreview(): Promise<boolean> {
  if (!(await isExpressRegistrationPreviewEnabled())) return false
  return !!(await getCurrentAdmin())
}
