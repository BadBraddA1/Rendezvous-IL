import { sql } from "@/lib/db"

export const REGISTRATION_TEST_SETTING_KEY = "registration_test_enabled"
export const EXPRESS_REGISTRATION_PREVIEW_SETTING_KEY = "express_registration_preview_enabled"
export const SIGNATURE_EMAILS_SETTING_KEY = "signature_emails_enabled"

export type RegistrationPreviewSettings = {
  testRegistrationEnabled: boolean
  expressRegistrationPreviewEnabled: boolean
  signatureEmailsEnabled: boolean
}

async function readSetting(key: string, defaultValue: boolean): Promise<boolean> {
  try {
    const [row] = await sql`
      SELECT value FROM app_settings WHERE key = ${key}
    `
    if (!row?.value) return defaultValue
    return String(row.value) === "true"
  } catch {
    return defaultValue
  }
}

export async function isRegistrationTestEnabled(): Promise<boolean> {
  return readSetting(REGISTRATION_TEST_SETTING_KEY, false)
}

export async function isExpressRegistrationPreviewEnabled(): Promise<boolean> {
  return readSetting(EXPRESS_REGISTRATION_PREVIEW_SETTING_KEY, false)
}

/** Per-parent emailed signature links; gates check-in until both parents sign. */
export async function isSignatureEmailsEnabled(): Promise<boolean> {
  return readSetting(SIGNATURE_EMAILS_SETTING_KEY, false)
}

export async function getRegistrationPreviewSettings(): Promise<RegistrationPreviewSettings> {
  return {
    testRegistrationEnabled: await isRegistrationTestEnabled(),
    expressRegistrationPreviewEnabled: await isExpressRegistrationPreviewEnabled(),
    signatureEmailsEnabled: await isSignatureEmailsEnabled(),
  }
}

export async function setRegistrationTestEnabled(enabled: boolean): Promise<void> {
  const value = enabled ? "true" : "false"
  await sql`
    INSERT INTO app_settings (key, value, updated_at)
    VALUES (${REGISTRATION_TEST_SETTING_KEY}, ${value}, CURRENT_TIMESTAMP)
    ON CONFLICT (key) DO UPDATE SET
      value = ${value},
      updated_at = CURRENT_TIMESTAMP
  `
}

export async function setExpressRegistrationPreviewEnabled(enabled: boolean): Promise<void> {
  const value = enabled ? "true" : "false"
  await sql`
    INSERT INTO app_settings (key, value, updated_at)
    VALUES (${EXPRESS_REGISTRATION_PREVIEW_SETTING_KEY}, ${value}, CURRENT_TIMESTAMP)
    ON CONFLICT (key) DO UPDATE SET
      value = ${value},
      updated_at = CURRENT_TIMESTAMP
  `
}

export async function setSignatureEmailsEnabled(enabled: boolean): Promise<void> {
  const value = enabled ? "true" : "false"
  await sql`
    INSERT INTO app_settings (key, value, updated_at)
    VALUES (${SIGNATURE_EMAILS_SETTING_KEY}, ${value}, CURRENT_TIMESTAMP)
    ON CONFLICT (key) DO UPDATE SET
      value = ${value},
      updated_at = CURRENT_TIMESTAMP
  `
}
