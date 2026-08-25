"use client"

import { useCallback, useEffect, useState } from "react"
import useSWR, { mutate as globalMutate } from "swr"
import { LayoutGrid, Rows3 } from "lucide-react"
import {
  DEFAULT_LIST_VIEW,
  readLocalView,
  viewModeFor,
  writeLocalView,
  type AdminListPage,
  type AdminUiPrefs,
  type ListViewMode,
} from "@/lib/admin-ui-prefs"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

/** Load + persist Cards/Rows preference per staff user + local cache. */
export function useListView(page: AdminListPage) {
  const { data } = useSWR<{ prefs?: AdminUiPrefs }>("/api/admin/me", fetcher)
  const [view, setView] = useState<ListViewMode>(() => readLocalView(page) ?? DEFAULT_LIST_VIEW)

  useEffect(() => {
    const fromServer = data?.prefs ? viewModeFor(data.prefs, page) : null
    const fromLocal = readLocalView(page)
    const next = fromServer ?? fromLocal ?? DEFAULT_LIST_VIEW
    setView(next)
    if (fromServer) writeLocalView(page, fromServer)
  }, [data?.prefs, page])

  const setListView = useCallback(
    async (next: ListViewMode) => {
      setView(next)
      writeLocalView(page, next)
      globalMutate(
        "/api/admin/me",
        (cur: { prefs?: AdminUiPrefs; staff?: unknown } | undefined) => {
          if (!cur) return cur
          return {
            ...cur,
            prefs: {
              views: { ...(cur.prefs?.views ?? {}), [page]: next },
            },
          }
        },
        false,
      )
      try {
        await fetch("/api/admin/prefs", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ page, view: next }),
        })
        globalMutate("/api/admin/me")
      } catch {
        // local preference still applied
      }
    },
    [page],
  )

  return { view, setListView }
}

export function ViewModeToggle({
  view,
  onChange,
  className = "",
}: {
  view: ListViewMode
  onChange: (next: ListViewMode) => void
  className?: string
}) {
  return (
    <div
      className={`inline-flex items-center rounded-md border p-0.5 ${className}`}
      style={{ borderColor: "var(--ad-line)", background: "var(--ad-surface)" }}
      role="group"
      aria-label="List layout"
    >
      <button
        type="button"
        className="inline-flex h-7 items-center gap-1.5 rounded px-2 text-xs"
        style={{
          background: view === "cards" ? "var(--ad-primary-soft)" : "transparent",
          color: view === "cards" ? "var(--ad-primary)" : "var(--ad-muted)",
          fontWeight: view === "cards" ? 600 : 400,
        }}
        onClick={() => onChange("cards")}
        aria-pressed={view === "cards"}
      >
        <LayoutGrid size={14} />
        Cards
      </button>
      <button
        type="button"
        className="inline-flex h-7 items-center gap-1.5 rounded px-2 text-xs"
        style={{
          background: view === "rows" ? "var(--ad-primary-soft)" : "transparent",
          color: view === "rows" ? "var(--ad-primary)" : "var(--ad-muted)",
          fontWeight: view === "rows" ? 600 : 400,
        }}
        onClick={() => onChange("rows")}
        aria-pressed={view === "rows"}
      >
        <Rows3 size={14} />
        Rows
      </button>
    </div>
  )
}

export function ListViewControls({ page }: { page: AdminListPage }) {
  const { view, setListView } = useListView(page)
  return <ViewModeToggle view={view} onChange={setListView} />
}
