import type { FamilyDirectoryEntry } from "@/lib/family-directory"
import type { Map2026Registration } from "@/lib/map2026-registrations"

export type MapAttendee = {
  id: number
  familyId: number | null
  registrationId: number | null
  lastName: string
  email: string | null
  husbandPhone: string | null
  wifePhone: string | null
  husbandFirstName: string | null
  wifeFirstName: string | null
  homeCongregation: string | null
  fullAddress: string | null
  address: string | null
  lat: number
  lng: number
  photo_url: string | null
  directory_blurb: string | null
  member_count: number
  member_names: string[]
  syncedWithDirectory: boolean
}

function normalizeEmail(email: string | null | undefined): string | null {
  if (!email) return null
  const trimmed = email.trim().toLowerCase()
  return trimmed || null
}

export function mergeDirectoryWithMapCoords(
  directory: FamilyDirectoryEntry[],
  geocoded: Map2026Registration[],
): MapAttendee[] {
  const coordsByEmail = new Map<string, Map2026Registration>()
  for (const reg of geocoded) {
    const email = normalizeEmail(reg.email)
    if (email) coordsByEmail.set(email, reg)
  }

  const attendees: MapAttendee[] = []

  for (const family of directory) {
    const email = normalizeEmail(family.email)
    const geo = email ? coordsByEmail.get(email) : undefined
    if (!geo) continue

    attendees.push({
      id: family.id,
      familyId: family.id,
      registrationId: geo.id,
      lastName: family.family_last_name,
      email: family.email,
      husbandPhone: family.husband_phone,
      wifePhone: family.wife_phone,
      husbandFirstName: family.husband_first_name,
      wifeFirstName: family.wife_first_name,
      homeCongregation: family.home_congregation,
      fullAddress: family.formatted_address,
      address: geo.address,
      lat: geo.lat,
      lng: geo.lng,
      photo_url: family.photo_url,
      directory_blurb: family.directory_blurb,
      member_count: family.member_count,
      member_names: family.member_names,
      syncedWithDirectory: true,
    })
  }

  return attendees.sort((a, b) => a.lastName.localeCompare(b.lastName))
}

export function mapStaticRegistrationsToAttendees(
  geocoded: Map2026Registration[],
): MapAttendee[] {
  return geocoded
    .map((reg) => ({
      id: reg.id,
      familyId: null,
      registrationId: reg.id,
      lastName: reg.lastName,
      email: reg.email || null,
      husbandPhone: reg.husbandPhone || null,
      wifePhone: reg.wifePhone || null,
      husbandFirstName: null,
      wifeFirstName: null,
      homeCongregation: reg.homeCongregation || null,
      fullAddress: reg.fullAddress || null,
      address: reg.address || null,
      lat: reg.lat,
      lng: reg.lng,
      photo_url: null,
      directory_blurb: null,
      member_count: 0,
      member_names: [],
      syncedWithDirectory: false,
    }))
    .sort((a, b) => a.lastName.localeCompare(b.lastName))
}

export function filterMapAttendees(attendees: MapAttendee[], query: string): MapAttendee[] {
  const trimmed = query.trim().toLowerCase()
  if (!trimmed) return attendees

  const numericQuery = trimmed.replace(/\D/g, "")
  return attendees.filter((attendee) => {
    const memberHaystack = attendee.member_names.join(" ").toLowerCase()
    return (
      attendee.lastName.toLowerCase().includes(trimmed) ||
      attendee.email?.toLowerCase().includes(trimmed) ||
      attendee.homeCongregation?.toLowerCase().includes(trimmed) ||
      attendee.fullAddress?.toLowerCase().includes(trimmed) ||
      attendee.address?.toLowerCase().includes(trimmed) ||
      attendee.directory_blurb?.toLowerCase().includes(trimmed) ||
      memberHaystack.includes(trimmed) ||
      (numericQuery &&
        (attendee.husbandPhone?.replace(/\D/g, "").includes(numericQuery) ||
          attendee.wifePhone?.replace(/\D/g, "").includes(numericQuery)))
    )
  })
}

/** Shape expected by LeafletMap markers */
export function toLeafletRegistration(attendee: MapAttendee) {
  return {
    id: attendee.registrationId ?? attendee.id,
    lastName: attendee.lastName,
    email: attendee.email || "",
    husbandPhone: attendee.husbandPhone || "",
    wifePhone: attendee.wifePhone || "",
    homeCongregation: attendee.homeCongregation || "",
    fullAddress: attendee.fullAddress || "",
    address: attendee.address || "",
    lat: attendee.lat,
    lng: attendee.lng,
  }
}
