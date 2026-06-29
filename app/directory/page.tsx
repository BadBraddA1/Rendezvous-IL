"use client"

import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useUser } from "@clerk/nextjs"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Camera, Church, Loader2, Search, Users } from "lucide-react"
import {
  parseRegistrationEventYear,
  registrationYearLabel,
  type RegistrationEventYear,
} from "@/lib/registration-event-years"

type DirectoryFamily = {
  id: number
  family_last_name: string
  home_congregation: string | null
  photo_url: string
  directory_blurb: string | null
  husband_first_name: string | null
  wife_first_name: string | null
  member_count: number
  member_names: string[]
}

function pickDirectoryYear(
  requestedYear: RegistrationEventYear,
  enabledYears: RegistrationEventYear[],
): RegistrationEventYear | null {
  if (enabledYears.length === 0) return null
  if (enabledYears.includes(requestedYear)) return requestedYear
  return enabledYears[0]
}

export default function DirectoryPage() {
  const { isLoaded, isSignedIn } = useUser()
  const [enabledYears, setEnabledYears] = useState<RegistrationEventYear[]>([])
  const [yearsLoading, setYearsLoading] = useState(true)
  const [eventYear, setEventYear] = useState<RegistrationEventYear | null>(null)
  const [families, setFamilies] = useState<DirectoryFamily[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [accessDenied, setAccessDenied] = useState(false)
  const [directoryDisabled, setDirectoryDisabled] = useState(false)

  useEffect(() => {
    async function loadEnabledYears() {
      setYearsLoading(true)
      try {
        const response = await fetch("/api/directory/years")
        const data = await response.json()
        const years = (data.years || []) as RegistrationEventYear[]
        setEnabledYears(years)

        const params = new URLSearchParams(window.location.search)
        const requestedYear = parseRegistrationEventYear(params.get("year"))
        const selectedYear = pickDirectoryYear(requestedYear, years)
        setEventYear(selectedYear)

        if (selectedYear && String(selectedYear) !== params.get("year")) {
          const url = new URL(window.location.href)
          url.searchParams.set("year", String(selectedYear))
          window.history.replaceState({}, "", url.toString())
        }
      } catch {
        setEnabledYears([2026])
        setEventYear(2026)
      } finally {
        setYearsLoading(false)
      }
    }

    void loadEnabledYears()
  }, [])

  useEffect(() => {
    if (!isLoaded || yearsLoading || eventYear === null) return
    if (!isSignedIn) {
      setLoading(false)
      return
    }

    async function loadDirectory() {
      setLoading(true)
      setError("")
      setAccessDenied(false)
      setDirectoryDisabled(false)
      try {
        const response = await fetch(`/api/directory?year=${eventYear}`)
        const data = await response.json()
        if (response.status === 403) {
          setFamilies([])
          if (data.disabled) {
            setDirectoryDisabled(true)
            setError(data.error || "This directory year is not open yet.")
          } else {
            setAccessDenied(true)
            setError(
              data.error ||
                `The family directory is only available to families registered for ${eventYear}.`,
            )
          }
          return
        }
        if (!response.ok) {
          throw new Error(data.error || "Could not load directory")
        }
        setFamilies(data.families || [])
      } catch (loadError) {
        setFamilies([])
        setError(loadError instanceof Error ? loadError.message : "Could not load directory")
      } finally {
        setLoading(false)
      }
    }

    void loadDirectory()
  }, [eventYear, isLoaded, isSignedIn, yearsLoading])

  const filteredFamilies = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return families
    return families.filter((family) => {
      const haystack = [
        family.family_last_name,
        family.home_congregation,
        family.directory_blurb,
        family.husband_first_name,
        family.wife_first_name,
        family.member_names.join(" "),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      return haystack.includes(query)
    })
  }, [families, search])

  const alternateYear = enabledYears.find((year) => year !== eventYear)

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main id="main-content" className="site-below-header-loose flex-1">
        <div className="site-container space-y-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl space-y-2">
              <Badge variant="secondary" className="w-fit">
                Registered families only
              </Badge>
              <h1 className="text-section-title text-balance">Family Directory</h1>
              <p className="text-lead text-muted-foreground">
                Meet other homeschool families coming to Rendezvous. Photos are uploaded by each
                family from their account profile.
              </p>
            </div>
            {enabledYears.length > 1 && eventYear !== null && (
              <Select
                value={String(eventYear)}
                onValueChange={(value) => {
                  const year = parseRegistrationEventYear(value)
                  setEventYear(year)
                  const url = new URL(window.location.href)
                  url.searchParams.set("year", String(year))
                  window.history.replaceState({}, "", url.toString())
                }}
              >
                <SelectTrigger className="w-full min-h-11 lg:w-[220px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {enabledYears.map((year) => (
                    <SelectItem key={year} value={String(year)}>
                      {registrationYearLabel(year)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {!isLoaded || yearsLoading || loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : enabledYears.length === 0 ? (
            <Card className="max-w-2xl border-dashed">
              <CardHeader>
                <CardTitle>Directory not available</CardTitle>
                <CardDescription>
                  The family directory is not open for any event year yet. Check back after
                  registration opens.
                </CardDescription>
              </CardHeader>
            </Card>
          ) : !isSignedIn ? (
            <Card className="max-w-lg">
              <CardHeader>
                <CardTitle>Sign in to view the directory</CardTitle>
                <CardDescription>
                  The family directory is available to registered {eventYear} families.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild>
                  <Link href={`/sign-in?redirect_url=/directory?year=${eventYear}`}>Sign in</Link>
                </Button>
              </CardContent>
            </Card>
          ) : error ? (
            <Card className="max-w-2xl border-dashed">
              <CardHeader>
                <CardTitle>
                  {directoryDisabled
                    ? "Directory not open yet"
                    : accessDenied
                      ? "Registration required"
                      : "Directory unavailable"}
                </CardTitle>
                <CardDescription>{error}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-3">
                {alternateYear && (directoryDisabled || accessDenied) && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEventYear(alternateYear)
                      const url = new URL(window.location.href)
                      url.searchParams.set("year", String(alternateYear))
                      window.history.replaceState({}, "", url.toString())
                    }}
                  >
                    Try {registrationYearLabel(alternateYear)}
                  </Button>
                )}
                <Button asChild>
                  <Link href="/account/profile">Upload your family photo</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/registration">Registration info</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative max-w-md flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search families, congregation, or notes..."
                    className="min-h-11 pl-9"
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  {filteredFamilies.length} famil{filteredFamilies.length === 1 ? "y" : "ies"} listed
                </p>
              </div>

              {filteredFamilies.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
                    <Camera className="h-10 w-10 text-muted-foreground" />
                    <p className="text-muted-foreground">
                      No families have shared a photo for {eventYear} yet.
                    </p>
                    <Button asChild>
                      <Link href="/account/profile">Be the first to add yours</Link>
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {filteredFamilies.map((family) => (
                    <Card key={family.id} className="overflow-hidden">
                      <div className="relative aspect-[4/3] bg-muted">
                        <Image
                          src={family.photo_url}
                          alt={`${family.family_last_name} family`}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, 33vw"
                          unoptimized
                        />
                      </div>
                      <CardContent className="space-y-3 p-5">
                        <div>
                          <h2 className="text-lg font-semibold">{family.family_last_name} Family</h2>
                          {(family.husband_first_name || family.wife_first_name) && (
                            <p className="text-sm text-muted-foreground">
                              {[family.husband_first_name, family.wife_first_name]
                                .filter(Boolean)
                                .join(" & ")}
                            </p>
                          )}
                        </div>
                        {family.home_congregation && (
                          <p className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Church className="h-4 w-4 shrink-0" />
                            {family.home_congregation}
                          </p>
                        )}
                        <p className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Users className="h-4 w-4 shrink-0" />
                          {family.member_count} attendee{family.member_count === 1 ? "" : "s"}
                          {family.member_names.length > 0
                            ? ` · ${family.member_names.slice(0, 4).join(", ")}${
                                family.member_names.length > 4 ? "…" : ""
                              }`
                            : ""}
                        </p>
                        {family.directory_blurb && (
                          <p className="rounded-lg bg-muted/50 p-3 text-sm">{family.directory_blurb}</p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
