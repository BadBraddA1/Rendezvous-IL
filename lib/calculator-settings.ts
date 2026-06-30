import { sql } from "@/lib/db"

export const PUBLIC_CALCULATOR_SETTING_KEY = "public_calculator_enabled"

function parseBooleanSetting(value: unknown): boolean {
  if (value == null) return false
  const normalized = String(value).trim().toLowerCase()
  return normalized === "true" || normalized === "1" || normalized === "yes"
}

export async function isPublicCalculatorEnabled(): Promise<boolean> {
  try {
    const [row] = await sql`
      SELECT value FROM app_settings WHERE key = ${PUBLIC_CALCULATOR_SETTING_KEY}
    `
    return parseBooleanSetting(row?.value)
  } catch (error) {
    console.error("[calculator-settings] read failed:", error)
    return false
  }
}

export async function setPublicCalculatorEnabled(enabled: boolean): Promise<boolean> {
  const value = enabled ? "true" : "false"
  await sql`
    INSERT INTO app_settings (key, value, updated_at)
    VALUES (${PUBLIC_CALCULATOR_SETTING_KEY}, ${value}, CURRENT_TIMESTAMP)
    ON CONFLICT (key) DO UPDATE SET
      value = ${value},
      updated_at = CURRENT_TIMESTAMP
  `
  return enabled
}
