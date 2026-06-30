package com.rendezvousil.core.schedule

import com.rendezvousil.core.schedule.model.LUScheduleItem
import com.rendezvousil.core.schedule.model.NowNextResult
import com.rendezvousil.core.schedule.model.SchedulePayload
import kotlinx.serialization.Serializable

/** SharedPreferences file + key used by the app and home screen widgets. */
object ScheduleSnapshotPrefs {
    const val PREFS_NAME = "com.rendezvousil.app.schedule"
    const val SNAPSHOT_KEY = "schedule_snapshot"
}

/**
 * Persisted schedule snapshot for widgets — mirrors iOS [SharedScheduleSnapshot].
 */
@Serializable
data class SharedScheduleSnapshot(
    val eventYear: Int,
    val dateRange: String,
    val currentTitle: String? = null,
    val currentTime: String? = null,
    val currentLocation: String? = null,
    val nextTitle: String? = null,
    val nextTime: String? = null,
    val nextLocation: String? = null,
    val nextDay: String? = null,
    val registrationOpens: String,
    val luItems: List<LUScheduleItem>,
    val lastUpdated: Long,
)

object SharedScheduleSnapshotFactory {
    fun from(
        schedule: SchedulePayload?,
        nowNext: NowNextResult,
        registrationOpens: String = "January 1, 2027",
    ): SharedScheduleSnapshot? {
        if (schedule == null) return null
        return SharedScheduleSnapshot(
            eventYear = schedule.year,
            dateRange = schedule.dateRange,
            currentTitle = nowNext.current?.title,
            currentTime = nowNext.current?.time,
            currentLocation = nowNext.current?.location,
            nextTitle = nowNext.next?.title,
            nextTime = nowNext.next?.time,
            nextLocation = nowNext.next?.location,
            nextDay = nowNext.next?.day,
            registrationOpens = registrationOpens,
            luItems = schedule.luItems,
            lastUpdated = System.currentTimeMillis(),
        )
    }
}
