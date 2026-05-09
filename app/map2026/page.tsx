"use client"

import { useState, useMemo, useCallback, useEffect } from "react"
import dynamic from "next/dynamic"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge" // still used in search results badge
import { MapPin, Search, Mail, Phone, Church, Home, User, Users, X, Sparkles, RefreshCw, Lock, FileDown, ChevronUp, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"

const MAP_PASSWORD = "Rendezvous2026"
const STORAGE_KEY = "map2026_unlocked"
const MAP_YEAR = 2026

const LeafletMap = dynamic(
  () => import("@/components/ui/leaflet-map").then((mod) => mod.LeafletMap),
  { ssr: false }
)

type FamilyMember = {
  id: number
  first_name: string
  last_name: string
  age: number | null
  date_of_birth: string | null
  is_baptized: boolean
}

type Registration = {
  id: number
  lastName: string
  email: string
  husbandPhone: string
  wifePhone: string
  homeCongregation: string
  fullAddress: string
  address: string
  lat: number
  lng: number
}

const EVENT_CENTER = {
  name: "Lake Williamson",
  address: "17280 Lakeside Dr, Carlinville, IL 62626",
  lat: 39.2853,
  lng: -89.8807,
}

// All registrations with Geocodio-verified coordinates
const ALL_REGISTRATIONS: Registration[] = [
  {
    id: 20,
    lastName: "Bradd",
    email: "stephenrbradd@gmail.com",
    husbandPhone: "2179355058",
    wifePhone: "3092517969",
    homeCongregation: "Clinton COC",
    fullAddress: "8754 Sunset Rd, Clinton, IL 61727",
    address: "Clinton, IL",
    lat: 40.157346,
    lng: -88.981508,
  },
  {
    id: 22,
    lastName: "Bradd",
    email: "badbradda1@gmail.com",
    husbandPhone: "6362221841",
    wifePhone: "6362221841",
    homeCongregation: "Arnold COC",
    fullAddress: "3820 Treebrook Dr, Imperial, MO 63052",
    address: "Imperial, MO",
    lat: 38.427198,
    lng: -90.479615,
  },
  {
    id: 44,
    lastName: "Bradd",
    email: "abelbradd@yahoo.com",
    husbandPhone: "8723480946",
    wifePhone: "5012304490",
    homeCongregation: "Holly Springs Church",
    fullAddress: "1139 Highway 367 N, Judsonia, AR 72081",
    address: "Judsonia, AR",
    lat: 35.292804,
    lng: -91.609314,
  },
  {
    id: 39,
    lastName: "Bryan",
    email: "patriciambryan@gmail.com",
    husbandPhone: "4059195489",
    wifePhone: "4059195253",
    homeCongregation: "West Metro Church of Christ",
    fullAddress: "12829 Torre Pines Ln, Yukon, OK 73099",
    address: "Yukon, OK",
    lat: 35.455367,
    lng: -97.757887,
  },
  {
    id: 28,
    lastName: "Collins",
    email: "collins4family@yahoo.com",
    husbandPhone: "3048514106",
    wifePhone: "3048510907",
    homeCongregation: "Moorefield COC",
    fullAddress: "42 Bogart Drive, Petersburg, WV 26847",
    address: "Petersburg, WV",
    lat: 39.014072,
    lng: -79.097852,
  },
  {
    id: 41,
    lastName: "Cozort",
    email: "abcozort@gmail.com",
    husbandPhone: "2174948806",
    wifePhone: "2172202329",
    homeCongregation: "Wetumpka Church of Christ",
    fullAddress: "246 Funderburk Ln, Tallassee, AL 36078",
    address: "Tallassee, AL",
    lat: 32.529822,
    lng: -85.960917,
  },
  {
    id: 30,
    lastName: "Cozort",
    email: "edycozort@gmail.com",
    husbandPhone: "9014848753",
    wifePhone: "2529558002",
    homeCongregation: "Collierville Church of Christ",
    fullAddress: "315 Southwick Drive, Southaven, MS 38671",
    address: "Southaven, MS",
    lat: 34.983314,
    lng: -89.983915,
  },
  {
    id: 27,
    lastName: "Cozort",
    email: "ncozort1491@gmail.com",
    husbandPhone: "(816) 832-4181",
    wifePhone: "(816) 832-4361",
    homeCongregation: "Oak Grove Church of Christ",
    fullAddress: "31303 E Colburn Rd, Grain Valley, MO 64029",
    address: "Grain Valley, MO",
    lat: 38.942319,
    lng: -94.219315,
  },
  {
    id: 35,
    lastName: "English",
    email: "family@poekee.com",
    husbandPhone: "3098382819",
    wifePhone: "3098385346",
    homeCongregation: "Clinton COC",
    fullAddress: "406 Cedar Dr, Clinton, IL 61727",
    address: "Clinton, IL",
    lat: 40.142916,
    lng: -88.964249,
  },
  {
    id: 42,
    lastName: "Fahrenwald",
    email: "kristyfah@gmail.com",
    husbandPhone: "501-388-6004",
    wifePhone: "501-322-0423",
    homeCongregation: "Holly Springs Church of Christ",
    fullAddress: "1139 Hwy 367N, Judsonia, AR 72081",
    address: "Judsonia, AR",
    lat: 35.292804,
    lng: -91.609314,
  },
  {
    id: 29,
    lastName: "Ferrell",
    email: "amandaferrell@gmail.com",
    husbandPhone: "6622886302",
    wifePhone: "9014388370",
    homeCongregation: "Coldwater Church of Christ",
    fullAddress: "4934 Rowsey Crossing Dr, Hernando, MS 38632",
    address: "Hernando, MS",
    lat: 34.811831,
    lng: -90.077142,
  },
  {
    id: 38,
    lastName: "Floyd",
    email: "jason_floyd32@yahoo.com",
    husbandPhone: "7318796747",
    wifePhone: "7318796657",
    homeCongregation: "Bennington Church of Christ",
    fullAddress: "1138 Shaftsbury Hollow Rd, North Bennington, VT 05257",
    address: "North Bennington, VT",
    lat: 43.005524,
    lng: -73.247254,
  },
  {
    id: 48,
    lastName: "Green",
    email: "timandamygreen@yahoo.com",
    husbandPhone: "6124694986",
    wifePhone: "3042102307",
    homeCongregation: "Virginia Church of Christ",
    fullAddress: "4524 Vermilion Trail, Gilbert, MN 55741",
    address: "Gilbert, MN",
    lat: 47.445939,
    lng: -92.340277,
  },
  {
    id: 50,
    lastName: "Haley",
    email: "melzsong75@gmail.com",
    husbandPhone: "6149151005",
    wifePhone: "6149151020",
    homeCongregation: "Rager Road Church of Christ",
    fullAddress: "258 W Main St, Alexandria, OH 43001",
    address: "Alexandria, OH",
    lat: 40.092369,
    lng: -82.617656,
  },
  {
    id: 43,
    lastName: "Hanes",
    email: "andrew.hanes@gmail.com",
    husbandPhone: "3093062158",
    wifePhone: "3093062157",
    homeCongregation: "Clinton Church of Christ",
    fullAddress: "303 N Sycamore St, Maroa, IL 61756",
    address: "Maroa, IL",
    lat: 40.039302,
    lng: -88.963555,
  },
  {
    id: 34,
    lastName: "Manning",
    email: "rebeccamanning81@yahoo.com",
    husbandPhone: "7702311527",
    wifePhone: "7706580402",
    homeCongregation: "Somerville Church of Christ",
    fullAddress: "422 N West St, Somerville, TN 38068",
    address: "Somerville, TN",
    lat: 35.248214,
    lng: -89.351025,
  },
  {
    id: 33,
    lastName: "Meacham",
    email: "paul3swife@gmail.com",
    husbandPhone: "6362224527",
    wifePhone: "9015816351",
    homeCongregation: "Arnold COC",
    fullAddress: "1544 Prehistoric Hill Dr, Imperial, MO 63052",
    address: "Imperial, MO",
    lat: 38.365176,
    lng: -90.390082,
  },
  {
    id: 49,
    lastName: "Middlebrooks",
    email: "dee.middlebrooks@yahoo.com",
    husbandPhone: "4237622847",
    wifePhone: "4237104781",
    homeCongregation: "Ooltewah Church of Christ",
    fullAddress: "122 Mattie Ln, Flintstone, GA 30725",
    address: "Flintstone, GA",
    lat: 34.934449,
    lng: -85.359338,
  },
  {
    id: 45,
    lastName: "Morris",
    email: "morrisfamilyeducation@gmail.com",
    husbandPhone: "6155683877",
    wifePhone: "6154975789",
    homeCongregation: "West End Church of Christ",
    fullAddress: "431 Union Academy Rd, Livingston, TN 38570",
    address: "Livingston, TN",
    lat: 36.282166,
    lng: -85.285947,
  },
  {
    id: 36,
    lastName: "Nix",
    email: "ahnix@hotmail.com",
    husbandPhone: "9374704703",
    wifePhone: "5733009248",
    homeCongregation: "Mid-County Church of Christ",
    fullAddress: "10770 US-36, Bradford, OH 45308",
    address: "Bradford, OH",
    lat: 40.119369,
    lng: -84.408199,
  },
  {
    id: 32,
    lastName: "Parish",
    email: "leefparish@gmail.com",
    husbandPhone: "5807219027",
    wifePhone: "5807219007",
    homeCongregation: "Marlow Church of Christ",
    fullAddress: "211 N 5th St, Marlow, OK 73055",
    address: "Marlow, OK",
    lat: 34.648947,
    lng: -97.960835,
  },
  {
    id: 46,
    lastName: "Pasley",
    email: "teacherdawn1011@gmail.com",
    husbandPhone: "6016860178",
    wifePhone: "6628720481",
    homeCongregation: "Pisgah Church of Christ",
    fullAddress: "361 Huckleberry Lane, Mineral Bluff, GA 30559",
    address: "Mineral Bluff, GA",
    lat: 34.935505,
    lng: -84.291767,
  },
  {
    id: 26,
    lastName: "Smith",
    email: "aprilandderrick@gmail.com",
    husbandPhone: "5029194874",
    wifePhone: "5023969165",
    homeCongregation: "Mid County Church of Christ",
    fullAddress: "45 Carrousel Dr, Troy, OH 45373",
    address: "Troy, OH",
    lat: 40.004840,
    lng: -84.203273,
  },
  {
    id: 40,
    lastName: "Steele",
    email: "molcat88@gmail.com",
    husbandPhone: "419-203-4755",
    wifePhone: "217-502-1362",
    homeCongregation: "Paulding Church of Christ",
    fullAddress: "203 W Wayne St, Paulding, OH 45879",
    address: "Paulding, OH",
    lat: 41.135258,
    lng: -84.582264,
  },
  {
    id: 25,
    lastName: "Valentin",
    email: "rachel.valentin37@gmail.com",
    husbandPhone: "8154517138",
    wifePhone: "6302728366",
    homeCongregation: "Crystal Lake Church of Christ",
    fullAddress: "3306 Christopher Lane, Johnsburg, IL 60051",
    address: "Johnsburg, IL",
    lat: 42.369569,
    lng: -88.262358,
  },
  {
    id: 37,
    lastName: "Watson",
    email: "deyrl@mac.com",
    husbandPhone: "(217) 553-9938",
    wifePhone: "2174142168",
    homeCongregation: "Clinton COC",
    fullAddress: "1260 N 1600 East Rd, Taylorville, IL 62568",
    address: "Taylorville, IL",
    lat: 39.534783,
    lng: -89.229293,
  },
  {
    id: 31,
    lastName: "Zamfir",
    email: "daniel.zamfir@live.com",
    husbandPhone: "2243581981",
    wifePhone: "",
    homeCongregation: "Wetumpka Church of Christ",
    fullAddress: "2060 Ware Rd, Tallassee, AL 36078",
    address: "Tallassee, AL",
    lat: 32.482025,
    lng: -86.061850,
  },
]

export default function Map2026Page() {
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [isCheckingAttendee, setIsCheckingAttendee] = useState(true)
  const [passwordInput, setPasswordInput] = useState("")
  const [passwordError, setPasswordError] = useState(false)

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
    if (passwordInput === MAP_PASSWORD) {
      sessionStorage.setItem(STORAGE_KEY, "true")
      setIsUnlocked(true)
      setPasswordError(false)
    } else {
      setPasswordError(true)
    }
  }

  const [searchQuery, setSearchQuery] = useState("")
  const [selectedRegistration, setSelectedRegistration] = useState<Registration | null>(null)
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([])
  const [loadingMembers, setLoadingMembers] = useState(false)
  // Map of registrationId -> member names string for searching
  const [allMemberNames, setAllMemberNames] = useState<Map<number, string>>(new Map())

  // Fetch all family members once on mount for search purposes
  useEffect(() => {
    fetch("/api/family-members?all=true")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          const map = new Map<number, string>()
          data.forEach((m: FamilyMember & { registration_id: number }) => {
            const existing = map.get(m.registration_id) || ""
            map.set(m.registration_id, `${existing} ${m.first_name} ${m.last_name}`.toLowerCase())
          })
          setAllMemberNames(map)
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!selectedRegistration) {
      setFamilyMembers([])
      return
    }
    setLoadingMembers(true)
    fetch(`/api/family-members?registrationId=${selectedRegistration.id}`)
      .then(res => res.json())
      .then(data => setFamilyMembers(Array.isArray(data) ? data : []))
      .catch(() => setFamilyMembers([]))
      .finally(() => setLoadingMembers(false))
  }, [selectedRegistration])

  const filteredRegistrations = useMemo(() => {
    if (!searchQuery.trim()) return ALL_REGISTRATIONS
    const query = searchQuery.toLowerCase().trim()
    const numericQuery = query.replace(/\D/g, "")
    return ALL_REGISTRATIONS.filter((reg) =>
      reg.lastName?.toLowerCase().includes(query) ||
      reg.email?.toLowerCase().includes(query) ||
      (numericQuery && reg.husbandPhone?.replace(/\D/g, "").includes(numericQuery)) ||
      (numericQuery && reg.wifePhone?.replace(/\D/g, "").includes(numericQuery)) ||
      reg.homeCongregation?.toLowerCase().includes(query) ||
      reg.fullAddress?.toLowerCase().includes(query) ||
      reg.address?.toLowerCase().includes(query) ||
      allMemberNames.get(reg.id)?.includes(query)
    )
  }, [searchQuery, allMemberNames])

  const handleSelectRegistration = useCallback((reg: Registration) => {
    setSelectedRegistration(reg)
  }, [])

  // Keyboard navigation: Arrow Down/Up to cycle through families
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in the search box
      if (document.activeElement?.tagName === "INPUT") return

      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault()
        const list = filteredRegistrations
        if (list.length === 0) return

        const currentIndex = selectedRegistration
          ? list.findIndex((r) => r.id === selectedRegistration.id)
          : -1

        let nextIndex: number
        if (e.key === "ArrowDown") {
          nextIndex = currentIndex < list.length - 1 ? currentIndex + 1 : 0
        } else {
          nextIndex = currentIndex > 0 ? currentIndex - 1 : list.length - 1
        }

        setSelectedRegistration(list[nextIndex])
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [filteredRegistrations, selectedRegistration])

  // Loading state while checking attendee status
  if (isCheckingAttendee) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <SiteHeader />
        <main className="flex-1 flex items-center justify-center p-6">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <RefreshCw className="h-7 w-7 text-primary animate-spin" />
              </div>
              <CardTitle className="text-2xl">Checking Access</CardTitle>
              <CardDescription>
                Verifying your attendee status...
              </CardDescription>
            </CardHeader>
          </Card>
        </main>
        <SiteFooter />
      </div>
    )
  }

  // Password gate (only shown if not a registered attendee)
  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <SiteHeader />
        <main className="flex-1 flex items-center justify-center p-6">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <Lock className="h-7 w-7 text-primary" />
              </div>
              <CardTitle className="text-2xl">Protected Page</CardTitle>
              <CardDescription>
                Enter the password to view the Attendee Map, or sign in if you&apos;re a registered attendee.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Input
                  type="password"
                  placeholder="Enter password"
                  value={passwordInput}
                  onChange={(e) => {
                    setPasswordInput(e.target.value)
                    setPasswordError(false)
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleUnlock()}
                  className={passwordError ? "border-red-500 focus-visible:ring-red-500" : ""}
                />
                {passwordError && (
                  <p className="text-sm text-red-500">Incorrect password. Please try again.</p>
                )}
              </div>
              <Button onClick={handleUnlock} className="w-full">
                Unlock
              </Button>
            </CardContent>
          </Card>
        </main>
        <SiteFooter />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main>
        {/* Hero Section */}
        <section className="border-b bg-secondary py-12 md:py-16">
          <div className="container mx-auto px-6">
            <div className="mx-auto max-w-4xl text-center">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-secondary-foreground/20 bg-secondary-foreground/10 backdrop-blur-sm px-4 py-2 text-sm font-medium text-secondary-foreground">
                <Sparkles className="h-4 w-4" />
                {ALL_REGISTRATIONS.length} Families Registered
              </div>
              <h1 className="mb-4 text-balance text-4xl font-bold tracking-tight text-secondary-foreground md:text-5xl">
                Attendee Map
              </h1>
              <p className="mb-6 text-balance text-lg text-secondary-foreground/70">
                See where Rendezvous 2027 families are coming from across the country
              </p>
              <Button asChild size="lg" className="gap-2">
                <a
                  href="/event-registration.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <FileDown className="h-5 w-5" />
                  Download Event Registration PDF
                </a>
              </Button>
            </div>
          </div>
        </section>

        {/* Map Legend */}
        <section className="border-b py-4 bg-gradient-to-br from-primary/5 to-accent/5">
          <div className="container mx-auto px-6">
            <div className="flex flex-wrap items-center justify-center gap-6">
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded-full bg-red-600" />
                <span className="text-sm font-medium">Lake Williamson (Event Center)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded-full bg-primary" />
                <span className="text-sm font-medium">Registered Families</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded-full bg-green-600" />
                <span className="text-sm font-medium">Selected Family</span>
              </div>
            </div>
          </div>
        </section>

        {/* Main Content */}
        <section className="py-8">
          <div className="container mx-auto px-6">
            {/* Search */}
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1 max-w-lg">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, phone, congregation, or city..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-10 h-12"
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 p-0"
                    onClick={() => setSearchQuery("")}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              {searchQuery && (
                <Badge variant="secondary" className="whitespace-nowrap text-sm px-4 py-2">
                  Showing {filteredRegistrations.length} of {ALL_REGISTRATIONS.length} families
                </Badge>
              )}
            </div>

            <div className="flex flex-col gap-6 lg:flex-row">
              {/* Map */}
              <Card className="flex-1 overflow-hidden border-border/50 bg-card shadow-xl">
                <CardContent className="p-0 h-full">
                  <div className="h-[600px] lg:h-[calc(100vh-350px)]">
                    <LeafletMap
                      center={EVENT_CENTER}
                      registrations={filteredRegistrations}
                      selectedId={selectedRegistration?.id ?? null}
                      onSelectRegistration={handleSelectRegistration}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Side Panel */}
              <div className="w-full lg:w-80 xl:w-96 flex flex-col gap-4">
                {/* Selected Family Details */}
                {selectedRegistration && (
                  <Card className="border-2 border-primary bg-gradient-to-br from-card to-primary/5 shadow-lg">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <User className="h-5 w-5 text-primary shrink-0" />
                          {selectedRegistration.lastName} Family
                        </CardTitle>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 -mt-1 -mr-1" onClick={() => setSelectedRegistration(null)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      {selectedRegistration.email && (
                        <div className="flex items-start gap-3">
                          <Mail className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                          <div>
                            <p className="text-xs text-muted-foreground font-medium">Email</p>
                            <a href={`mailto:${selectedRegistration.email}`} className="text-primary hover:underline break-all">
                              {selectedRegistration.email}
                            </a>
                          </div>
                        </div>
                      )}
                      {(selectedRegistration.husbandPhone || selectedRegistration.wifePhone) && (
                        <div className="flex items-start gap-3">
                          <Phone className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                          <div>
                            <p className="text-xs text-muted-foreground font-medium">Phone</p>
                            {selectedRegistration.husbandPhone && (
                              <a href={`tel:${selectedRegistration.husbandPhone}`} className="text-primary hover:underline block">
                                Husband: {selectedRegistration.husbandPhone}
                              </a>
                            )}
                            {selectedRegistration.wifePhone && selectedRegistration.wifePhone !== selectedRegistration.husbandPhone && (
                              <a href={`tel:${selectedRegistration.wifePhone}`} className="text-primary hover:underline block">
                                Wife: {selectedRegistration.wifePhone}
                              </a>
                            )}
                          </div>
                        </div>
                      )}
                      {selectedRegistration.homeCongregation && (
                        <div className="flex items-start gap-3">
                          <Church className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                          <div>
                            <p className="text-xs text-muted-foreground font-medium">Congregation</p>
                            <p>{selectedRegistration.homeCongregation}</p>
                          </div>
                        </div>
                      )}
                      {selectedRegistration.fullAddress && (
                        <div className="flex items-start gap-3">
                          <Home className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                          <div>
                            <p className="text-xs text-muted-foreground font-medium">Address</p>
                            <p>{selectedRegistration.fullAddress}</p>
                          </div>
                        </div>
                      )}

                      {/* Family Members */}
                      <div className="pt-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Users className="h-4 w-4 text-primary shrink-0" />
                          <p className="text-xs text-muted-foreground font-medium">Family Members</p>
                        </div>
                        {loadingMembers ? (
                          <div className="flex items-center gap-2 pl-6 text-xs text-muted-foreground">
                            <RefreshCw className="h-3 w-3 animate-spin" />
                            Loading...
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
                    </CardContent>
                  </Card>
                )}

                {/* Attendee List */}
                <Card className="flex-1 border-border/50 bg-gradient-to-br from-card to-muted/30 transition-all hover:shadow-xl">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-primary" />
                      All Attendees
                    </CardTitle>
                    <CardDescription className="flex items-center justify-between gap-2 flex-wrap">
                      <span>
                        {filteredRegistrations.length} {filteredRegistrations.length === 1 ? "family" : "families"} — click to view details
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground/70">
                        <ChevronUp className="h-3 w-3" />
                        <ChevronDown className="h-3 w-3" />
                        to navigate
                      </span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="max-h-[40vh] overflow-y-auto lg:max-h-[calc(100vh-600px)] lg:min-h-[200px]">
                      {filteredRegistrations.length === 0 ? (
                        <div className="p-6 text-center text-sm text-muted-foreground">
                          No families match your search
                        </div>
                      ) : (
                        <div className="divide-y divide-border/50">
                          {filteredRegistrations.map((reg) => (
                            <button
                              key={reg.id}
                              className={`w-full px-4 py-3 text-left transition-all hover:bg-primary/5 ${
                                selectedRegistration?.id === reg.id ? "bg-primary/10 border-l-4 border-l-primary" : ""
                              }`}
                              onClick={() => setSelectedRegistration(reg)}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="font-medium text-foreground truncate">
                                    {reg.lastName} Family
                                  </p>
                                  <p className="text-xs text-muted-foreground truncate">{reg.address}</p>
                                </div>
                                <MapPin className={`h-4 w-4 shrink-0 ${selectedRegistration?.id === reg.id ? "text-primary" : "text-muted-foreground"}`} />
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
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
