"use client"

import { useState, useMemo, useCallback, useEffect } from "react"
import dynamic from "next/dynamic"
import Image from "next/image"
import Link from "next/link"
import { useUser } from "@clerk/nextjs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import {
  MapPin,
  Search,
  Mail,
  Phone,
  Church,
  Home,
  User,
  Users,
  X,
  Sparkles,
  RefreshCw,
  Lock,
  FileDown,
  ChevronUp,
  ChevronDown,
  AlertCircle,
  Camera,
  BookUser,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { loadMap2026Registrations } from "@/lib/map2026-registrations"
import { fetchJsonCached } from "@/lib/fetch-json-cache"
import {
  type MapAttendee,
  filterMapAttendees,
  mapStaticRegistrationsToAttendees,
  toLeafletRegistration,
} from "@/lib/map-attendees"
import { DirectoryContactPhones } from "@/components/directory/directory-contact-phones"

const MAP_PASSWORD = "Rendezvous2026"
const STORAGE_KEY = "map2026_unlocked"
const MAP_YEAR = 2026

const LeafletMap = dynamic(
  () => import("@/components/ui/leaflet-map").then((mod) => mod.LeafletMap),
  {
    ssr: false,
    loading: () => (
      <div
        className="h-[min(50dvh,28rem)] w-full animate-pulse rounded-xl bg-muted/40 lg:h-[calc(100dvh-420px)] lg:min-h-[320px]"
        role="status"
        aria-live="polite"
      >
        <span className="sr-only">Loading map</span>
      </div>
    ),
  },
)

type FamilyMember = {
  id: number
  first_name: string
  last_name: string
  age: number | null
  date_of_birth: string | null
  is_baptized: boolean
  registration_id?: number
}

const EVENT_CENTER = {
  name: "Lake Williamson",
  address: "17280 Lakeside Dr, Carlinville, IL 62626",
  lat: 39.2853,
  lng: -89.8807,
}


