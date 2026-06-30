package com.rendezvousil.app.notifications

import kotlinx.serialization.Serializable

/** Mirrors iOS `EventReminderOffset`. */
enum class EventReminderOffset(val minutes: Int) {
    AT_START(0),
    MINUTES_5(5),
    MINUTES_15(15),
    MINUTES_30(30),
    HOUR_1(60),
    ;

    val label: String
        get() = when (this) {
            AT_START -> "When it starts"
            MINUTES_5 -> "5 minutes before"
            MINUTES_15 -> "15 minutes before"
            MINUTES_30 -> "30 minutes before"
            HOUR_1 -> "1 hour before"
        }

    companion object {
        val allCases: List<EventReminderOffset> = entries
    }
}

@Serializable
data class EventReminderPreference(
    val eventId: String,
    val offset: Int,
)
