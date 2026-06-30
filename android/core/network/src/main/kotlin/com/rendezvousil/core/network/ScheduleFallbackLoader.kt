package com.rendezvousil.core.network

import com.rendezvousil.core.schedule.model.SchedulePayload

/**
 * Loads bundled schedule JSON from app assets (e.g. `schedule-fallback.json`).
 * Implemented by the `:app` module.
 */
fun interface ScheduleFallbackLoader {
    fun loadBundledSchedule(): SchedulePayload?
}
