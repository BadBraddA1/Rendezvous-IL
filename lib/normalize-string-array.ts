/**
 * Turso/SQLite stores list fields (room_keys, pre_assigned_keys) as TEXT.
 * Values may be JSON arrays, Postgres-style `{a,b}`, or comma-separated strings.
 */
export function normalizeStringArray(value: unknown): string[] {
  if (value == null) return []

  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean)
  }

  if (typeof value !== "string") {
    return []
  }

  const trimmed = value.trim()
  if (!trimmed) return []

  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed)
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item).trim()).filter(Boolean)
      }
    } catch {
      // fall through
    }
  }

  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    const inner = trimmed.slice(1, -1).trim()
    if (!inner) return []
    return inner
      .split(",")
      .map((item) => item.trim().replace(/^"(.*)"$/, "$1"))
      .filter(Boolean)
  }

  if (trimmed.includes(",")) {
    return trimmed
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
  }

  return [trimmed]
}

export function normalizeRegistrationRow<T extends Record<string, unknown>>(row: T): T {
  if (!row || typeof row !== "object") return row

  return {
    ...row,
    room_keys: normalizeStringArray(row.room_keys),
    pre_assigned_keys: normalizeStringArray(row.pre_assigned_keys),
  }
}
