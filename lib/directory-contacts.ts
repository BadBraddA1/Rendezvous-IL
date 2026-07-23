import { formatPhoneForStorage } from "@/lib/phone-format"

export type DirectoryContactPhone = {
  member_id: number | null
  name: string
  phone: string
}

export type DirectoryMemberPhoneRow = {
  id: number
  family_id: number
  first_name: string
  last_name: string
  phone: string | null
}

export function memberDisplayName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`.trim()
}

/**
 * Prefer explicit per-member phones; fall back to legacy family husband/wife
 * phones labeled with father/mother names when available (common for 2026).
 */
export function buildDirectoryContactPhones(input: {
  members: DirectoryMemberPhoneRow[]
  husband_phone?: string | null
  wife_phone?: string | null
  husband_name?: string | null
  wife_name?: string | null
}): DirectoryContactPhone[] {
  const fromMembers = input.members
    .map((member) => ({
      member,
      phone: formatPhoneForStorage(member.phone) || "",
    }))
    .filter((entry) => entry.phone.length > 0)
    .map(({ member, phone }) => ({
      member_id: member.id,
      name: memberDisplayName(String(member.first_name), String(member.last_name)),
      phone,
    }))

  if (fromMembers.length > 0) {
    return fromMembers
  }

  const legacy: DirectoryContactPhone[] = []
  const seen = new Set<string>()
  const pairs: Array<{ name: string; phone: string | null | undefined }> = [
    { name: (input.husband_name || "").trim(), phone: input.husband_phone },
    { name: (input.wife_name || "").trim(), phone: input.wife_phone },
  ]

  for (const pair of pairs) {
    const trimmed = formatPhoneForStorage(pair.phone) || ""
    if (!trimmed || seen.has(trimmed)) continue
    seen.add(trimmed)
    legacy.push({
      member_id: null,
      name: pair.name,
      phone: trimmed,
    })
  }

  return legacy
}

export function contactPhoneSearchHaystack(contacts: DirectoryContactPhone[]): string {
  return contacts.map((contact) => `${contact.name} ${contact.phone}`).join(" ")
}

/** Match a directory contact phone to a family member name (first or full). */
export function contactMatchesMemberName(contactName: string, memberName: string): boolean {
  const contact = contactName.trim()
  const member = memberName.trim()
  if (!contact || !member) return false
  if (contact.toLowerCase() === member.toLowerCase()) return true
  const contactFirst = contact.split(/\s+/)[0] || contact
  const memberFirst = member.split(/\s+/)[0] || member
  return (
    contactFirst.toLowerCase() === member.toLowerCase() ||
    contact.toLowerCase().includes(member.toLowerCase()) ||
    memberFirst.toLowerCase() === contactFirst.toLowerCase()
  )
}
