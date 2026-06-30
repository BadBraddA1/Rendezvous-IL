import { sql } from "@/lib/db"

export interface DisplayHeartbeatRow {
  deviceId: string
  hostname: string | null
  ip: string | null
  lastView: string | null
  kioskUrl: string | null
  buildVersion: string | null
  userAgent: string | null
  firstSeenAt: string
  lastSeenAt: string
  updatedAt: string
}

export type DisplayStatus = "online" | "stale" | "offline"

const DEVICE_ID_PATTERN = /^[a-zA-Z0-9-]+$/

let tableReady: Promise<void> | null = null

export function ensureLiveUpdatesDisplaysTable() {
  if (!tableReady) {
    tableReady = sql
      .query(`
        CREATE TABLE IF NOT EXISTS live_updates_displays (
          device_id TEXT PRIMARY KEY NOT NULL,
          hostname TEXT,
          ip TEXT,
          last_view TEXT,
          kiosk_url TEXT,
          build_version TEXT,
          user_agent TEXT,
          first_seen_at TEXT DEFAULT CURRENT_TIMESTAMP,
          last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
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

export function isValidDeviceId(deviceId: string): boolean {
  const trimmed = deviceId.trim()
  return trimmed.length > 0 && trimmed.length <= 64 && DEVICE_ID_PATTERN.test(trimmed)
}

export function isDisplayStale(lastSeenAt: string | null | undefined, thresholdMinutes = 5): boolean {
  if (!lastSeenAt) return true

  const lastSeen = new Date(lastSeenAt)
  if (Number.isNaN(lastSeen.getTime())) return true

  const ageMs = Date.now() - lastSeen.getTime()
  return ageMs > thresholdMinutes * 60 * 1000
}

export function getDisplayStatus(lastSeenAt: string | null | undefined): DisplayStatus {
  if (!lastSeenAt || isDisplayStale(lastSeenAt, 30)) return "offline"
  if (isDisplayStale(lastSeenAt, 5)) return "stale"
  return "online"
}

export async function recordDisplayHeartbeat(input: {
  deviceId: string
  hostname?: string | null
  ip?: string | null
  lastView?: string | null
  kioskUrl?: string | null
  buildVersion?: string | null
  userAgent?: string | null
}) {
  await ensureLiveUpdatesDisplaysTable()

  const deviceId = input.deviceId.trim()
  const hostname = input.hostname?.trim() || null
  const ip = input.ip?.trim() || null
  const lastView = input.lastView?.trim() || null
  const kioskUrl = input.kioskUrl?.trim() || null
  const buildVersion = input.buildVersion?.trim() || null
  const userAgent = input.userAgent?.trim() || null

  await sql`
    INSERT INTO live_updates_displays (
      device_id,
      hostname,
      ip,
      last_view,
      kiosk_url,
      build_version,
      user_agent,
      first_seen_at,
      last_seen_at,
      updated_at
    )
    VALUES (
      ${deviceId},
      ${hostname},
      ${ip},
      ${lastView},
      ${kioskUrl},
      ${buildVersion},
      ${userAgent},
      datetime('now'),
      datetime('now'),
      datetime('now')
    )
    ON CONFLICT(device_id) DO UPDATE SET
      hostname = COALESCE(excluded.hostname, live_updates_displays.hostname),
      ip = COALESCE(excluded.ip, live_updates_displays.ip),
      last_view = COALESCE(excluded.last_view, live_updates_displays.last_view),
      kiosk_url = COALESCE(excluded.kiosk_url, live_updates_displays.kiosk_url),
      build_version = COALESCE(excluded.build_version, live_updates_displays.build_version),
      user_agent = COALESCE(excluded.user_agent, live_updates_displays.user_agent),
      last_seen_at = datetime('now'),
      updated_at = datetime('now')
  `

  const rows = await sql`
    SELECT last_seen_at
    FROM live_updates_displays
    WHERE device_id = ${deviceId}
    LIMIT 1
  `

  return {
    deviceId,
    lastSeenAt: rows[0]?.last_seen_at ? String(rows[0].last_seen_at) : new Date().toISOString(),
  }
}

function mapDisplayRow(row: Record<string, unknown>): DisplayHeartbeatRow {
  return {
    deviceId: String(row.device_id),
    hostname: row.hostname ? String(row.hostname) : null,
    ip: row.ip ? String(row.ip) : null,
    lastView: row.last_view ? String(row.last_view) : null,
    kioskUrl: row.kiosk_url ? String(row.kiosk_url) : null,
    buildVersion: row.build_version ? String(row.build_version) : null,
    userAgent: row.user_agent ? String(row.user_agent) : null,
    firstSeenAt: String(row.first_seen_at),
    lastSeenAt: String(row.last_seen_at),
    updatedAt: String(row.updated_at),
  }
}

export async function listDisplayHeartbeats(): Promise<DisplayHeartbeatRow[]> {
  await ensureLiveUpdatesDisplaysTable()

  const rows = await sql`
    SELECT
      device_id,
      hostname,
      ip,
      last_view,
      kiosk_url,
      build_version,
      user_agent,
      first_seen_at,
      last_seen_at,
      updated_at
    FROM live_updates_displays
    ORDER BY last_seen_at DESC
  `

  return rows.map((row) => mapDisplayRow(row as Record<string, unknown>))
}
