import { clerkClient } from "@clerk/nextjs/server"
import { sql } from "@/lib/db"
import { isAdminRole, type AdminRole } from "@/lib/admin-permissions"
import { defaultApnsEnvironment, isApnsConfigured, sendApnsAlerts } from "@/lib/apns"
import { isFcmConfigured, isPermanentFcmTokenFailure, sendFcmAlerts } from "@/lib/fcm"
import { ensurePushSchema } from "@/lib/push-schema"
import type { RegistrationData } from "@/types/registration"

/** Staff roles that should hear about new registrations (not check-in-only). */
const REGISTRATION_NOTIFY_ROLES: AdminRole[] = ["admin", "editor", "viewer"]

let cachedStaffIds: { at: number; ids: string[] } | null = null
const STAFF_CACHE_MS = 5 * 60 * 1000

async function listRegistrationStaffClerkIds(): Promise<string[]> {
  const now = Date.now()
  if (cachedStaffIds && now - cachedStaffIds.at < STAFF_CACHE_MS) {
    return cachedStaffIds.ids
  }

  // Optional override: comma-separated Clerk user ids (fast path / pin specific phones).
  const fromEnv = (process.env.REGISTRATION_ADMIN_PUSH_USER_IDS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
  if (fromEnv.length > 0) {
    cachedStaffIds = { at: now, ids: fromEnv }
    return fromEnv
  }

  const clerk = await clerkClient()
  const ids: string[] = []
  let offset = 0
  const limit = 100

  while (true) {
    const response = await clerk.users.getUserList({ limit, offset, orderBy: "-created_at" })
    for (const user of response.data) {
      const role = (user.publicMetadata as { role?: string } | undefined)?.role
      if (isAdminRole(role) && REGISTRATION_NOTIFY_ROLES.includes(role)) {
        ids.push(user.id)
      }
    }
    if (response.data.length < limit) break
    offset += limit
    if (offset > 2000) break
  }

  cachedStaffIds = { at: now, ids }
  return ids
}

/**
 * Push staff phones when a family registers — replaces the old admin email blast.
 * Best-effort; never throws into the registration submit path.
 */
export async function notifyAdminsNewRegistration(input: {
  registrationId: number
  data: Pick<RegistrationData, "familyLastName" | "email" | "scholarshipRequested">
  source?: "test" | "express"
}): Promise<void> {
  try {
    await ensurePushSchema()
    const recipients = await listRegistrationStaffClerkIds()
    if (recipients.length === 0) {
      console.warn("[registration/notify] no staff Clerk ids for push")
      return
    }

    const family = input.data.familyLastName?.trim() || "Family"
    const memberHint = input.data.email?.trim() ? ` · ${input.data.email.trim()}` : ""
    const scholarship = input.data.scholarshipRequested ? " · scholarship requested" : ""
    const source =
      input.source === "express" ? "Express registration" : "New registration"

    const title = `${source}`
    const body = `${family} family (#${input.registrationId})${scholarship}${memberHint}`.slice(
      0,
      160,
    )
    const webUrl = `https://rendezvousil.com/admin/registrations?year=2027&search=${encodeURIComponent(family)}`
    const deepLink = webUrl

    const placeholders = recipients.map(() => "?").join(", ")

    if (isApnsConfigured()) {
      const rows = await sql.query(
        `SELECT token FROM ios_device_tokens
         WHERE is_active = 1
           AND environment = ?
           AND clerk_user_id IN (${placeholders})`,
        [defaultApnsEnvironment(), ...recipients],
      )
      const tokens = rows.map((r) => String(r.token)).filter(Boolean)
      if (tokens.length > 0) {
        const results = await sendApnsAlerts(tokens, {
          title,
          body,
          url: deepLink,
          threadId: "rendezvous-registrations",
        })
        for (const f of results.filter((r) => !r.success)) {
          if (f.reason?.includes("BadDeviceToken") || f.reason?.includes("Unregistered")) {
            await sql`UPDATE ios_device_tokens SET is_active = 0 WHERE token = ${f.deviceToken}`
          }
        }
      }
    }

    if (isFcmConfigured()) {
      const rows = await sql.query(
        `SELECT token FROM android_device_tokens
         WHERE is_active = 1
           AND clerk_user_id IN (${placeholders})`,
        [...recipients],
      )
      const tokens = rows.map((r) => String(r.token)).filter(Boolean)
      if (tokens.length > 0) {
        const results = await sendFcmAlerts(tokens, {
          title,
          body,
          url: webUrl,
        })
        for (const f of results.filter((r) => !r.success)) {
          if (isPermanentFcmTokenFailure(f.reason)) {
            await sql`UPDATE android_device_tokens SET is_active = 0 WHERE token = ${f.deviceToken}`
          }
        }
      }
    }
  } catch (error) {
    console.error("[registration/notify] push failed:", error)
  }
}
