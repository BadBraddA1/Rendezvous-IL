# Campus map (iOS)

Hybrid map for Rendezvous IL — option **3** from the product discussion.

## Modes

| Mode | When | What |
|------|------|------|
| **Get there** | Off campus / default | MapKit pin at Lake Williamson + **Directions in Apple Maps** |
| **Campus map** | On campus, or manual | Same `venue-map.jpg` + `%` pins as the website schedule map |

When-In-Use location (~1.2 km of campus center) auto-switches to the campus image map when you arrive. Users can always flip the segmented control. Location is only requested when the Map screen is open.

## Entry points

- Home → **Map** tile
- More → **Campus map**
- Schedule → tap an event location (matches pin via text heuristics)
- Deep link: `rendezvousil://map` or `rendezvousil://map?pin=activities-center`

## Data

| File | Role |
|------|------|
| `ios/RendezvousIL/Resources/venue-map.json` | Pins + venue lat/lng (mirrors `lib/venue-map-data.ts`) |
| `Assets.xcassets/VenueMap` | Campus image |
| `Models/VenueMapModels.swift` | Decode + schedule text matching |
| `Services/CampusLocationMonitor.swift` | Coarse on-campus check |
| `Views/VenueMapView.swift` | UI |

Pin `latitude` / `longitude` fields are `null` today — reserved for a later **blue-dot “you are here”** overlay on the image (option 1).

## Updating pins

1. Edit website `lib/venue-map-data.ts` (and `/map-editor` if needed).
2. Copy the pin list into `venue-map.json` (keep null lat/lng until surveyed).
3. If the art changes, replace `VenueMap.imageset/VenueMap.jpg`.
