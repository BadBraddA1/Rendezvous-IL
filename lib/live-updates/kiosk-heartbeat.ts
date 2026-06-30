import type { ViewType } from "@/lib/live-updates/types"

export const LU_DEVICE_ID_KEY = "lu_device_id"
export const LU_OFFLINE_SNAPSHOT_KEY = "lu_offline_snapshot"

export type OfflineSnapshot = {
  currentView: ViewType
  announcementTitles: string[]
  weatherTemp?: number
  timestamp: number
}

export function resolveDeviceId(deviceParam: string | null): string | null {
  if (typeof window === "undefined") return deviceParam

  if (deviceParam) {
    try {
      window.localStorage.setItem(LU_DEVICE_ID_KEY, deviceParam)
    } catch {
      // private mode etc.
    }
    return deviceParam
  }

  try {
    return window.localStorage.getItem(LU_DEVICE_ID_KEY)
  } catch {
    return null
  }
}

export function resolveHostname(hostnameParam: string | null): string | undefined {
  const trimmed = hostnameParam?.trim()
  return trimmed || undefined
}

export type HeartbeatPayload = {
  deviceId: string
  hostname?: string
  lastView: ViewType
  buildVersion?: string
}

export async function postHeartbeat(payload: HeartbeatPayload): Promise<void> {
  const body: Record<string, string> = {
    deviceId: payload.deviceId,
    lastView: payload.lastView,
  }
  if (payload.hostname) body.hostname = payload.hostname
  if (payload.buildVersion) body.buildVersion = payload.buildVersion

  const res = await fetch("/api/live-updates/heartbeat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`heartbeat ${res.status}`)
}

export function saveOfflineSnapshot(snapshot: Omit<OfflineSnapshot, "timestamp">): void {
  if (typeof window === "undefined") return
  try {
    const payload: OfflineSnapshot = { ...snapshot, timestamp: Date.now() }
    window.sessionStorage.setItem(LU_OFFLINE_SNAPSHOT_KEY, JSON.stringify(payload))
  } catch {
    // ignore storage failures
  }
}
