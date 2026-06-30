package com.rendezvousil.app.data

import android.content.Context
import com.rendezvousil.core.network.ApiClient
import com.rendezvousil.core.network.ScheduleFallbackLoader
import com.rendezvousil.core.schedule.model.SchedulePayload

class AssetScheduleFallbackLoader(
    private val context: Context,
) : ScheduleFallbackLoader {
    override fun loadBundledSchedule(): SchedulePayload? {
        return try {
            context.assets.open("schedule-fallback.json").bufferedReader().use { reader ->
                ApiClient.decodeSchedulePayload(reader.readText())
            }
        } catch (_: Exception) {
            null
        }
    }
}
