package com.rendezvousil.app.notifications

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.rendezvousil.core.schedule.ScheduleNowNext
import com.rendezvousil.core.schedule.model.LUScheduleItem
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import java.time.Instant

private val Context.reminderDataStore: DataStore<Preferences> by preferencesDataStore(
    name = "event_reminders",
)

class ReminderService(
    private val context: Context,
) {
    private val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    private val json = Json { ignoreUnknownKeys = true }

    suspend fun preference(eventId: String): EventReminderOffset? {
        val prefs = load()
        val raw = prefs.firstOrNull { it.eventId == eventId }?.offset ?: return null
        return EventReminderOffset.entries.firstOrNull { it.minutes == raw }
    }

    suspend fun setReminder(
        item: LUScheduleItem,
        offset: EventReminderOffset?,
        allItems: List<LUScheduleItem>?,
    ) {
        val updated = load().filter { it.eventId != item.id }.toMutableList()
        if (offset != null) {
            updated.add(EventReminderPreference(eventId = item.id, offset = offset.minutes))
        }
        save(updated)
        rescheduleAll(items = allItems)
    }

    suspend fun rescheduleAll(items: List<LUScheduleItem>?) {
        cancelAllReminderAlarms()
        val prefs = load()
        if (prefs.isEmpty()) return

        val luItems = items ?: return
        val itemMap = luItems.associateBy { it.id }
        val now = Instant.now()

        NotificationHelper.ensureChannels(context)

        for (pref in prefs) {
            val item = itemMap[pref.eventId] ?: continue
            val offset = EventReminderOffset.entries.firstOrNull { it.minutes == pref.offset }
                ?: continue
            val startInstant = ScheduleNowNext.eventStartInstant(item) ?: continue
            val triggerInstant = startInstant.minusSeconds(offset.minutes.toLong() * 60)
            if (!triggerInstant.isAfter(now)) continue

            val title = if (offset == EventReminderOffset.AT_START) {
                item.title
            } else {
                "Up next: ${item.title}"
            }
            val body = listOfNotNull(item.day, item.time, item.location)
                .joinToString(" · ")

            scheduleAlarm(
                item = item,
                offset = offset,
                triggerAtMillis = triggerInstant.toEpochMilli(),
                title = title,
                body = body,
            )
        }
    }

    private fun scheduleAlarm(
        item: LUScheduleItem,
        offset: EventReminderOffset,
        triggerAtMillis: Long,
        title: String,
        body: String,
    ) {
        val requestCode = alarmRequestCode(item.id, offset)
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
            alarmManager.setAndAllowWhileIdle(
                AlarmManager.RTC_WAKEUP,
                triggerAtMillis,
                pendingIntent,
            )
        } else {
            alarmManager.setExactAndAllowWhileIdle(
                AlarmManager.RTC_WAKEUP,
                triggerAtMillis,
                pendingIntent,
            )
        }
    }

    private suspend fun cancelAllReminderAlarms() {
        val prefs = load()

        for (pref in prefs) {
            for (offset in EventReminderOffset.allCases) {
                val requestCode = alarmRequestCode(pref.eventId, offset)
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
        }
    }

    private suspend fun load(): List<EventReminderPreference> {
        val raw = context.reminderDataStore.data
            .map { prefs -> prefs[STORAGE_KEY].orEmpty() }
            .first()
        if (raw.isBlank()) return emptyList()
        return runCatching { json.decodeFromString<List<EventReminderPreference>>(raw) }
            .getOrDefault(emptyList())
    }

    private suspend fun save(prefs: List<EventReminderPreference>) {
        context.reminderDataStore.edit { store ->
            store[STORAGE_KEY] = json.encodeToString(prefs)
        }
    }

    companion object {
        private val STORAGE_KEY = stringPreferencesKey("event.reminders")

        private fun alarmRequestCode(eventId: String, offset: EventReminderOffset): Int =
            "rendezvous-reminder-$eventId-${offset.minutes}".hashCode()
    }
}
