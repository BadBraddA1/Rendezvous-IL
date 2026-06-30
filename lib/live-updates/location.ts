import type { ScheduleItem } from "@/lib/live-updates/types"

export function getLocationIdForEvent(item: ScheduleItem | null): string | null {
  if (!item) return null
  const title = item.title.toLowerCase()
  const location = (item.location || "").toLowerCase()

  if (title.includes("archery")) return "archery"
  if (title.includes("human foosball")) return "human-foosball"
  if (title.includes("disc golf")) return "disc-golf"
  if (title.includes("kickball")) return "rec-field-kickball"
  if (title.includes("capture the flag")) return "rec-field-kickball"
  if (title.includes("bonfire")) return "bonfire-site"
  if (title.includes("hayride")) return "bonfire-site"

  if (location.includes("lakeside") || location.includes("dining")) return "lakeside-dining"
  if (location.includes("bonfire") || location.includes("pavilion")) return "bonfire-site"
  if (location.includes("rec field") || location.includes("recreation field")) return "rec-field-kickball"
  if (location.includes("activity center") || location.includes("ac room") || location.includes("activities center")) {
    return "activities-center"
  }

  if (item.isMeal) return "lakeside-dining"

  return "activities-center"
}
