package com.rendezvousil.app.notifications

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import com.rendezvousil.core.network.dto.FamilyVolunteeringResponse
import java.time.Instant
import java.time.OffsetDateTime
import java.time.format.DateTimeParseException

/** Schedules a local alarm 30 minutes before each volunteering start. */
class VolunteerReminderService(
    private val context: Context,
) {
    private val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    private val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    fun sync(payload: FamilyVolunteeringResponse?) {
        cancelAll()
        if (payload == null) return

        NotificationHelper.ensureChannels(context)
        val now = Instant.now()
        val scheduledIds = mutableSetOf<String>()

        for (volunteer in payload.volunteers) {
            val worship = volunteer.worshipAssignment ?: continue
            val startsAt = worship.startsAt?.takeIf { it.isNotBlank() } ?: continue
            val start = parseInstant(startsAt) ?: continue
            val trigger = start.minusSeconds(MINUTES_BEFORE * 60L)
            if (!trigger.isAfter(now)) continue
            val id = "worship-${volunteer.id}"
            scheduleAlarm(
                id = id,
                title = "Volunteering in ${MINUTES_BEFORE}m",
                body = "${volunteer.volunteerName} · ${worship.roleLabel}",
                triggerAtMillis = trigger.toEpochMilli(),
            )
            scheduledIds.add(id)
        }

        for (item in payload.specialAssignments) {
            val startsAt = item.startsAt?.takeIf { it.isNotBlank() } ?: continue
            val start = parseInstant(startsAt) ?: continue
            val trigger = start.minusSeconds(MINUTES_BEFORE * 60L)
            if (!trigger.isAfter(now)) continue
            val id = "special-${item.id}"
            scheduleAlarm(
                id = id,
                title = "Volunteering in ${MINUTES_BEFORE}m",
                body = "${item.matchedName} · ${item.activityName}",
                triggerAtMillis = trigger.toEpochMilli(),
            )
            scheduledIds.add(id)
        }

        prefs.edit().putStringSet(KEY_IDS, scheduledIds).apply()
    }

    private fun scheduleAlarm(
        id: String,
        title: String,
        body: String,
        triggerAtMillis: Long,
    ) {
        val requestCode = alarmRequestCode(id)
        val intent = Intent(context, ReminderReceiver::class.java).apply {
            putExtra(ReminderReceiver.EXTRA_TITLE, title)
            putExtra(ReminderReceiver.EXTRA_BODY, body)
            putExtra(ReminderReceiver.EXTRA_NOTIFICATION_ID, requestCode)
        }
        val pendingIntent = PendingIntent.getBroadcast(
            context,
            requestCode,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !alarmManager.canScheduleExactAlarms()) {
            alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMillis, pendingIntent)
        } else {
            alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMillis, pendingIntent)
        }
    }

    private fun cancelAll() {
        val ids = prefs.getStringSet(KEY_IDS, emptySet()).orEmpty()
        for (id in ids) {
            val requestCode = alarmRequestCode(id)
            val intent = Intent(context, ReminderReceiver::class.java)
            val pendingIntent = PendingIntent.getBroadcast(
                context,
                requestCode,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
            )
            alarmManager.cancel(pendingIntent)
            pendingIntent.cancel()
        }
        prefs.edit().remove(KEY_IDS).apply()
    }

    companion object {
        private const val MINUTES_BEFORE = 30
        private const val PREFS = "volunteer_reminders"
        private const val KEY_IDS = "scheduled_ids"

        private fun alarmRequestCode(id: String): Int =
            "rendezvous-volunteer-$id".hashCode()

        private fun parseInstant(raw: String): Instant? =
            try {
                OffsetDateTime.parse(raw).toInstant()
            } catch (_: DateTimeParseException) {
                runCatching { Instant.parse(raw) }.getOrNull()
            }
    }
}
