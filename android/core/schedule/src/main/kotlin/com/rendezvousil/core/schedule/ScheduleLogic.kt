package com.rendezvousil.core.schedule

import com.rendezvousil.core.schedule.model.LUScheduleItem
import com.rendezvousil.core.schedule.model.NowNextResult
import com.rendezvousil.core.schedule.model.ScheduleEvent
import java.time.Instant
import java.time.ZoneId
import java.time.ZonedDateTime

object ScheduleNowNext {
    private val chicago: ZoneId = ZoneId.of("America/Chicago")

    fun evaluate(
        items: List<LUScheduleItem>,
        now: Instant = Instant.now(),
    ): NowNextResult {
        val zonedNow = ZonedDateTime.ofInstant(now, chicago)
        val year = zonedNow.year
        val month = zonedNow.monthValue
        val day = zonedNow.dayOfMonth
        val hour = zonedNow.hour
        val minute = zonedNow.minute

        val nowMinutes = hour * 60 + minute
        val todayISO = String.format("%04d-%02d-%02d", year, month, day)

        var current: LUScheduleItem? = null
        var next: LUScheduleItem? = null

        for (item in items) {
            val start = item.startHour * 60 + item.startMinute
            val end = if (item.endHour != null && item.endMinute != null) {
                item.endHour * 60 + item.endMinute
            } else {
                start + 60
            }

            if (item.date != todayISO) {
                if (item.date > todayISO && next == null) {
                    next = item
                }
                continue
            }

            if (nowMinutes >= start && nowMinutes < end) {
                val existing = current
                if (existing == null || start >= existing.startHour * 60 + existing.startMinute) {
                    current = item
                }
            } else if (nowMinutes < start && next == null) {
                next = item
            }
        }

        val currentItem = current
        if (currentItem != null && next == null) {
            val currentStart = currentItem.startHour * 60 + currentItem.startMinute
            next = items.firstOrNull { item ->
                when {
                    item.date > currentItem.date -> true
                    item.date < currentItem.date -> false
                    else -> item.startHour * 60 + item.startMinute > currentStart
                }
            }
        }

        if (current == null && next == null && todayISO < "2027-05-03") {
            next = items.firstOrNull()
        }

        return NowNextResult(current = current, next = next)
    }

    fun chicagoISODate(now: Instant = Instant.now()): String {
        val zoned = ZonedDateTime.ofInstant(now, chicago)
        return String.format("%04d-%02d-%02d", zoned.year, zoned.monthValue, zoned.dayOfMonth)
    }

    fun todayDayIndex(
        dayDates: Map<String, String>,
        days: List<com.rendezvousil.core.schedule.model.ScheduleDay>,
        now: Instant = Instant.now(),
    ): Int? {
        val todayISO = chicagoISODate(now)
        days.forEachIndexed { index, day ->
            val iso = dayDates[day.day] ?: day.day.takeIf { it.matches(Regex("""\d{4}-\d{2}-\d{2}""")) }
            if (iso == todayISO) return index
        }
        return null
    }

    fun preferredDayIndex(
        dayDates: Map<String, String>,
        days: List<com.rendezvousil.core.schedule.model.ScheduleDay>,
        now: Instant = Instant.now(),
    ): Int {
        todayDayIndex(dayDates, days, now)?.let { return it }
        val todayISO = chicagoISODate(now)
        days.forEachIndexed { index, day ->
            val iso = dayDates[day.day] ?: day.day.takeIf { it.matches(Regex("""\d{4}-\d{2}-\d{2}""")) }
            if (iso != null && iso >= todayISO) return index
        }
        return (days.size - 1).coerceAtLeast(0)
    }

    fun eventStartInstant(item: LUScheduleItem): Instant? {
        val parts = item.date.split("-").mapNotNull { it.toIntOrNull() }
        if (parts.size != 3) return null
        val zoned = ZonedDateTime.of(
            parts[0],
            parts[1],
            parts[2],
            item.startHour,
            item.startMinute,
            0,
            0,
            chicago,
        )
        return zoned.toInstant()
    }
}

object MealMatcher {
    fun mealTypeFor(title: String): String? {
        val lower = title.lowercase()
        return when {
            lower.contains("breakfast") -> "breakfast"
            lower.contains("lunch") -> "lunch"
            lower.contains("dinner") || lower.contains("cookout") -> "dinner"
            else -> null
        }
    }
}

object AssemblyMatcher {
    fun timeSlotFor(title: String, time: String): String? {
        val lower = title.lowercase()
        if (!lower.contains("assembly")) return null
        val upper = time.uppercase()
        if (upper.contains("9:00") && upper.contains("AM")) return "Morning Devotion"
        if (upper.contains("7:00") && upper.contains("PM")) return "Evening Devotion"
        if (lower.contains("morning")) return "Morning Devotion"
        if (lower.contains("evening")) return "Evening Devotion"
        return null
    }
}

fun matchingLUItem(
    event: ScheduleEvent,
    isoDate: String,
    items: List<LUScheduleItem>,
): LUScheduleItem? =
    items.firstOrNull { it.date == isoDate && it.title == event.title && it.time == event.time }
        ?: items.firstOrNull { it.date == isoDate && it.title == event.title }
