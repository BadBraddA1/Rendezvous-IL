/**
 * Cards vs Rows preference helpers (LECYC pattern).
 * Persist to Clerk privateMetadata via PATCH /api/admin/prefs when wired;
 * always cache in localStorage for instant restore.
 */

export type ListViewMode = "cards" | "rows"

export type AdminListPage =
  | "registrations"
  | "medical"
  | "claims"
  | "audit"
  | "users"

export type AdminUiPrefs = {
  views: Partial<Record<AdminListPage, ListViewMode>>
}

export const DEFAULT_LIST_VIEW: ListViewMode = "cards"

const PAGES: AdminListPage[] = ["registrations", "medical", "claims", "audit", "users"]

export function parseAdminUiPrefs(raw: unknown): AdminUiPrefs {
  const views: AdminUiPrefs["views"] = {}
  const src =
    raw && typeof raw === "object" && "views" in (raw as object)
      ? ((raw as { views?: unknown }).views as Record<string, unknown> | undefined)
      : null
  if (src && typeof src === "object") {
    for (const key of PAGES) {
      const v = src[key]
      if (v === "cards" || v === "rows") views[key] = v
    }
  }
  return { views }
}

export function viewModeFor(
  prefs: AdminUiPrefs | null | undefined,
  page: AdminListPage,
): ListViewMode {
  return prefs?.views?.[page] ?? DEFAULT_LIST_VIEW
}

export function localStorageKey(page: AdminListPage) {
  return `braddcorp.adminUi.view.${page}`
}

export function readLocalView(page: AdminListPage): ListViewMode | null {
  if (typeof window === "undefined") return null
  try {
    const v = window.localStorage.getItem(localStorageKey(page))
    if (v === "cards" || v === "rows") return v
  } catch {
    // ignore
  }
  return null
}

export function writeLocalView(page: AdminListPage, mode: ListViewMode) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(localStorageKey(page), mode)
  } catch {
    // ignore
  }
}
