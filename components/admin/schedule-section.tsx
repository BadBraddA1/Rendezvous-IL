"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { ScheduleManager } from "./schedule-manager"
import {
  DEFAULT_REGISTRATION_EVENT_YEAR,
  REGISTRATION_EVENT_YEARS,
  parseRegistrationEventYear,
  readStoredAdminEventYear,
  registrationYearOptionLabel,
  writeStoredAdminEventYear,
  type RegistrationEventYear,
} from "@/lib/registration-event-years"

type Props = {
  canManage: boolean
}

/** Event-year picker + schedule editor — same year UX as Registration Management. */
export function ScheduleSection({ canManage }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [eventYear, setEventYear] = useState<RegistrationEventYear>(DEFAULT_REGISTRATION_EVENT_YEAR)

  useEffect(() => {
    const yearFromUrl = searchParams.get("year")
    if (yearFromUrl) {
      setEventYear(parseRegistrationEventYear(yearFromUrl))
      return
    }
    setEventYear(readStoredAdminEventYear())
  }, [searchParams])

  useEffect(() => {
    writeStoredAdminEventYear(eventYear)
  }, [eventYear])

  const handleYearChange = (value: string) => {
    const year = parseRegistrationEventYear(value)
    setEventYear(year)
    writeStoredAdminEventYear(year)
    const params = new URLSearchParams(searchParams.toString())
    params.set("year", String(year))
    router.replace(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="space-y-4">
      <div className="max-w-xs">
        <Label htmlFor="schedule-year-picker">Event year</Label>
        <Select value={String(eventYear)} onValueChange={handleYearChange}>
          <SelectTrigger id="schedule-year-picker" className="min-h-11">
            <SelectValue placeholder="Event year" />
          </SelectTrigger>
          <SelectContent>
            {REGISTRATION_EVENT_YEARS.map((year) => (
              <SelectItem key={year} value={String(year)}>
                {registrationYearOptionLabel(year)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <ScheduleManager canManage={canManage} eventYear={eventYear} />
    </div>
  )
}
