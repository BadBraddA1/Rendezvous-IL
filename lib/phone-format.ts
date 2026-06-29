/** Strip non-digits; drop a leading US country code when 11 digits. */
export function normalizePhoneDigits(value: string | null | undefined): string {
  if (!value) return ""
  const digits = String(value).replace(/\D/g, "")
  if (digits.length === 11 && digits.startsWith("1")) {
    return digits.slice(1)
  }
  return digits
}

/**
 * Canonical display/storage format for US numbers: (XXX) XXX-XXXX.
 * Returns null for empty input; leaves unknown formats trimmed when they cannot be normalized.
 */
export function formatPhoneNumber(value: string | null | undefined): string | null {
  if (value == null) return null
  const trimmed = String(value).trim()
  if (!trimmed) return null

  const digits = normalizePhoneDigits(trimmed)
  if (digits.length === 0) return null

  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  }

  if (digits.length === 7) {
    return `${digits.slice(0, 3)}-${digits.slice(3)}`
  }

  if (digits.length === 11 && digits.startsWith("1")) {
    return formatPhoneNumber(digits.slice(1))
  }

  return trimmed
}

/** Normalize phone fields before persisting; empty strings become null. */
export function formatPhoneForStorage(value: string | null | undefined): string | null {
  if (value == null) return null
  const trimmed = String(value).trim()
  if (!trimmed) return null
  return formatPhoneNumber(trimmed) ?? trimmed
}

const PHONE_FIELD_NAMES = new Set([
  "husband_phone",
  "wife_phone",
  "emergency_contact_phone",
  "phone",
  "husbandPhone",
  "wifePhone",
  "emergencyContactPhone",
])

export function normalizePhoneFields<T extends Record<string, unknown>>(input: T): T {
  const out = { ...input }
  for (const key of Object.keys(out)) {
    if (!PHONE_FIELD_NAMES.has(key)) continue
    const raw = out[key]
    if (typeof raw !== "string" && raw != null) continue
    out[key] = formatPhoneForStorage(raw as string | null | undefined) as T[Extract<keyof T, string>]
  }
  return out
}
