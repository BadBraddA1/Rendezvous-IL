"use client"

import { useState, useMemo, useCallback } from "react"
import dynamic from "next/dynamic"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { MapPin, Search, Mail, Phone, Church, Home, User, X } from "lucide-react"
import { Button } from "@/components/ui/button"

const LeafletMap = dynamic(
  () => import("@/components/ui/leaflet-map").then((mod) => mod.LeafletMap),
  { ssr: false }
)

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

// All registrations with pre-resolved coordinates
const ALL_REGISTRATIONS: Registration[] = [
  {
    id: 20,
    lastName: "Bradd",
 "Stephen R Bradd",
    email: "stephenrbradd@gmail.com",
    husbandPhone: "2179355058",
    wifePhone: "3092517969",
    homeCongregation: "Clinton COC",
    fullAddress: "8754 Sunset Rd, Clinton, IL 61727",
    address: "Clinton, IL",
    lat: 40.1531,
    lng: -88.9642,
  },
  {
    id: 22,
    lastName: "Bradd",
 "Adin Bradd",
    email: "badbradda1@gmail.com",
    husbandPhone: "6362221841",
    wifePhone: "6362221841",
    homeCongregation: "Arnold COC",
    fullAddress: "3820 Treebrook Dr, Imperial, MO 63052",
    address: "Imperial, MO",
    lat: 38.3606,
    lng: -90.3779,
  },
  {
    id: 44,
    lastName: "Bradd",
 "Abel N. Bradd",
    email: "abelbradd@yahoo.com",
    husbandPhone: "8723480946",
    wifePhone: "5012304490",
    homeCongregation: "Holly Springs Church",
    fullAddress: "1139 Highway 367 N, Judsonia, AR 72081",
    address: "Judsonia, AR",
    lat: 35.2717,
    lng: -91.6382,
  },
  {
    id: 39,
    lastName: "Bryan",
 "Mark Bryan",
    email: "patriciambryan@gmail.com",
    husbandPhone: "4059195489",
    wifePhone: "4059195253",
    homeCongregation: "West Metro Church of Christ",
    fullAddress: "12829 Torre Pines Ln, Yukon, OK 73099",
    address: "Yukon, OK",
    lat: 35.5067,
    lng: -97.7625,
  },
  {
    id: 28,
    lastName: "Collins",
 "Brian Collins",
    email: "collins4family@yahoo.com",
    husbandPhone: "3048514106",
    wifePhone: "3048510907",
    homeCongregation: "Moorefield COC",
    fullAddress: "42 Bogart Drive, Petersburg, WV 26847",
    address: "Petersburg, WV",
    lat: 38.9923,
    lng: -79.1259,
  },
  {
    id: 41,
    lastName: "Cozort",
 "Adam Borden Cozort",
    email: "abcozort@gmail.com",
    husbandPhone: "2174948806",
    wifePhone: "2172202329",
    homeCongregation: "Wetumpka Church of Christ",
    fullAddress: "246 Funderburk Ln, Tallassee, AL 36078",
    address: "Tallassee, AL",
    lat: 32.5357,
    lng: -85.8958,
  },
  {
    id: 30,
    lastName: "Cozort",
 "Aaron J Cozort",
    email: "edycozort@gmail.com",
    husbandPhone: "9014848753",
    wifePhone: "2529558002",
    homeCongregation: "Collierville Church of Christ",
    fullAddress: "315 Southwick Drive, Southaven, MS 38671",
    address: "Southaven, MS",
    lat: 34.9892,
    lng: -89.9873,
  },
  {
    id: 27,
    lastName: "Cozort",
 "Nathan Cozort",
    email: "ncozort1491@gmail.com",
    husbandPhone: "(816) 832-4181",
    wifePhone: "(816) 832-4361",
    homeCongregation: "Oak Grove Church of Christ",
    fullAddress: "31303 E Colburn Rd, Grain Valley, MO 64029",
    address: "Grain Valley, MO",
    lat: 39.0142,
    lng: -94.1988,
  },
  {
    id: 35,
    lastName: "English",
 "Patrick English",
    email: "family@poekee.com",
    husbandPhone: "3098382819",
    wifePhone: "3098385346",
    homeCongregation: "Clinton COC",
    fullAddress: "406 Cedar Dr, Clinton, IL 61727",
    address: "Clinton, IL",
    lat: 40.1509,
    lng: -88.9601,
  },
  {
    id: 42,
    lastName: "Fahrenwald",
 "Michael Fahrenwald",
    email: "kristyfah@gmail.com",
    husbandPhone: "501-388-6004",
    wifePhone: "501-322-0423",
    homeCongregation: "Holly Springs Church of Christ",
    fullAddress: "1139 Hwy 367N, Judsonia, AR 72081",
    address: "Judsonia, AR",
    lat: 35.2750,
    lng: -91.6330,
  },
  {
    id: 29,
    lastName: "Ferrell",
 "Jeffrey Ferrell",
    email: "amandaferrell@gmail.com",
    husbandPhone: "6622886302",
    wifePhone: "9014388370",
    homeCongregation: "Coldwater Church of Christ",
    fullAddress: "4934 Rowsey Crossing Dr, Hernando, MS 38632",
    address: "Hernando, MS",
    lat: 34.8237,
    lng: -89.9934,
  },
  {
    id: 38,
    lastName: "Floyd",
 "Jason Floyd",
    email: "jason_floyd32@yahoo.com",
    husbandPhone: "7318796747",
    wifePhone: "7318796657",
    homeCongregation: "Bennington Church of Christ",
    fullAddress: "1138 Shaftsbury Hollow Rd, North Bennington, VT 05257",
    address: "North Bennington, VT",
    lat: 42.9284,
    lng: -73.2454,
  },
  {
    id: 48,
    lastName: "Green",
 "Timothy E. Green",
    email: "timandamygreen@yahoo.com",
    husbandPhone: "6124694986",
    wifePhone: "3042102307",
    homeCongregation: "Virginia Church of Christ",
    fullAddress: "4524 Vermilion Trail, Gilbert, MN 55741",
    address: "Gilbert, MN",
    lat: 47.4911,
    lng: -92.4657,
  },
  {
    id: 50,
    lastName: "Haley",
 "Josh Haley",
    email: "melzsong75@gmail.com",
    husbandPhone: "6149151005",
    wifePhone: "6149151020",
    homeCongregation: "Rager Road Church of Christ",
    fullAddress: "258 W Main St, Alexandria, OH 43001",
    address: "Alexandria, OH",
    lat: 40.0931,
    lng: -82.6224,
  },
  {
    id: 43,
    lastName: "Hanes",
 "Andrew Hanes",
    email: "andrew.hanes@gmail.com",
    husbandPhone: "3093062158",
    wifePhone: "3093062157",
    homeCongregation: "Clinton Church of Christ",
    fullAddress: "303 N Sycamore St, Maroa, IL 61756",
    address: "Maroa, IL",
    lat: 40.0367,
    lng: -88.9573,
  },
  {
    id: 34,
    lastName: "Manning",
 "Ryan Philip Manning",
    email: "rebeccamanning81@yahoo.com",
    husbandPhone: "7702311527",
    wifePhone: "7706580402",
    homeCongregation: "Somerville Church of Christ",
    fullAddress: "422 N West St, Somerville, TN 38068",
    address: "Somerville, TN",
    lat: 35.2448,
    lng: -89.3537,
  },
  {
    id: 33,
    lastName: "Meacham",
 "Paul Meacham",
    email: "paul3swife@gmail.com",
    husbandPhone: "6362224527",
    wifePhone: "9015816351",
    homeCongregation: "Arnold COC",
    fullAddress: "1544 Prehistoric Hill Dr, Imperial, MO 63052",
    address: "Imperial, MO",
    lat: 38.3580,
    lng: -90.3810,
  },
  {
    id: 49,
    lastName: "Middlebrooks",
 "Josh Middlebrooks",
    email: "dee.middlebrooks@yahoo.com",
    husbandPhone: "4237622847",
    wifePhone: "4237104781",
    homeCongregation: "Ooltewah Church of Christ",
    fullAddress: "122 Mattie Ln, Flintstone, GA 30725",
    address: "Flintstone, GA",
    lat: 34.9407,
    lng: -85.3274,
  },
  {
    id: 45,
    lastName: "Morris",
 "Andrew Morris",
    email: "morrisfamilyeducation@gmail.com",
    husbandPhone: "6155683877",
    wifePhone: "6154975789",
    homeCongregation: "West End Church of Christ",
    fullAddress: "431 Union Academy Rd, Livingston, TN 38570",
    address: "Livingston, TN",
    lat: 36.3834,
    lng: -85.3233,
  },
  {
    id: 36,
    lastName: "Nix",
 "Michael Nix",
    email: "ahnix@hotmail.com",
    husbandPhone: "9374704703",
    wifePhone: "5733009248",
    homeCongregation: "Mid-County Church of Christ",
    fullAddress: "10770 US-36, Bradford, OH 45308",
    address: "Bradford, OH",
    lat: 40.1295,
    lng: -84.4358,
  },
  {
    id: 32,
    lastName: "Parish",
 "Lee Parish",
    email: "leefparish@gmail.com",
    husbandPhone: "5807219027",
    wifePhone: "5807219007",
    homeCongregation: "Marlow Church of Christ",
    fullAddress: "211 N 5th St, Marlow, OK 73055",
    address: "Marlow, OK",
    lat: 34.6478,
    lng: -97.9575,
  },
  {
    id: 46,
    lastName: "Pasley",
 "James Pasley",
    email: "teacherdawn1011@gmail.com",
    husbandPhone: "6016860178",
    wifePhone: "6628720481",
    homeCongregation: "Pisgah Church of Christ",
    fullAddress: "361 Huckleberry Lane, Mineral Bluff, GA 30559",
    address: "Mineral Bluff, GA",
    lat: 34.9326,
    lng: -84.2774,
  },
  {
    id: 26,
    lastName: "Smith",
 "Derrick Smith",
    email: "aprilandderrick@gmail.com",
    husbandPhone: "5029194874",
    wifePhone: "5023969165",
    homeCongregation: "Mid County Church of Christ",
    fullAddress: "45 Carrousel Dr, Troy, OH 45373",
    address: "Troy, OH",
    lat: 40.0395,
    lng: -84.2030,
  },
  {
    id: 40,
    lastName: "Steele",
 "Chase Steele",
    email: "molcat88@gmail.com",
    husbandPhone: "419-203-4755",
    wifePhone: "217-502-1362",
    homeCongregation: "Paulding Church of Christ",
    fullAddress: "203 W Wayne St, Paulding, OH 45879",
    address: "Paulding, OH",
    lat: 41.1395,
    lng: -84.5841,
  },
  {
    id: 25,
    lastName: "Valentin",
 "Ryne Valentin",
    email: "rachel.valentin37@gmail.com",
    husbandPhone: "8154517138",
    wifePhone: "6302728366",
    homeCongregation: "Crystal Lake Church of Christ",
    fullAddress: "3306 Christopher Lane, Johnsburg, IL 60051",
    address: "Johnsburg, IL",
    lat: 42.3817,
    lng: -88.2420,
  },
  {
    id: 37,
    lastName: "Watson",
 "Deyrl Watson",
    email: "deyrl@mac.com",
    husbandPhone: "(217) 553-9938",
    wifePhone: "2174142168",
    homeCongregation: "Clinton COC",
    fullAddress: "1260 N 1600 East Rd, Taylorville, IL 62568",
    address: "Taylorville, IL",
    lat: 39.5481,
    lng: -89.2945,
  },
  {
    id: 31,
    lastName: "Zamfir",
 "Daniel Zamfir",
    email: "daniel.zamfir@live.com",
    husbandPhone: "2243581981",
    wifePhone: "",
    homeCongregation: "Wetumpka Church of Christ",
    fullAddress: "2060 Ware Rd, Tallassee, AL 36078",
    address: "Tallassee, AL",
    lat: 32.5280,
    lng: -85.9010,
  },
]

