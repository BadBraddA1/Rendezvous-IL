import { sql } from "@/lib/db"
import { normalizeRoomLabel } from "@/lib/live-updates/rooms"

export interface DisplayHeartbeatRow {
  deviceId: string
  hostname: string | null
  ip: string | null
  lastView: string | null
  kioskUrl: string | null
  buildVersion: string | null
  userAgent: string | null
  /** Admin-assigned room name shown on the TV (e.g. "Activities Center"). */
  roomLabel: string | null
  firstSeenAt: string
  lastSeenAt: string
  updatedAt: string
}

export type DisplayStatus = "online" | "stale" | "offline"

const DEVICE_ID_PATTERN = /^[a-zA-Z0-9-]+$/

let tableReady: Promise<void> | null = null

export function ensureLiveUpdatesDisplaysTable() {
  if (!tableReady) {
    tableReady = (async () => {
      await sql.query(`
        CREATE TABLE IF NOT EXISTS live_updates_displays (
          device_id TEXT PRIMARY KEY NOT NULL,
          hostname TEXT,
          ip TEXT,
          last_view TEXT,
          kiosk_url TEXT,
          build_version TEXT,
          user_agent TEXT,
          room_label TEXT,
          first_seen_at TEXT DEFAULT CURRENT_TIMESTAMP,
          last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `)
      try {
        await sql.query(`ALTER TABLE live_updates_displays ADD COLUMN room_label TEXT`)
      } catch {
        // column already exists
      }
    })()
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
  /** Optional bootstrap from ?room= — only fills empty room_label. */
  roomLabel?: string | null
}) {
  await ensureLiveUpdatesDisplaysTable()

  const deviceId = input.deviceId.trim()
  const hostname = input.hostname?.trim() || null
  const ip = input.ip?.trim() || null
  const lastView = input.lastView?.trim() || null
  const kioskUrl = input.kioskUrl?.trim() || null
  const buildVersion = input.buildVersion?.trim() || null
  const userAgent = input.userAgent?.trim() || null
  const roomLabel = normalizeRoomLabel(input.roomLabel)

  await sql`
    INSERT INTO live_updates_displays (
      device_id,
      hostname,
      ip,
      last_view,
      kiosk_url,
      build_version,
      user_agent,
      room_label,
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
      ${roomLabel},
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
      room_label = COALESCE(live_updates_displays.room_label, excluded.room_label),
      last_seen_at = datetime('now'),
      updated_at = datetime('now')
  `

  const rows = await sql`
    SELECT last_seen_at, room_label
    FROM live_updates_displays
    WHERE device_id = ${deviceId}
    LIMIT 1
  `

  return {
    deviceId,
    lastSeenAt: rows[0]?.last_seen_at ? String(rows[0].last_seen_at) : new Date().toISOString(),
    roomLabel: rows[0]?.room_label ? String(rows[0].room_label) : null,
  }
}

export async function updateDisplayRoomLabel(
  deviceId: string,
  roomLabel: string | null,
): Promise<DisplayHeartbeatRow | null> {
  await ensureLiveUpdatesDisplaysTable()
  const id = deviceId.trim()
  if (!isValidDeviceId(id)) return null

  const label = normalizeRoomLabel(roomLabel)

  const existing = await sql`
    SELECT device_id FROM live_updates_displays WHERE device_id = ${id} LIMIT 1
  `
  if (existing.length === 0) return null

  await sql`
    UPDATE live_updates_displays
    SET room_label = ${label},
        updated_at = datetime('now')
    WHERE device_id = ${id}
  `

  const rows = await sql`
    SELECT
      device_id,
      hostname,
      ip,
      last_view,
      kiosk_url,
      build_version,
      user_agent,
      room_label,
      first_seen_at,
      last_seen_at,
      updated_at
    FROM live_updates_displays
    WHERE device_id = ${id}
    LIMIT 1
  `
  if (!rows[0]) return null
  return mapDisplayRow(rows[0] as Record<string, unknown>)
}

export async function getDisplayByDeviceId(deviceId: string): Promise<DisplayHeartbeatRow | null> {
  await ensureLiveUpdatesDisplaysTable()
  const id = deviceId.trim()
  if (!isValidDeviceId(id)) return null

  const rows = await sql`
    SELECT
      device_id,
      hostname,
      ip,
      last_view,
      kiosk_url,
      build_version,
      user_agent,
      room_label,
      first_seen_at,
      last_seen_at,
      updated_at
    FROM live_updates_displays
    WHERE device_id = ${id}
    LIMIT 1
  `
  if (!rows[0]) return null
  return mapDisplayRow(rows[0] as Record<string, unknown>)
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
    roomLabel: row.room_label ? String(row.room_label) : null,
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
      room_label,
      first_seen_at,
      last_seen_at,
      updated_at
    FROM live_updates_displays
    ORDER BY last_seen_at DESC
  `

  return rows.map((row) => mapDisplayRow(row as Record<string, unknown>))
}
