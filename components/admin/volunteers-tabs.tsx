"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { VolunteerScheduleManager } from "./volunteer-schedule-manager"
import { LessonBidManager } from "./lesson-bid-manager"
import {
  DEFAULT_REGISTRATION_EVENT_YEAR,
  REGISTRATION_EVENT_YEARS,
  REGISTRATION_YEAR_STORAGE_KEY,
  parseRegistrationEventYear,
  registrationYearLabel,
  type RegistrationEventYear,
} from "@/lib/registration-event-years"

function readStoredEventYear(): RegistrationEventYear {
  if (typeof window === "undefined") return DEFAULT_REGISTRATION_EVENT_YEAR
  return parseRegistrationEventYear(window.sessionStorage.getItem(REGISTRATION_YEAR_STORAGE_KEY))
}

type Props = {
  canManage: boolean
}

/** Year picker + Schedule / Lesson bids tabs — same year selection UX as Registration Management. */
export function VolunteersTabs({ canManage }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [eventYear, setEventYear] = useState<RegistrationEventYear>(DEFAULT_REGISTRATION_EVENT_YEAR)

  useEffect(() => {
    const yearFromUrl = searchParams.get("year")
    if (yearFromUrl) {
      setEventYear(parseRegistrationEventYear(yearFromUrl))
      return
    }
    setEventYear(readStoredEventYear())
  }, [searchParams])

  useEffect(() => {
    if (typeof window === "undefined") return
    window.sessionStorage.setItem(REGISTRATION_YEAR_STORAGE_KEY, String(eventYear))
  }, [eventYear])

  const handleYearChange = (value: string) => {
    const year = parseRegistrationEventYear(value)
    setEventYear(year)
    const params = new URLSearchParams(searchParams.toString())
    params.set("year", String(year))
    router.replace(`/admin/volunteers?${params.toString()}`)
  }

  return (
    <div className="space-y-4">
      <div className="max-w-xs">
        <Label htmlFor="volunteer-year-picker">Event year</Label>
        <Select value={String(eventYear)} onValueChange={handleYearChange}>
          <SelectTrigger id="volunteer-year-picker" className="min-h-11">
            <SelectValue placeholder="Event year" />
          </SelectTrigger>
          <SelectContent>
            {REGISTRATION_EVENT_YEARS.map((year) => (
              <SelectItem key={year} value={String(year)}>
                {registrationYearLabel(year)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="schedule">
        <TabsList>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="lesson-bids">Lesson bids</TabsTrigger>
        </TabsList>
        <TabsContent value="schedule" className="mt-4">
          <VolunteerScheduleManager canManage={canManage} eventYear={eventYear} />
        </TabsContent>
        <TabsContent value="lesson-bids" className="mt-4">
          <LessonBidManager canManage={canManage} eventYear={eventYear} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
