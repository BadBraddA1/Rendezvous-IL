import { headers } from "next/headers"
import { getCurrentAdmin } from "@/lib/clerk-auth"
import { getCurrentFamily } from "@/lib/family-auth"
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

/** Signed-in admin with a linked family can save express registration prefs. */
export async function canAccessExpressRegistrationPreview(): Promise<boolean> {
  if (!(await isExpressRegistrationPreviewEnabled())) return false

  const admin = await getCurrentAdmin()
  if (!admin) return false

  const family = await getCurrentFamily()
  return !!family
}
