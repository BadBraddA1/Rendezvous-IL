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
import { Camera, Loader2, Mail, MapPin, MapPinned, Search, Users } from "lucide-react"
import { DirectoryContactPhones } from "@/components/directory/directory-contact-phones"
import {
  contactMatchesMemberName,
  contactPhoneSearchHaystack,
} from "@/lib/directory-contacts"
import type { DirectoryContactPhone } from "@/lib/directory-contacts"
import {
  parseRegistrationEventYear,
  registrationYearLabel,
  type RegistrationEventYear,
} from "@/lib/registration-event-years"

type DirectoryMember = {
  name: string
  role: "father" | "mother" | "child"
  age: number | null
  is_adult: boolean
  email: string | null
  phone: string | null
}

type DirectoryFamily = {
  id: number
  family_last_name: string
  home_congregation: string | null
  city: string | null
  state: string | null
  city_state: string | null
  photo_url: string | null
  directory_blurb: string | null
  husband_first_name: string | null
  wife_first_name: string | null
  email: string | null
  formatted_address: string | null
  contact_phones: DirectoryContactPhone[]
  member_count: number
  member_names: string[]
  members: DirectoryMember[]
}

/** "Adult" for 18+, otherwise the age; nothing when age is unknown. */
function memberAgeLabel(member: DirectoryMember): string | null {
  if (member.is_adult) return "Adult"
  if (member.age !== null) return String(member.age)
  return null
}

function phonesForMember(
  contacts: DirectoryContactPhone[],
  memberName: string,
): DirectoryContactPhone[] {
  return contacts.filter((contact) => contactMatchesMemberName(contact.name, memberName))
}

