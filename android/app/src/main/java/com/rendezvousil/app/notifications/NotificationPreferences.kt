package com.rendezvousil.app.notifications

import android.content.Context
import android.content.SharedPreferences
import androidx.core.content.edit

class NotificationPreferences(context: Context) {
    private val prefs: SharedPreferences =
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    var broadcastAlertsEnabled: Boolean
        get() = prefs.getBoolean(KEY_BROADCAST_ALERTS, true)
        set(value) {
            prefs.edit { putBoolean(KEY_BROADCAST_ALERTS, value) }
        }

    companion object {
        private const val PREFS_NAME = "notifications"
        private const val KEY_BROADCAST_ALERTS = "notifications.broadcast"
    }
}
