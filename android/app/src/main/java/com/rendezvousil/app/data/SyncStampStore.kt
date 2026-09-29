package com.rendezvousil.app.data

import android.content.Context
import android.text.format.DateUtils
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp

/** Persists last successful network sync timestamps for offline-aware footers. */
object SyncStampStore {
    private const val PREFS = "sync_stamps"
    private const val PREFIX = "syncStamp."

    fun mark(context: Context, key: String, atMillis: Long = System.currentTimeMillis()) {
        context.applicationContext
            .getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit()
            .putLong(PREFIX + key, atMillis)
            .apply()
    }

    fun millis(context: Context, key: String): Long? {
        val value = context.applicationContext
            .getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .getLong(PREFIX + key, 0L)
        return value.takeIf { it > 0L }
    }

    fun label(context: Context, key: String, hasLocalData: Boolean): String {
        val stamp = millis(context, key)
        if (stamp != null) {
            val relative = DateUtils.getRelativeTimeSpanString(
                stamp,
                System.currentTimeMillis(),
                DateUtils.MINUTE_IN_MILLIS,
                DateUtils.FORMAT_ABBREV_RELATIVE,
            )
            return "On this device · synced $relative"
        }
        return if (hasLocalData) {
            "On this device · not synced yet this session"
        } else {
            "Nothing downloaded yet"
        }
    }
}

@Composable
fun SyncStatusFooter(
    key: String,
    hasLocalData: Boolean,
    modifier: Modifier = Modifier,
) {
    val context = LocalContext.current
    Text(
        text = SyncStampStore.label(context, key, hasLocalData),
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 6.dp),
        style = MaterialTheme.typography.labelSmall,
        color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f),
    )
}
