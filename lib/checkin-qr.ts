import { randomBytes } from "crypto"
import { sql } from "@/lib/db"

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789" // no 0/O/1/I

/** 10-char family check-in code (printable QR + stealth Home watermark). */
export function generateCheckinQrCode(): string {
  const bytes = randomBytes(10)
  let out = ""
  for (let i = 0; i < 10; i++) {
    out += ALPHABET[bytes[i]! % ALPHABET.length]
  }
  return out
}

/**
 * Return the registration's check-in QR code, minting one if missing.
 * Safe to call from year-hub / family surfaces.
 */
export async function ensureCheckinQrCode(registrationId: number): Promise<string | null> {
  if (!Number.isFinite(registrationId) || registrationId <= 0) return null

  const [existing] = await sql`
    SELECT checkin_qr_code
    FROM registrations
    WHERE id = ${registrationId}
    LIMIT 1
  `
  const current = existing?.checkin_qr_code ? String(existing.checkin_qr_code).trim() : ""
  if (current) return current.toUpperCase()

  for (let attempt = 0; attempt < 6; attempt++) {
    const code = generateCheckinQrCode()
    try {
      await sql`
        UPDATE registrations
        SET checkin_qr_code = ${code}
        WHERE id = ${registrationId}
          AND (checkin_qr_code IS NULL OR trim(checkin_qr_code) = '')
      `
      const [row] = await sql`
        SELECT checkin_qr_code
        FROM registrations
        WHERE id = ${registrationId}
        LIMIT 1
      `
      const saved = row?.checkin_qr_code ? String(row.checkin_qr_code).trim() : ""
      if (saved) return saved.toUpperCase()
    } catch {
      // unique collision — retry
    }
  }
  return null
}
