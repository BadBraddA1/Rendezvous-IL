import { getCurrentAdmin } from "@/lib/clerk-auth"
import { getCurrentFamily } from "@/lib/family-auth"
import {
  isExpressRegistrationPreviewEnabled,
  isRegistrationTestEnabled,
} from "@/lib/registration-settings"

/** Admin test registration page + POST /api/registration while preview is enabled. */
export async function canAccessRegistrationTest(): Promise<boolean> {
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
