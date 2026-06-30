package com.rendezvousil.app.data

import android.content.Context
import com.rendezvousil.core.schedule.model.NowNextResult
import com.rendezvousil.core.schedule.model.SchedulePayload
import com.rendezvousil.widgets.ScheduleSnapshotStore
import com.rendezvousil.widgets.WidgetRefresh
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch

/**
 * Publishes schedule snapshots for home screen widgets after the repository loads schedule data.
 */
object ScheduleSnapshotPublisher {
    fun publish(
        context: Context,
        schedule: SchedulePayload?,
        nowNext: NowNextResult,
        scope: CoroutineScope,
    ) {
        ScheduleSnapshotStore.publish(context, schedule, nowNext)
        scope.launch {
            WidgetRefresh.updateAll(context)
        }
    }
}
