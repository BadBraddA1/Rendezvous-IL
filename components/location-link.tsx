"use client"

import { MapPin } from "lucide-react"

interface LocationLinkProps {
  children: React.ReactNode
  locationId: string
  onShowMap: (locationId: string) => void
}

export function LocationLink({ children, locationId, onShowMap }: LocationLinkProps) {
  return (
    <button
      type="button"
      onClick={() => onShowMap(locationId)}
      className="focus-ring inline-flex cursor-pointer items-center gap-1 rounded-sm underline decoration-primary/50 underline-offset-2 transition-colors hover:text-primary hover:decoration-primary active:text-primary"
      aria-label={`Show ${typeof children === "string" ? children : "location"} on venue map`}
    >
      {children}
      <MapPin className="h-3 w-3 text-primary inline" />
    </button>
  )
}

// Map of text patterns to location IDs
export const locationPatterns: { pattern: RegExp; locationId: string }[] = [
  { pattern: /Activity Center|AC Room|AC\)/gi, locationId: "activities-center" },
  { pattern: /Lakeside Dining Room/gi, locationId: "lakeside-dining" },
  { pattern: /bonfire/gi, locationId: "bonfire-site" },
  { pattern: /Archery/gi, locationId: "archery" },
  { pattern: /Human Foosball/gi, locationId: "human-foosball" },
  { pattern: /GaGa Ball|Gaga Ball|9 Square|Nine Square/gi, locationId: "gaga-ball" },
  { pattern: /Disc golf/gi, locationId: "disc-golf" },
  { pattern: /Recreation Field|Kickball|Capture the Flag/gi, locationId: "rec-field-kickball" },
  { pattern: /Beachfront/gi, locationId: "beachfront" },
]