export default function Map2026Page() {
  const { isSignedIn, isLoaded: isAuthLoaded } = useUser()
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [isCheckingAttendee, setIsCheckingAttendee] = useState(true)
  const [passwordInput, setPasswordInput] = useState("")
  const [passwordError, setPasswordError] = useState<"empty" | "incorrect" | false>(false)

  // Check if user has attended this year (bypass password) or check sessionStorage
  useEffect(() => {
    async function checkAccess() {
      // First check sessionStorage for password unlock
      if (typeof window !== "undefined" && sessionStorage.getItem(STORAGE_KEY) === "true") {
        setIsUnlocked(true)
        setIsCheckingAttendee(false)
        return
      }

      // Then check if user is a registered attendee for this year
      try {
        const response = await fetch(`/api/auth/check-attendee?year=${MAP_YEAR}`)
        const data = await response.json()
        if (data.hasAttended) {
          setIsUnlocked(true)
        }
      } catch (error) {
        // If check fails, user will need password
        console.error("[Map] Error checking attendee status:", error)
      }
      
      setIsCheckingAttendee(false)
    }

    checkAccess()
  }, [])

  const handleUnlock = () => {
    if (!passwordInput.trim()) {
      setPasswordError("empty")
      return
    }
    if (passwordInput === MAP_PASSWORD) {
      sessionStorage.setItem(STORAGE_KEY, "true")
      setIsUnlocked(true)
      setPasswordError(false)
    } else {
      setPasswordError("incorrect")
    }
  }

  const [searchQuery, setSearchQuery] = useState("")
  const [allAttendees, setAllAttendees] = useState<MapAttendee[]>([])
  const [syncedWithDirectory, setSyncedWithDirectory] = useState(false)
  const [viewerFamilyId, setViewerFamilyId] = useState<number | null>(null)
  const [directoryCount, setDirectoryCount] = useState(0)
  const [loadingRegistrations, setLoadingRegistrations] = useState(false)
  const [registrationsError, setRegistrationsError] = useState<string | null>(null)
  const [selectedAttendee, setSelectedAttendee] = useState<MapAttendee | null>(null)
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([])
  const [loadingMembers, setLoadingMembers] = useState(false)
  const [membersError, setMembersError] = useState(false)
  const [allMemberNames, setAllMemberNames] = useState<Map<number, string>>(new Map())

  const loadAttendees = useCallback(async () => {
    setLoadingRegistrations(true)
    setRegistrationsError(null)
    try {
      if (isSignedIn) {
        const response = await fetch(`/api/map2026/attendees?year=${MAP_YEAR}`)
        if (response.ok) {
          const data = await response.json()
          setAllAttendees(data.attendees || [])
          setSyncedWithDirectory(true)
          setViewerFamilyId(data.viewerFamilyId ?? null)
          setDirectoryCount(data.directoryCount ?? data.attendees?.length ?? 0)
          return
        }
      }

      const staticRegs = await loadMap2026Registrations()
      setAllAttendees(mapStaticRegistrationsToAttendees(staticRegs))
      setSyncedWithDirectory(false)
      setViewerFamilyId(null)
      setDirectoryCount(0)
    } catch (error) {
      console.error("[Map] Failed to load attendees:", error)
      setAllAttendees([])
      setSyncedWithDirectory(false)
      setRegistrationsError(
        "We couldn't load the attendee list. Check your connection and try again.",
      )
    } finally {
      setLoadingRegistrations(false)
    }
  }, [isSignedIn])

  useEffect(() => {
    if (!isUnlocked || !isAuthLoaded) return
    void loadAttendees()
  }, [isUnlocked, isAuthLoaded, loadAttendees])

  useEffect(() => {
    if (!isUnlocked || syncedWithDirectory) return
    let cancelled = false
    void fetchJsonCached<FamilyMember[]>("/api/family-members?all=true", 120_000)
      .then((data) => {
        if (cancelled || !Array.isArray(data)) return
        const map = new Map<number, string>()
        data.forEach((m) => {
          if (m.registration_id == null) return
          const existing = map.get(m.registration_id) || ""
          map.set(m.registration_id, `${existing} ${m.first_name} ${m.last_name}`.toLowerCase())
        })
        setAllMemberNames(map)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [isUnlocked, syncedWithDirectory])

  const loadFamilyMembers = useCallback(async (registrationId: number) => {
    setLoadingMembers(true)
    setMembersError(false)
    try {
      const data = await fetchJsonCached<FamilyMember[]>(
        `/api/family-members?registrationId=${registrationId}`,
        60_000,
      )
      setFamilyMembers(Array.isArray(data) ? data : [])
    } catch {
      setFamilyMembers([])
      setMembersError(true)
    } finally {
      setLoadingMembers(false)
    }
  }, [])

  useEffect(() => {
    if (!selectedAttendee || syncedWithDirectory) {
      setFamilyMembers([])
      setMembersError(false)
      return
    }
    const registrationId = selectedAttendee.registrationId ?? selectedAttendee.id
    void loadFamilyMembers(registrationId)
  }, [selectedAttendee, syncedWithDirectory, loadFamilyMembers])

  const filteredAttendees = useMemo(
    () => filterMapAttendees(allAttendees, searchQuery),
    [allAttendees, searchQuery],
  )

  const leafletRegistrations = useMemo(
    () => filteredAttendees.map(toLeafletRegistration),
    [filteredAttendees],
  )

  const handleSelectAttendee = useCallback((attendee: MapAttendee) => {
    setSelectedAttendee(attendee)
  }, [])

  const handleSelectLeafletRegistration = useCallback(
    (registrationId: number) => {
      const match = filteredAttendees.find(
        (attendee) => (attendee.registrationId ?? attendee.id) === registrationId,
      )
      if (match) setSelectedAttendee(match)
    },
    [filteredAttendees],
  )

  // Keyboard navigation: Arrow Down/Up to cycle through families
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in the search box
      if (document.activeElement?.tagName === "INPUT") return

      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault()
        const list = filteredAttendees
        if (list.length === 0) return

        const currentIndex = selectedAttendee
          ? list.findIndex((attendee) => attendee.id === selectedAttendee.id)
          : -1

        let nextIndex: number
        if (e.key === "ArrowDown") {
          nextIndex = currentIndex < list.length - 1 ? currentIndex + 1 : 0
        } else {
          nextIndex = currentIndex > 0 ? currentIndex - 1 : list.length - 1
        }

        setSelectedAttendee(list[nextIndex])
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [filteredAttendees, selectedAttendee])

  // Loading state while checking attendee status
  if (isCheckingAttendee) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <main
          id="main-content"
          className="site-container site-below-header-loose site-page-intro pb-16 md:pb-20"
        >
          <div className="mx-auto max-w-md py-8 md:py-12">
            <Card className="w-full">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                  <RefreshCw className="h-7 w-7 text-primary animate-spin" />
                </div>
                <CardTitle className="text-subheading">Checking Access</CardTitle>
                <CardDescription>
                  Verifying your attendee status...
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </main>
        <SiteFooter />
      </div>
    )
  }

  // Password gate (only shown if not a registered attendee)
  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <main
          id="main-content"
          className="site-container site-below-header-loose site-page-intro pb-16 md:pb-20"
        >
          <div className="mx-auto max-w-md py-8 md:py-12">
            <Card className="w-full">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                  <Lock className="h-7 w-7 text-primary" />
                </div>
                <CardTitle className="text-subheading">Protected Page</CardTitle>
                <CardDescription>
                  Enter the password to view the Attendee Map, or sign in if you&apos;re a registered attendee.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="map2026-password">Map password</Label>
                  <Input
                    id="map2026-password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="Enter password"
                    value={passwordInput}
                    onChange={(e) => {
                      setPasswordInput(e.target.value)
                      setPasswordError(false)
                    }}
                    onKeyDown={(e) => e.key === "Enter" && handleUnlock()}
                    aria-invalid={passwordError ? true : undefined}
                    aria-describedby={passwordError ? "map2026-password-error" : undefined}
                    className={`h-12 min-h-11 text-base ${passwordError ? "border-destructive focus-visible:ring-destructive" : ""}`}
                  />
                  {passwordError && (
                    <p id="map2026-password-error" role="alert" className="text-sm text-destructive">
                      {passwordError === "empty"
                        ? "Enter the password to continue."
                        : "Incorrect password. Please try again."}
                    </p>
                  )}
                </div>
                <Button
                  onClick={handleUnlock}
                  className="w-full"
                  disabled={!passwordInput.trim()}
                >
                  Unlock
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                  Registered attendees can{" "}
                  <Link
                    href="/sign-in?redirect_url=/map2026"
                    className="font-medium text-primary hover:underline"
                  >
                    sign in
                  </Link>{" "}
                  to skip this step.
                </p>
              </CardContent>
            </Card>
          </div>
        </main>
        <SiteFooter />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main id="main-content">
        {/* Hero Section */}
        <section className="site-below-header-loose site-page-intro border-b bg-secondary pb-12 md:pb-16">
          <div className="site-container">
            <div className="mx-auto max-w-4xl text-center">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-sm font-medium text-foreground">
                <Sparkles className="h-4 w-4" />
                {allAttendees.length || loadingRegistrations ? (
                  loadingRegistrations
                    ? "Loading families…"
                    : syncedWithDirectory
                      ? `${allAttendees.length} on map · ${directoryCount} in directory`
                      : `${allAttendees.length} Families Registered`
                ) : (
                  "Attendee Map & Directory"
                )}
              </div>
              <h1 className="text-page-title mb-4 text-balance">
                Attendee Map & Directory
              </h1>
              <p className="mb-6 text-balance text-lg text-secondary-foreground/70">
                See where Rendezvous {MAP_YEAR} families are coming from and browse the same
                directory listings used on the family directory page.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Button asChild size="lg" className="gap-2">
                  <Link href={`/directory?year=${MAP_YEAR}`}>
                    <BookUser className="h-5 w-5" />
                    Card directory view
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="gap-2">
                  <a
                    href="/event-registration.pdf"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <FileDown className="h-5 w-5" />
                    Event registration PDF
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Map Legend */}
        <section className="border-b border-primary/15 bg-surface-highlight py-4">
          <div className="site-container">
            <div className="flex flex-wrap items-center justify-center gap-6">
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded-full bg-destructive" aria-hidden="true" />
                <span className="text-sm font-medium">Lake Williamson (Event Center)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded-full bg-primary" aria-hidden="true" />
                <span className="text-sm font-medium">Registered Families</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded-full bg-success" aria-hidden="true" />
                <span className="text-sm font-medium">Selected Family</span>
              </div>
            </div>
          </div>
        </section>

        {/* Main Content */}
        <section className="py-8">
          <div className="site-container">
            {!syncedWithDirectory && isAuthLoaded && !isSignedIn && (
              <Alert className="mb-6 max-w-3xl">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Showing archived map pins.{" "}
                  <Link href="/sign-in?redirect_url=/map2026" className="font-medium text-primary hover:underline">
                    Sign in
                  </Link>{" "}
                  to sync with the live family directory, photos, and profile contact info.
                </AlertDescription>
              </Alert>
            )}

            {/* Search */}
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1 max-w-lg">
                <label htmlFor="map2026-search" className="sr-only">
                  Search attendees by name, email, phone, congregation, or city
                </label>
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <Input
                  id="map2026-search"
                  type="search"
                  placeholder="Search by name, email, phone, congregation, or city..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-12 min-h-11 pl-10 pr-12 text-base"
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="focus-ring touch-target absolute right-0.5 top-1/2 -translate-y-1/2"
                    onClick={() => setSearchQuery("")}
                    aria-label="Clear search"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </Button>
                )}
              </div>
              {searchQuery && (
                <Badge variant="secondary" className="whitespace-nowrap text-sm px-4 py-2">
                  Showing {filteredAttendees.length} of {allAttendees.length} families
                </Badge>
              )}
            </div>

            {loadingRegistrations ? (
              <div className="flex flex-col gap-6 lg:flex-row" role="status" aria-live="polite">
                <div className="h-[min(52dvh,520px)] min-h-[240px] flex-1 animate-pulse rounded-xl bg-muted/40 lg:h-[calc(100dvh-350px)] lg:min-h-[400px]" />
                <div className="w-full space-y-4 lg:w-80 xl:w-96">
                  <div className="h-48 animate-pulse rounded-xl bg-muted/40" />
                  <div className="h-64 animate-pulse rounded-xl bg-muted/40" />
                </div>
                <span className="sr-only">Loading attendee map data</span>
              </div>
            ) : registrationsError ? (
              <Alert variant="destructive" className="max-w-lg">
                <AlertCircle className="h-4 w-4" aria-hidden="true" />
                <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <span>{registrationsError}</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0 min-h-11 border-destructive/30 bg-background"
                    onClick={() => void loadAttendees()}
                  >
                    Try again
                  </Button>
                </AlertDescription>
              </Alert>
            ) : (
            <div className="flex flex-col gap-6 lg:flex-row">
              {/* Map */}
              <Card className="flex-1 overflow-hidden border-border/50 bg-card">
                <CardContent className="p-0 h-full">
                  <div className="h-[min(52dvh,520px)] min-h-[240px] sm:h-[min(56dvh,560px)] lg:h-[calc(100dvh-350px)] lg:min-h-[400px]">
                    <LeafletMap
                      center={EVENT_CENTER}
                      registrations={leafletRegistrations}
                      selectedId={
                        selectedAttendee
                          ? (selectedAttendee.registrationId ?? selectedAttendee.id)
                          : null
                      }
                      onSelectRegistration={(reg) => handleSelectLeafletRegistration(reg.id)}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Side Panel */}
              <div className="w-full lg:w-80 xl:w-96 flex flex-col gap-4">
                {/* Selected Family Details */}
                {selectedAttendee && (
                  <Card className="border border-primary/30 bg-card">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 space-y-2">
                          <CardTitle className="flex items-center gap-2 text-widget-heading">
                            <User className="h-5 w-5 text-primary shrink-0" />
                            <span className="truncate">{selectedAttendee.lastName} Family</span>
                          </CardTitle>
                      {(selectedAttendee.husbandFirstName || selectedAttendee.wifeFirstName) && (
                        <p className="text-sm text-muted-foreground">
                          {[selectedAttendee.husbandFirstName, selectedAttendee.wifeFirstName]
                            .filter(Boolean)
                            .join(" & ")}
                        </p>
                      )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="focus-ring touch-target -mt-1 -mr-1 shrink-0"
                          onClick={() => setSelectedAttendee(null)}
                          aria-label="Close family details"
                        >
                          <X className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <div className="relative mx-auto aspect-[4/3] w-full overflow-hidden rounded-xl bg-muted">
                        {selectedAttendee.photo_url ? (
                          <Image
                            src={selectedAttendee.photo_url}
                            alt={`${selectedAttendee.lastName} family`}
                            fill
                            className="object-contain"
                            sizes="320px"
                            unoptimized
                          />
                        ) : (
                          <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
                            <Camera className="h-8 w-8" />
                            <p className="text-xs">No photo yet</p>
                          </div>
                        )}
                      </div>

                      {selectedAttendee.directory_blurb && (
                        <p className="rounded-lg bg-muted/50 p-3 text-sm">
                          {selectedAttendee.directory_blurb}
                        </p>
                      )}

                      {selectedAttendee.email && (
                        <div className="flex items-start gap-3">
                          <Mail className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs text-muted-foreground font-medium">Email</p>
                            <a href={`mailto:${selectedAttendee.email}`} className="text-primary hover:underline break-all">
                              {selectedAttendee.email}
                            </a>
                          </div>
                        </div>
                      )}
                      <DirectoryContactPhones contacts={selectedAttendee.contact_phones} />
                      {selectedAttendee.homeCongregation && (
                        <div className="flex items-start gap-3">
                          <Church className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs text-muted-foreground font-medium">Congregation</p>
                            <p className="break-words">{selectedAttendee.homeCongregation}</p>
                          </div>
                        </div>
                      )}
                      {selectedAttendee.fullAddress && (
                        <div className="flex items-start gap-3">
                          <Home className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs text-muted-foreground font-medium">Address</p>
                            <p className="break-words">{selectedAttendee.fullAddress}</p>
                          </div>
                        </div>
                      )}

                      <div className="pt-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Users className="h-4 w-4 text-primary shrink-0" />
                          <p className="text-xs text-muted-foreground font-medium">
                            Family Members
                            {selectedAttendee.member_count > 0
                              ? ` (${selectedAttendee.member_count})`
                              : ""}
                          </p>
                        </div>
                        {syncedWithDirectory ? (
                          selectedAttendee.member_names.length === 0 ? (
                            <p className="pl-6 text-xs text-muted-foreground">No members listed</p>
                          ) : (
                            <div className="pl-6 space-y-1.5">
                              {selectedAttendee.member_names.map((name, index) => (
                                <div
                                  key={`${name}-${index}`}
                                  className="rounded-md bg-muted/50 px-3 py-1.5 text-xs font-medium"
                                >
                                  {name}
                                </div>
                              ))}
                            </div>
                          )
                        ) : loadingMembers ? (
                          <div className="flex items-center gap-2 pl-6 text-xs text-muted-foreground" role="status" aria-live="polite">
                            <RefreshCw className="h-3 w-3 animate-spin" aria-hidden="true" />
                            Loading members…
                          </div>
                        ) : membersError ? (
                          <div className="pl-6 space-y-2" role="alert">
                            <p className="text-xs text-destructive">
                              Couldn&apos;t load family members.
                            </p>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="min-h-11 text-xs"
                              onClick={() => {
                                const registrationId =
                                  selectedAttendee.registrationId ?? selectedAttendee.id
                                void loadFamilyMembers(registrationId)
                              }}
                            >
                              Try again
                            </Button>
                          </div>
                        ) : familyMembers.length === 0 ? (
                          <p className="pl-6 text-xs text-muted-foreground">No members found</p>
                        ) : (
                          <div className="pl-6 space-y-1.5">
                            {familyMembers.map((member) => (
                              <div key={member.id} className="rounded-md bg-muted/50 px-3 py-1.5 text-xs font-medium">
                                {member.first_name} {member.last_name}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {syncedWithDirectory &&
                        selectedAttendee.familyId !== null &&
                        viewerFamilyId !== null &&
                        selectedAttendee.familyId === viewerFamilyId && (
                        <Button asChild variant="outline" size="sm" className="w-full min-h-11">
                          <Link href="/account/profile">Update your directory listing</Link>
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Attendee List */}
                <Card className="flex-1 border-border/50 bg-card">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-widget-heading">
                      <MapPin className="h-5 w-5 text-primary" />
                      {syncedWithDirectory ? "Directory on map" : "All Attendees"}
                    </CardTitle>
                    <CardDescription className="flex items-center justify-between gap-2 flex-wrap">
                      <span>
                        {filteredAttendees.length}{" "}
                        {filteredAttendees.length === 1 ? "family" : "families"} with map pins.
                        Click to view details.
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground/70">
                        <ChevronUp className="h-3 w-3" />
                        <ChevronDown className="h-3 w-3" />
                        to navigate
                      </span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="max-h-[40dvh] overflow-y-auto lg:max-h-[calc(100dvh-600px)] lg:min-h-[200px]">
                      {filteredAttendees.length === 0 ? (
                        <div className="p-6 text-center text-sm text-muted-foreground">
                          {searchQuery.trim()
                            ? "No families match your search."
                            : syncedWithDirectory
                              ? "No directory families have map coordinates yet."
                              : "No registration data is available yet."}
                        </div>
                      ) : (
                        <div className="divide-y divide-border/50">
                          {filteredAttendees.map((attendee) => (
                            <button
                              type="button"
                              key={attendee.id}
                              className={`map-attendee-row focus-ring flex min-h-11 w-full items-center px-4 py-3 text-left transition-colors hover:bg-primary/5 active:bg-primary/10 ${
                                selectedAttendee?.id === attendee.id
                                  ? "border border-primary/30 bg-primary/10 ring-1 ring-primary/20"
                                  : "border border-transparent"
                              }`}
                              onClick={() => handleSelectAttendee(attendee)}
                            >
                              <div className="flex w-full items-center justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="font-medium text-foreground truncate">
                                    {attendee.lastName} Family
                                  </p>
                                  <p className="text-xs text-muted-foreground truncate">
                                    {attendee.address || attendee.fullAddress}
                                  </p>
                                </div>
                                <MapPin className={`h-4 w-4 shrink-0 ${selectedAttendee?.id === attendee.id ? "text-primary" : "text-muted-foreground"}`} />
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
            )}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
