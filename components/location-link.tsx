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
      onClick={() => onShowMap(locationId)}
      className="inline-flex items-center gap-1 underline decoration-primary/50 underline-offset-2 hover:decoration-primary hover:text-primary transition-colors cursor-pointer"
      title="View on map"
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