function orphanContactPhones(
  family: DirectoryFamily,
): DirectoryContactPhone[] {
  const names =
    family.members.length > 0 ? family.members.map((m) => m.name) : family.member_names
  return family.contact_phones.filter(
    (contact) =>
      !contact.name.trim() || !names.some((name) => contactMatchesMemberName(contact.name, name)),
  )
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
        family.city_state,
        family.city,
        family.state,
        family.directory_blurb,
        family.husband_first_name,
        family.wife_first_name,
        family.email,
        family.formatted_address,
        contactPhoneSearchHaystack(family.contact_phones),
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
    <div className="flex min-h-dvh min-w-0 flex-col overflow-x-clip">
      <SiteHeader />
      <main
        id="main-content"
        className="site-container site-below-header-loose site-page-intro min-w-0 flex-1 pb-16 md:pb-20"
      >
        <div className="space-y-8">
          <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0 max-w-2xl space-y-2">
              <Badge variant="secondary" className="w-fit">
                Registered families only
              </Badge>
              <h1 className="text-section-title text-balance">Family Directory</h1>
              <p className="text-lead text-muted-foreground">
                Meet other homeschool families coming to Rendezvous. Each listing includes contact
                info, congregation, and attendees from your family profile.
              </p>
            </div>
            <div className="flex w-full shrink-0 flex-col gap-3 sm:w-auto lg:items-end">
              {eventYear === 2026 && (
                <Button asChild variant="outline" className="min-h-11 w-full lg:w-[220px]">
                  <Link href="/map2026">
                    <MapPinned className="mr-2 h-4 w-4" />
                    Map view
                  </Link>
                </Button>
              )}
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
              <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative min-w-0 max-w-md flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search families, city, or notes..."
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
                      No registered families are listed for {eventYear} yet.
                    </p>
                    <Button asChild>
                      <Link href="/account/profile">Be the first to add yours</Link>
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid min-w-0 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {filteredFamilies.map((family) => (
                    <Card key={family.id} className="gap-0 overflow-hidden py-0 shadow-sm">
                      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                        {family.photo_url ? (
                          <Image
                            src={family.photo_url}
                            alt={`${family.family_last_name} family`}
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 100vw, 33vw"
                            unoptimized
                          />
                        ) : (
                          <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center text-muted-foreground">
                            <Users className="h-10 w-10" />
                            <p className="text-sm">No photo yet</p>
                          </div>
                        )}
                      </div>
                      <CardContent className="min-w-0 space-y-3 p-5">
                        <div className="min-w-0">
                          <h2 className="text-lg font-semibold break-words">
                            {family.family_last_name} Family
                          </h2>
                          {family.members.length === 0 &&
                            (family.husband_first_name || family.wife_first_name) && (
                              <p className="text-sm text-muted-foreground break-words">
                                {[family.husband_first_name, family.wife_first_name]
                                  .filter(Boolean)
                                  .join(" & ")}
                              </p>
                            )}
                        </div>

                        {family.members.length > 0 && (
                          <div className="min-w-0 space-y-1.5 text-sm">
                            {family.members
                              .filter((member) => member.role !== "child")
                              .map((member) => (
                                <div key={`${member.role}-${member.name}`} className="min-w-0">
                                  <p className="break-words">
                                    <span className="font-medium">
                                      {member.role === "father" ? "Father" : "Mother"}:
                                    </span>{" "}
                                    {member.name}
                                  </p>
                                  {member.email && (
                                    <a
                                      href={`mailto:${member.email}`}
                                      className="block min-w-0 break-all pl-4 text-xs text-primary hover:underline"
                                    >
                                      {member.email}
                                    </a>
                                  )}
                                  <DirectoryContactPhones
                                    contacts={phonesForMember(family.contact_phones, member.name)}
                                    className="space-y-1 pl-4 pt-1"
                                    showNames={false}
                                  />
                                </div>
                              ))}
                            {family.members.some((member) => member.role === "child") && (
                              <p className="min-w-0 break-words text-muted-foreground">
                                <span className="font-medium text-foreground">Kids:</span>{" "}
                                {family.members
                                  .filter((member) => member.role === "child")
                                  .map((member) => {
                                    const label = memberAgeLabel(member)
                                    return label ? `${member.name} (${label})` : member.name
                                  })
                                  .join(", ")}
                              </p>
                            )}
                            {family.members
                              .filter((member) => member.role === "child" && member.email)
                              .map((member) => (
                                <a
                                  key={`kid-email-${member.name}`}
                                  href={`mailto:${member.email}`}
                                  className="block min-w-0 break-all pl-4 text-xs text-primary hover:underline"
                                >
                                  {member.name}: {member.email}
                                </a>
                              ))}
                            {family.members
                              .filter((member) => member.role === "child")
                              .flatMap((member) =>
                                phonesForMember(family.contact_phones, member.name).map(
                                  (contact) => ({ member, contact }),
                                ),
                              )
                              .map(({ member, contact }, index) => (
                                <DirectoryContactPhones
                                  key={`kid-phone-${member.name}-${contact.phone}-${index}`}
                                  contacts={[contact]}
                                  className="space-y-1 pl-4"
                                />
                              ))}
                          </div>
                        )}
                        {family.city_state && (
                          <p className="flex items-start gap-2 text-sm">
                            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                            <a
                              href={`https://maps.google.com/?q=${encodeURIComponent(family.formatted_address || family.city_state)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="min-w-0 break-words text-primary hover:underline"
                            >
                              {family.city_state}
                            </a>
                          </p>
                        )}
                        {family.formatted_address &&
                          family.formatted_address !== family.city_state && (
                            <p className="flex items-start gap-2 text-sm">
                              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                              <a
                                href={`https://maps.google.com/?q=${encodeURIComponent(family.formatted_address)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="min-w-0 break-words text-primary hover:underline"
                              >
                                {family.formatted_address}
                              </a>
                            </p>
                          )}
                        {family.email && (
                          <p className="flex items-start gap-2 text-sm">
                            <Mail className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                            <a
                              href={`mailto:${family.email}`}
                              className="min-w-0 break-all text-primary hover:underline"
                            >
                              {family.email}
                            </a>
                          </p>
                        )}
                        <DirectoryContactPhones
                          contacts={
                            family.members.length > 0
                              ? orphanContactPhones(family)
                              : family.contact_phones
                          }
                          className="space-y-2"
                        />
                        <div className="space-y-1 text-sm text-muted-foreground">
                          <p className="flex items-center gap-2">
                            <Users className="h-4 w-4 shrink-0" />
                            {family.member_count} attendee{family.member_count === 1 ? "" : "s"}
                          </p>
                          {family.members.length === 0 && family.member_names.length > 0 && (
                            <p className="min-w-0 break-words pl-6">
                              {family.member_names.slice(0, 6).join(", ")}
                              {family.member_names.length > 6 ? "…" : ""}
                            </p>
                          )}
                        </div>
                        {family.directory_blurb && (
                          <p className="min-w-0 break-words rounded-lg bg-muted/50 p-3 text-sm">
                            {family.directory_blurb}
                          </p>
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
