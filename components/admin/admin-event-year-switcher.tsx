"use client"

import { useCallback, useEffect, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  ADMIN_EVENT_YEAR_CHANGE,
  DEFAULT_REGISTRATION_EVENT_YEAR,
  REGISTRATION_EVENT_YEARS,
  parseRegistrationEventYear,
  readStoredAdminEventYear,
  registrationYearOptionLabel,
  writeStoredAdminEventYear,
  type RegistrationEventYear,
} from "@/lib/registration-event-years"

/** Shared admin event year — sessionStorage + optional `?year=` sync. */
export function useAdminEventYear() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [eventYear, setEventYearState] = useState<RegistrationEventYear>(
    DEFAULT_REGISTRATION_EVENT_YEAR,
  )

  useEffect(() => {
    const yearFromUrl = searchParams.get("year")
    const year = yearFromUrl
      ? parseRegistrationEventYear(yearFromUrl)
      : readStoredAdminEventYear()
    setEventYearState(year)
    writeStoredAdminEventYear(year)
  }, [searchParams])

  useEffect(() => {
    const onExternal = (event: Event) => {
      const detail = (event as CustomEvent<RegistrationEventYear>).detail
      if (detail === 2026 || detail === 2027) {
        setEventYearState(detail)
      }
    }
    window.addEventListener(ADMIN_EVENT_YEAR_CHANGE, onExternal)
    return () => window.removeEventListener(ADMIN_EVENT_YEAR_CHANGE, onExternal)
  }, [])

  const setEventYear = useCallback(
    (value: string | RegistrationEventYear) => {
      const year = parseRegistrationEventYear(value)
      setEventYearState(year)
      writeStoredAdminEventYear(year)

      const params = new URLSearchParams(searchParams.toString())
      params.set("year", String(year))
      const qs = params.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    [pathname, router, searchParams],
  )

  return { eventYear, setEventYear }
}

type SwitcherProps = {
  /** Compact for shell header; default is labeled select. */
  compact?: boolean
  id?: string
  className?: string
}

/** Global / page event-year control — 2027 primary, 2026 archive. */
export function AdminEventYearSwitcher({
  compact = false,
  id = "admin-event-year",
  className,
}: SwitcherProps) {
  const { eventYear, setEventYear } = useAdminEventYear()

  return (
    <div className={className}>
      {!compact && (
        <label htmlFor={id} className="mb-1 block text-xs font-medium text-muted-foreground">
          Event year
        </label>
      )}
      <select
        id={id}
        value={String(eventYear)}
        onChange={(e) => setEventYear(e.target.value)}
        aria-label="Event year"
        className={
          compact
            ? "ad-year-select"
            : "flex h-11 w-full max-w-xs rounded-md border border-input bg-background px-3 text-sm"
        }
      >
        {REGISTRATION_EVENT_YEARS.map((year) => (
          <option key={year} value={String(year)}>
            {registrationYearOptionLabel(year)}
          </option>
        ))}
      </select>
    </div>
  )
}
