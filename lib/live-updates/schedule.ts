import { LU_SCHEDULE_ITEMS } from "@/lib/schedule-data"
import { getCentralTime } from "@/lib/live-updates/time"
import type { ScheduleItem, ScheduleSnapshot } from "@/lib/live-updates/types"

export const LIVE_UPDATE_SCHEDULE: ScheduleItem[] = LU_SCHEDULE_ITEMS as ScheduleItem[]

export function computeScheduleSnapshot(
  at: Date = getCentralTime(),
  SCHEDULE_ITEMS: ScheduleItem[] = LIVE_UPDATE_SCHEDULE,
): ScheduleSnapshot {
  const centralHour = at.getHours()
  const centralMinute = at.getMinutes()
  const year = at.getFullYear()
  const month = String(at.getMonth() + 1).padStart(2, "0")
  const day = String(at.getDate()).padStart(2, "0")
  const centralDateStr = `${year}-${month}-${day}`

  let current: ScheduleItem | null = null
  let next: ScheduleItem | null = null
  let prev: ScheduleItem | null = null
  let meal: ScheduleItem | null = null

  const currentMinutes = centralHour * 60 + centralMinute

  for (let i = 0; i < SCHEDULE_ITEMS.length; i++) {
    const item = SCHEDULE_ITEMS[i]
    const itemStartMinutes = item.startHour * 60 + item.startMinute
    let itemEndMinutes: number
    if (item.endHour !== undefined && item.endMinute !== undefined) {
      itemEndMinutes = item.endHour * 60 + item.endMinute
    } else {
      itemEndMinutes = itemStartMinutes + 60
    }

    if (item.date < centralDateStr) {
      prev = item
      continue
    }

    if (item.date === centralDateStr) {
      if (currentMinutes >= itemStartMinutes && currentMinutes < itemEndMinutes) {
        current = item
      } else if (itemEndMinutes <= currentMinutes) {
        prev = item
      } else if (itemStartMinutes > currentMinutes && !next) {
        next = item
      }
    } else if (item.date > centralDateStr && !next) {
      next = item
    }
  }

  for (const item of SCHEDULE_ITEMS) {
    if (!item.isMeal) continue
    if (item.date < centralDateStr) continue

    const itemStartMinutes = item.startHour * 60 + item.startMinute

    if (item.date === centralDateStr && itemStartMinutes > currentMinutes) {
      meal = item
      break
    } else if (item.date > centralDateStr) {
      meal = item
      break
    }
  }

  if (current?.isMeal && !meal) {
    meal = current
  }

  const todayUpcoming: ScheduleItem[] = []
  for (const item of SCHEDULE_ITEMS) {
    if (item.date !== centralDateStr) continue
    const itemStartMinutes = item.startHour * 60 + item.startMinute
    if (itemStartMinutes > currentMinutes) {
      todayUpcoming.push(item)
    }
  }

  const allUpcoming: ScheduleItem[] = []
  for (const item of SCHEDULE_ITEMS) {
    if (item.date < centralDateStr) continue
    if (item.date === centralDateStr) {
      const itemStartMinutes = item.startHour * 60 + item.startMinute
      if (itemStartMinutes > currentMinutes) {
        allUpcoming.push(item)
      }
    } else {
      allUpcoming.push(item)
    }
  }

  return {
    nowItem: current,
    nextItem: next,
    prevItem: prev,
    nextMeal: meal,
    upcomingToday: todayUpcoming,
    upcomingAll: allUpcoming,
  }
}
