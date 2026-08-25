export const ADMIN_UI_COOKIE = "ren_admin_ui"

export type AdminUiMode = "classic" | "new"

export function parseAdminUiMode(raw: string | undefined | null): AdminUiMode {
  return raw === "new" ? "new" : "classic"
}
