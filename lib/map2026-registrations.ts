import { formatPhoneForStorage } from "@/lib/phone-format"

export type Map2026Registration = {
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

/** Lazy-load the static registration dataset (keeps ~25KB out of the initial page chunk). */
export async function loadMap2026Registrations(): Promise<Map2026Registration[]> {
  const mod = await import("./map2026-registrations-data")
  return mod.MAP2026_REGISTRATIONS.map((reg) => ({
    ...reg,
    husbandPhone: formatPhoneForStorage(reg.husbandPhone) || reg.husbandPhone,
    wifePhone: formatPhoneForStorage(reg.wifePhone) || reg.wifePhone,
  }))
}
