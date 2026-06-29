import { sql } from "@/lib/db"
import {
  REGISTRATION_EVENT_YEARS,
  type RegistrationEventYear,
} from "@/lib/registration-event-years"

const DIRECTORY_DEFAULTS: Record<RegistrationEventYear, boolean> = {
  2026: true,
  2027: false,
}

function directorySettingKey(year: RegistrationEventYear): string {
  return `directory_enabled_${year}`
}

export async function isDirectoryYearEnabled(
  year: RegistrationEventYear,
): Promise<boolean> {
  try {
    const [row] = await sql`
      SELECT value FROM app_settings WHERE key = ${directorySettingKey(year)}
    `
    if (!row?.value) return DIRECTORY_DEFAULTS[year]
    return String(row.value) === "true"
  } catch {
    return DIRECTORY_DEFAULTS[year]
  }
}

export async function getDirectoryYearSettings(): Promise<
  Record<RegistrationEventYear, boolean>
> {
  const settings = {} as Record<RegistrationEventYear, boolean>
  for (const year of REGISTRATION_EVENT_YEARS) {
    settings[year] = await isDirectoryYearEnabled(year)
  }
  return settings
}

export async function getEnabledDirectoryYears(): Promise<RegistrationEventYear[]> {
  const enabled: RegistrationEventYear[] = []
  for (const year of REGISTRATION_EVENT_YEARS) {
    if (await isDirectoryYearEnabled(year)) {
      enabled.push(year)
    }
  }
  return enabled
}

export async function setDirectoryYearEnabled(
  year: RegistrationEventYear,
  enabled: boolean,
): Promise<void> {
  const key = directorySettingKey(year)
  const value = enabled ? "true" : "false"
  await sql`
    INSERT INTO app_settings (key, value, updated_at)
    VALUES (${key}, ${value}, CURRENT_TIMESTAMP)
    ON CONFLICT (key) DO UPDATE SET
      value = ${value},
      updated_at = CURRENT_TIMESTAMP
  `
}
