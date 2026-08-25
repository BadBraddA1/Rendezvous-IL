package com.rendezvousil.core.schedule.model

import java.time.LocalDate
import java.time.format.TextStyle
import java.util.Locale
import kotlinx.serialization.Serializable

@Serializable
data class SchedulePayload(
    val year: Int,
    val dateRange: String,
    val location: String,
    val draftNotice: String,
    val days: List<ScheduleDay>,
    val dayDates: Map<String, String>,
    val luItems: List<LUScheduleItem>,
)

@Serializable
data class ScheduleDay(
    /** Opaque day key: weekday name for retreat days, or yyyy-MM-dd for key dates. */
    val day: String,
    /** Display weekday ("Friday"). Present for key dates; may be null in older caches. */
    val weekday: String? = null,
    /** Short calendar label ("January 1" / "May 3"). */
    val date: String,
    val color: String,
    val events: List<ScheduleEvent>,
) {
    val id: String get() = day

    val displayWeekday: String
        get() {
            weekday?.takeIf { it.isNotBlank() }?.let { return it }
            if (ISO_DATE.matches(day)) {
                return runCatching {
                    val parsed = LocalDate.parse(day)
                    parsed.dayOfWeek.getDisplayName(TextStyle.FULL, Locale.US)
                }.getOrElse { day }
            }
            return day
        }

    val weekdayShort: String
        get() = displayWeekday.take(3)

    val isKeyDate: Boolean
        get() = ISO_DATE.matches(day)

    companion object {
        private val ISO_DATE = Regex("""^\d{4}-\d{2}-\d{2}$""")
    }
}

@Serializable
data class ScheduleEvent(
    val time: String,
    val title: String,
    val location: String? = null,
    val note: String? = null,
) {
    val id: String get() = "$time-$title"
}

@Serializable
data class LUScheduleItem(
    val date: String,
    val day: String,
    val time: String,
    val startHour: Int,
    val startMinute: Int,
    val endHour: Int? = null,
    val endMinute: Int? = null,
    val title: String,
    val location: String? = null,
    val isMeal: Boolean? = null,
) {
    val id: String get() = "$date-$time-$title"
}

data class NowNextResult(
    val current: LUScheduleItem? = null,
    val next: LUScheduleItem? = null,
)

@Serializable
data class Meal(
    val id: Int,
    val date: String,
    val meal_type: String,
    val main_dish: String,
    val sides: List<String>? = null,
    val dessert: String? = null,
    val drinks: List<String>? = null,
    val notes: String? = null,
    val title: String? = null,
)

@Serializable
data class Announcement(
    val id: Int,
    val title: String,
    val message: String,
    val priority: String,
    val created_at: String? = null,
)

@Serializable
data class VolunteerScheduleSlot(
    val openingPrayer: String? = null,
    val leadingSingingA: String? = null,
    val leadingSingingB: String? = null,
    val readingScriptureA: String? = null,
    val presentingLessonA: String? = null,
    val lessonTitleA: String? = null,
    val lessonScriptureA: String? = null,
    val readingScriptureB: String? = null,
    val presentingLessonB: String? = null,
    val lessonTitleB: String? = null,
    val lessonScriptureB: String? = null,
    val closingPrayer: String? = null,
)

@Serializable
data class Rate(
    val id: Int,
    val category: String,
    val name: String,
    val label: String,
    val amount: String,
    val description: String? = null,
)

enum class LodgingType(val rawValue: String) {
    MOTEL("motel"),
    RV("rv"),
    TENT("tent"),
    DRIVEIN("drivein"),
    ;

    val label: String
        get() = when (this) {
            MOTEL -> "Motel"
            RV -> "RV"
            TENT -> "Tent"
            DRIVEIN -> "Drive-in"
        }

    companion object {
        val allCases: List<LodgingType> = entries
    }
}

data class CostBreakdown(
    val adults: Double,
    val youth: Double,
    val children: Double,
    val adultUnit: Double,
    val youthUnit: Double,
    val childUnit: Double,
    val siteFee: Double,
    val siteNightRate: Double,
    val total: Double,
)
