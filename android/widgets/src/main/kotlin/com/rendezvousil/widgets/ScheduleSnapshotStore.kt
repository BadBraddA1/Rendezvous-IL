package com.rendezvousil.widgets

import android.content.Context
import com.rendezvousil.core.schedule.ScheduleSnapshotPrefs
import com.rendezvousil.core.schedule.SharedScheduleSnapshot
import com.rendezvousil.core.schedule.SharedScheduleSnapshotFactory
import com.rendezvousil.core.schedule.model.NowNextResult
import com.rendezvousil.core.schedule.model.SchedulePayload
import kotlinx.serialization.json.Json

/**
 * Saves and loads [SharedScheduleSnapshot] JSON to app-private SharedPreferences.
 * Used by the main app (publish) and Glance widgets (load).
 */
object ScheduleSnapshotStore {
    private val json = Json {
        ignoreUnknownKeys = true
        encodeDefaults = true
    }

    fun publish(
        context: Context,
        schedule: SchedulePayload?,
        nowNext: NowNextResult,
        registrationOpens: String = "January 1, 2027",
    ) {
        val snapshot = SharedScheduleSnapshotFactory.from(
            schedule = schedule,
            nowNext = nowNext,
            registrationOpens = registrationOpens,
        ) ?: return
        save(context, snapshot)
    }

    fun save(context: Context, snapshot: SharedScheduleSnapshot) {
        val encoded = json.encodeToString(SharedScheduleSnapshot.serializer(), snapshot)
        prefs(context).edit().putString(ScheduleSnapshotPrefs.SNAPSHOT_KEY, encoded).apply()
    }

    fun load(context: Context): SharedScheduleSnapshot? {
        val encoded = prefs(context).getString(ScheduleSnapshotPrefs.SNAPSHOT_KEY, null) ?: return null
        return runCatching {
            json.decodeFromString(SharedScheduleSnapshot.serializer(), encoded)
        }.getOrNull()
    }

    private fun prefs(context: Context) =
        context.applicationContext.getSharedPreferences(
            ScheduleSnapshotPrefs.PREFS_NAME,
            Context.MODE_PRIVATE,
        )
}
