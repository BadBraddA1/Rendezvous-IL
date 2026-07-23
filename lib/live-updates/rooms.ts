/** Common Lake Williamson / Rendezvous rooms for TV screen labels. */
export const LIVE_UPDATES_ROOM_SUGGESTIONS = [
  "Activities Center",
  "Lakeside Dining",
  "Bonfire Pavilion",
  "Rec Field",
  "Gym",
  "Chapel",
  "Registration Desk",
  "Lobby",
] as const

export function normalizeRoomLabel(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? ""
  if (!trimmed) return null
  return trimmed.slice(0, 80)
}

export function withRoomQuery(path: string, roomLabel: string | null | undefined): string {
  const room = normalizeRoomLabel(roomLabel)
  if (!room) return path
  const joiner = path.includes("?") ? "&" : "?"
  return `${path}${joiner}room=${encodeURIComponent(room)}`
}
