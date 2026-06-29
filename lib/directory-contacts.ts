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

/** Prefer explicit per-member phones; fall back to legacy family phones without role labels. */
export function buildDirectoryContactPhones(input: {
  members: DirectoryMemberPhoneRow[]
  husband_phone?: string | null
  wife_phone?: string | null
}): DirectoryContactPhone[] {
  const fromMembers = input.members
    .map((member) => ({
      member,
      phone: member.phone?.trim() || "",
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
  for (const phone of [input.husband_phone, input.wife_phone]) {
    const trimmed = phone?.trim()
    if (!trimmed || seen.has(trimmed)) continue
    seen.add(trimmed)
    legacy.push({
      member_id: null,
      name: "",
      phone: trimmed,
    })
  }

  return legacy
}

export function contactPhoneSearchHaystack(contacts: DirectoryContactPhone[]): string {
  return contacts.map((contact) => `${contact.name} ${contact.phone}`).join(" ")
}
