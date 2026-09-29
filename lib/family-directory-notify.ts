/**
 * Push family members when staff updates their directory photo,
 * or nudge them to finish naming faces / completing the listing.
 */

import { sql } from "@/lib/db"
import { defaultApnsEnvironment, isApnsConfigured, sendApnsAlerts } from "@/lib/apns"
import { isFcmConfigured, isPermanentFcmTokenFailure, sendFcmAlerts } from "@/lib/fcm"
import { ensureFamilyMembershipSchema } from "@/lib/family-membership"
import { ensurePushSchema } from "@/lib/push-schema"

async function clerkIdsForFamily(familyId: number): Promise<string[]> {
  await ensureFamilyMembershipSchema()
  const ids: string[] = []

  const [family] = await sql`
    SELECT clerk_user_id FROM families WHERE id = ${familyId} LIMIT 1
  `
  if (family?.clerk_user_id) ids.push(String(family.clerk_user_id))

  try {
    const members = await sql`
      SELECT clerk_user_id FROM family_account_members
      WHERE family_id = ${familyId}
        AND clerk_user_id IS NOT NULL
        AND TRIM(clerk_user_id) != ''
    `
    for (const row of members) {
      if (row.clerk_user_id) ids.push(String(row.clerk_user_id))
    }
  } catch {
    // table may be missing on older DBs
  }

  return [...new Set(ids.filter(Boolean))]
}

async function pushToClerkIds(input: {
  clerkIds: string[]
  title: string
  body: string
  deepLink: string
  webUrl: string
}): Promise<{ recipients: number }> {
  if (input.clerkIds.length === 0) return { recipients: 0 }

  await ensurePushSchema()
  let recipients = 0
  const placeholders = input.clerkIds.map(() => "?").join(", ")

  if (isApnsConfigured()) {
    const rows = await sql.query(
      `SELECT token FROM ios_device_tokens
       WHERE is_active = 1
         AND environment = ?
         AND clerk_user_id IN (${placeholders})`,
      [defaultApnsEnvironment(), ...input.clerkIds],
    )
    const tokens = rows.map((r) => String(r.token)).filter(Boolean)
    if (tokens.length > 0) {
      const results = await sendApnsAlerts(tokens, {
        title: input.title,
        body: input.body,
        url: input.deepLink,
        threadId: "rendezvous-directory",
      })
      recipients += results.filter((r) => r.success).length
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
      [...input.clerkIds],
    )
    const tokens = rows.map((r) => String(r.token)).filter(Boolean)
    if (tokens.length > 0) {
      const results = await sendFcmAlerts(tokens, {
        title: input.title,
        body: input.body,
        url: input.webUrl,
      })
      recipients += results.filter((r) => r.success).length
      for (const f of results.filter((r) => !r.success)) {
        if (isPermanentFcmTokenFailure(f.reason)) {
          await sql`UPDATE android_device_tokens SET is_active = 0 WHERE token = ${f.deviceToken}`
        }
      }
    }
  }

  return { recipients }
}

/** After staff uploads a directory photo at the desk. */
export async function notifyFamilyDirectoryPhotoUploaded(familyId: number): Promise<{
  recipients: number
}> {
  try {
    const clerkIds = await clerkIdsForFamily(familyId)
    return await pushToClerkIds({
      clerkIds,
      title: "Your family photo is ready",
      body: "Open Directory photo & listing to name faces and finish your family profile.",
      deepLink: "rendezvousil://directory-photo",
      webUrl: "rendezvousil://directory-photo",
    })
  } catch (error) {
    console.error("[family-directory-notify] photo uploaded push failed:", error)
    return { recipients: 0 }
  }
}

/** Nudge a family that already has a photo to finish naming / profile. */
export async function notifyFamilyCompleteDirectoryProfile(familyId: number): Promise<{
  recipients: number
}> {
  try {
    const clerkIds = await clerkIdsForFamily(familyId)
    return await pushToClerkIds({
      clerkIds,
      title: "Finish your family profile",
      body: "Please open Directory photo & listing to name faces so other families know who’s who.",
      deepLink: "rendezvousil://directory-photo",
      webUrl: "rendezvousil://directory-photo",
    })
  } catch (error) {
    console.error("[family-directory-notify] complete-profile push failed:", error)
    return { recipients: 0 }
  }
}
