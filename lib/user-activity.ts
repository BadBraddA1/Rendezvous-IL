import { sql } from "@/lib/db"

export type UserPlatform = "web" | "ios" | "android"

export interface UserActivityRow {
  clerkUserId: string
  email: string | null
  lastSeenAt: string
  lastPlatform: UserPlatform
  lastAppVersion: string | null
  visitCount: number
  createdAt: string
  updatedAt: string
}

let tableReady: Promise<void> | null = null

export function ensureUserActivityTable() {
  if (!tableReady) {
    tableReady = sql
      .query(`
        CREATE TABLE IF NOT EXISTS user_app_activity (
          clerk_user_id TEXT PRIMARY KEY NOT NULL,
          email TEXT,
          last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          last_platform TEXT NOT NULL DEFAULT 'web',
          last_app_version TEXT,
          visit_count INTEGER NOT NULL DEFAULT 1,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `)
      .then(() => undefined)
      .catch((error) => {
        tableReady = null
        throw error
      })
  }
  return tableReady
}

export function normalizeUserPlatform(value: unknown): UserPlatform {
  if (value === "ios" || value === "android" || value === "web") return value
  return "web"
}

export function detectPlatformFromUserAgent(userAgent: string | null | undefined): UserPlatform {
  const ua = (userAgent || "").toLowerCase()
  if (ua.includes("rendezvousil-android")) return "android"
  if (ua.includes("rendezvousil") || (ua.includes("cfnetwork") && ua.includes("darwin"))) {
    return "ios"
  }
  if (ua.includes("android")) return "android"
  return "web"
}

export async function recordUserActivity(input: {
  clerkUserId: string
  email?: string | null
  platform?: UserPlatform
  appVersion?: string | null
}) {
  await ensureUserActivityTable()

  const platform = input.platform ?? "web"
  const email = input.email?.trim() || null
  const appVersion = input.appVersion?.trim() || null

  await sql`
    INSERT INTO user_app_activity (
      clerk_user_id,
      email,
      last_seen_at,
      last_platform,
      last_app_version,
      visit_count,
      created_at,
      updated_at
    )
    VALUES (
      ${input.clerkUserId},
      ${email},
      datetime('now'),
      ${platform},
      ${appVersion},
      1,
      datetime('now'),
      datetime('now')
    )
    ON CONFLICT(clerk_user_id) DO UPDATE SET
      email = COALESCE(excluded.email, user_app_activity.email),
      last_seen_at = datetime('now'),
      last_platform = excluded.last_platform,
      last_app_version = COALESCE(excluded.last_app_version, user_app_activity.last_app_version),
      visit_count = user_app_activity.visit_count + 1,
      updated_at = datetime('now')
  `
}

export async function deleteUserActivity(clerkUserId: string) {
  await ensureUserActivityTable()
  await sql`DELETE FROM user_app_activity WHERE clerk_user_id = ${clerkUserId}`
}

export async function getUserActivityMap(userIds: string[]) {
  if (userIds.length === 0) return new Map<string, UserActivityRow>()

  await ensureUserActivityTable()

  const placeholders = userIds.map(() => "?").join(", ")
  const rows = await sql.query(
    `SELECT
      clerk_user_id,
      email,
      last_seen_at,
      last_platform,
      last_app_version,
      visit_count,
      created_at,
      updated_at
    FROM user_app_activity
    WHERE clerk_user_id IN (${placeholders})`,
    userIds,
  )

  const map = new Map<string, UserActivityRow>()
  for (const row of rows) {
    const clerkUserId = String(row.clerk_user_id)
    map.set(clerkUserId, {
      clerkUserId,
      email: row.email ? String(row.email) : null,
      lastSeenAt: String(row.last_seen_at),
      lastPlatform: normalizeUserPlatform(row.last_platform),
      lastAppVersion: row.last_app_version ? String(row.last_app_version) : null,
      visitCount: Number(row.visit_count ?? 1),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    })
  }

  return map
}
