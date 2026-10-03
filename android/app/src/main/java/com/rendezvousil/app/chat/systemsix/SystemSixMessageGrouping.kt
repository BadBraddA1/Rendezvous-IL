package com.rendezvousil.app.chat.systemsix

import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.time.format.FormatStyle
import java.util.Locale

data class SystemSixDayBlock<Message>(
    val dayKey: String,
    val label: String,
    val groups: List<SystemSixMessageGroup<Message>>,
)

data class SystemSixMessageGroup<Message>(
    val id: String,
    val senderId: String,
    val messages: List<Message>,
)

object SystemSixMessageGrouping {
    fun parseCreatedAt(raw: String): Instant {
        return runCatching { Instant.parse(raw) }
            .getOrElse { Instant.EPOCH }
    }

    fun formatExactTime(instant: Instant, zone: ZoneId = ZoneId.systemDefault()): String {
        val time = instant.atZone(zone).toLocalTime()
        return time.format(DateTimeFormatter.ofLocalizedTime(FormatStyle.SHORT).withLocale(Locale.getDefault()))
    }

    private fun dayKey(instant: Instant, zone: ZoneId): String {
        return instant.atZone(zone).toLocalDate().toString()
    }

    private fun dayLabel(date: LocalDate, today: LocalDate): String {
        return when (date) {
            today -> "Today"
            today.minusDays(1) -> "Yesterday"
            else -> date.format(
                DateTimeFormatter.ofPattern("EEE, MMM d", Locale.getDefault()),
            )
        }
    }

    fun <Message> group(
        messages: List<Message>,
        senderId: (Message) -> String,
        createdAt: (Message) -> Instant,
        id: (Message) -> String,
        windowMs: Long = SystemSixConfig.GROUP_WINDOW_MS,
        zone: ZoneId = ZoneId.systemDefault(),
    ): List<SystemSixDayBlock<Message>> {
        val sorted = messages.sortedBy(createdAt)
        val today = LocalDate.now(zone)
        val days = mutableListOf<MutableDay<Message>>()

        for (message in sorted) {
            val created = createdAt(message)
            val key = dayKey(created, zone)
            val sid = senderId(message)

            val day = days.lastOrNull()
            if (day == null || day.dayKey != key) {
                days.add(
                    MutableDay(
                        dayKey = key,
                        label = dayLabel(created.atZone(zone).toLocalDate(), today),
                        groups = mutableListOf(),
                    ),
                )
            }
            val dayRef = days.last()

            val lastGroup = dayRef.groups.lastOrNull()
            val lastMessage = lastGroup?.messages?.lastOrNull()
            val sameSender = lastGroup?.senderId == sid
            val withinWindow = lastMessage?.let {
                created.toEpochMilli() - createdAt(it).toEpochMilli() <= windowMs
            } == true

            if (lastGroup != null && sameSender && withinWindow) {
                val updated = lastGroup.copy(messages = lastGroup.messages + message)
                dayRef.groups[dayRef.groups.lastIndex] = updated
            } else {
                dayRef.groups.add(
                    SystemSixMessageGroup(
                        id = "$sid-${id(message)}",
                        senderId = sid,
                        messages = listOf(message),
                    ),
                )
            }
        }

        return days.map { SystemSixDayBlock(it.dayKey, it.label, it.groups.toList()) }
    }

    private data class MutableDay<Message>(
        val dayKey: String,
        val label: String,
        val groups: MutableList<SystemSixMessageGroup<Message>>,
    )
}
