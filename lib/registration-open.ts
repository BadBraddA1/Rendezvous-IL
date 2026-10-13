/**
 * Registration-open timing — no DB imports (safe for guest home / client countdown).
 * Jan 1, 2027 midnight CST = 06:00 UTC.
 */

export const REGISTRATION_OPEN_UTC_MS = Date.UTC(2027, 0, 1, 6, 0, 0)

export function isRegistrationOpen(now = Date.now()): boolean {
  return now >= REGISTRATION_OPEN_UTC_MS
}
