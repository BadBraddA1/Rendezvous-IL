package com.rendezvousil.app.ui.admin

import com.rendezvousil.core.network.dto.AdminUserRecord
import java.time.Instant
import java.time.LocalDateTime
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.time.format.DateTimeParseException

private val displayFormatter = DateTimeFormatter.ofPattern("MMM d, yyyy h:mm a")

fun AdminUserRecord.bestLastSeenLabel(): String? {
    val timestamps = buildList {
        parseIsoDate(lastSeenAt)?.let { add(it) }
        lastActiveAt?.let { add(Instant.ofEpochMilli(it)) }
        lastSignInAt?.let { add(Instant.ofEpochMilli(it)) }
    }
    val latest = timestamps.maxOrNull() ?: return null
    return displayFormatter.format(latest.atZone(ZoneId.systemDefault()))
}

private fun parseIsoDate(value: String?): Instant? {
    if (value.isNullOrBlank()) return null
    return try {
        Instant.parse(value)
    } catch (_: DateTimeParseException) {
        try {
            LocalDateTime.parse(value, DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"))
                .atZone(ZoneId.systemDefault())
                .toInstant()
        } catch (_: DateTimeParseException) {
            null
        }
    }
}
