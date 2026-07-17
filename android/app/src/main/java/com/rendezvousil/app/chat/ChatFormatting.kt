package com.rendezvousil.app.chat

import com.rendezvousil.core.network.dto.ChatChannelSummary
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

object ChatFormatting {
    /** Parse API / SQLite chat timestamps. Bare `YYYY-MM-DD HH:mm:ss` is UTC. */
    fun parseTimestamp(raw: String?): Date? {
        val value = raw?.trim().orEmpty()
        if (value.isEmpty()) return null

        isoFormats.forEach { formatter ->
            runCatching { formatter.parse(value) }.getOrNull()?.let { return it }
        }

        sqliteUtcFormats.forEach { formatter ->
            runCatching { formatter.parse(value) }.getOrNull()?.let { return it }
        }

        if (!value.contains('Z') && !value.contains('+')) {
            val withT = if (value.contains('T')) value else value.replace(' ', 'T')
            runCatching { isoFormats[1].parse("${withT}Z") }.getOrNull()?.let { return it }
        }
        return null
    }

    fun relativeTime(raw: String?): String {
        val date = parseTimestamp(raw) ?: return raw.orEmpty()
        return displayFormat.format(date)
    }

    private val isoFormats: List<SimpleDateFormat> = listOf(
        SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSSXXX", Locale.US),
        SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ssXXX", Locale.US),
        SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US).apply {
            timeZone = TimeZone.getTimeZone("UTC")
        },
    )

    private val sqliteUtcFormats: List<SimpleDateFormat> = listOf(
        "yyyy-MM-dd HH:mm:ss",
        "yyyy-MM-dd'T'HH:mm:ss",
    ).map { pattern ->
        SimpleDateFormat(pattern, Locale.US).apply {
            timeZone = TimeZone.getTimeZone("UTC")
        }
    }

    private val displayFormat = SimpleDateFormat("MMM d, yyyy h:mm a", Locale.getDefault())
}

fun List<ChatChannelSummary>.sortedForDisplay(): List<ChatChannelSummary> =
    sortedWith(
        compareByDescending<ChatChannelSummary> {
            ChatFormatting.parseTimestamp(it.last_message_at)?.time ?: 0L
        }.thenByDescending { it.unreadCount }
            .thenBy { it.is_test }
            .thenBy { it.name },
    )