export default function Map2026Page() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedRegistration, setSelectedRegistration] = useState<Registration | null>(null)

  const filteredRegistrations = useMemo(() => {
    if (!searchQuery.trim()) return ALL_REGISTRATIONS
    const query = searchQuery.toLowerCase().trim()
    return ALL_REGISTRATIONS.filter((reg) =>
      reg.lastName?.toLowerCase().includes(query) ||
      reg.email?.toLowerCase().includes(query) ||
      reg.husbandPhone?.replace(/\D/g, "").includes(query.replace(/\D/g, "")) ||
      reg.wifePhone?.replace(/\D/g, "").includes(query.replace(/\D/g, "")) ||
      reg.homeCongregation?.toLowerCase().includes(query) ||
      reg.fullAddress?.toLowerCase().includes(query) ||
      reg.address?.toLowerCase().includes(query)
    )
  }, [searchQuery])

  const handleSelectRegistration = useCallback((reg: Registration) => {
    setSelectedRegistration(reg)
  }, [])

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto space-y-4 p-4 md:p-6">
        {/* Header */}
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground md:text-3xl">Rendezvous 2026 Attendee Map</h1>
            <p className="text-sm text-muted-foreground">
              {ALL_REGISTRATIONS.length} families registered from across the country
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-red-600" />
              <span className="text-sm">Lake Williamson</span>
            </div>
            <div className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-blue-600" />
              <span className="text-sm">Registered Families</span>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1 max-w-lg">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, phone, congregation, or city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 p-0"
                onClick={() => setSearchQuery("")}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          {searchQuery && (
            <Badge variant="secondary" className="whitespace-nowrap">
              {filteredRegistrations.length} of {ALL_REGISTRATIONS.length} families
            </Badge>
          )}
        </div>

        <div className="flex flex-col gap-4 lg:flex-row">
          {/* Map */}
          <Card className="flex-1 overflow-hidden">
            <CardContent className="p-0">
              <div className="h-[50vh] min-h-[400px] lg:h-[calc(100vh-280px)]">
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
              <Card className="border-2 border-green-500">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <User className="h-4 w-4 shrink-0" />
                      {selectedRegistration.lastName} Family
                    </CardTitle>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 -mt-1 -mr-1" onClick={() => setSelectedRegistration(null)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2.5 text-sm">
                  {selectedRegistration.email && (
                    <div className="flex items-start gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">Email</p>
                        <a href={`mailto:${selectedRegistration.email}`} className="text-blue-600 hover:underline break-all">
                          {selectedRegistration.email}
                        </a>
                      </div>
                    </div>
                  )}
                  {(selectedRegistration.husbandPhone || selectedRegistration.wifePhone) && (
                    <div className="flex items-start gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">Phone</p>
                        {selectedRegistration.husbandPhone && (
                          <a href={`tel:${selectedRegistration.husbandPhone}`} className="text-blue-600 hover:underline block">
                            Husband: {selectedRegistration.husbandPhone}
                          </a>
                        )}
                        {selectedRegistration.wifePhone && selectedRegistration.wifePhone !== selectedRegistration.husbandPhone && (
                          <a href={`tel:${selectedRegistration.wifePhone}`} className="text-blue-600 hover:underline block">
                            Wife: {selectedRegistration.wifePhone}
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                  {selectedRegistration.homeCongregation && (
                    <div className="flex items-start gap-2">
                      <Church className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">Congregation</p>
                        <p>{selectedRegistration.homeCongregation}</p>
                      </div>
                    </div>
                  )}
                  {selectedRegistration.fullAddress && (
                    <div className="flex items-start gap-2">
                      <Home className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">Address</p>
                        <p>{selectedRegistration.fullAddress}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Attendee List */}
            <Card className="flex-1">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">All Attendees</CardTitle>
                <CardDescription>
                  {filteredRegistrations.length} {filteredRegistrations.length === 1 ? "family" : "families"} — click to view details
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-[40vh] overflow-y-auto lg:max-h-[calc(100vh-600px)] lg:min-h-[200px]">
                  {filteredRegistrations.length === 0 ? (
                    <div className="p-6 text-center text-sm text-muted-foreground">
                      No families match your search
                    </div>
                  ) : (
                    <div className="divide-y">
                      {filteredRegistrations.map((reg) => (
                        <button
                          key={reg.id}
                          className={`w-full px-4 py-3 text-left transition-colors hover:bg-muted/50 ${
                            selectedRegistration?.id === reg.id ? "bg-muted" : ""
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
                            <MapPin className={`h-4 w-4 shrink-0 ${selectedRegistration?.id === reg.id ? "text-green-600" : "text-blue-600"}`} />
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
    </div>
  )
}
