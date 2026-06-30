package com.rendezvousil.app.notifications

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class ReminderReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val title = intent.getStringExtra(EXTRA_TITLE) ?: return
        val body = intent.getStringExtra(EXTRA_BODY).orEmpty()
        val notificationId = intent.getIntExtra(EXTRA_NOTIFICATION_ID, title.hashCode())
        NotificationHelper.showNotification(
            context = context,
            notificationId = notificationId,
            channelId = NotificationHelper.CHANNEL_EVENT_REMINDERS,
            title = title,
            body = body,
            deepLink = "rendezvousil://schedule",
        )
    }

    companion object {
        const val EXTRA_TITLE = "title"
        const val EXTRA_BODY = "body"
        const val EXTRA_NOTIFICATION_ID = "notification_id"
    }
}
