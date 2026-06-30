package com.rendezvousil.app.notifications

import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import com.rendezvousil.app.RendezvousApplication
import kotlinx.coroutines.launch

class RendezvousFirebaseMessagingService : FirebaseMessagingService() {
    override fun onMessageReceived(message: RemoteMessage) {
        val title = message.notification?.title
            ?: message.data["title"]
            ?: "Rendezvous IL"
        val body = message.notification?.body
            ?: message.data["body"]
            ?: message.data["message"]
            ?: ""
        val deepLink = message.data["url"] ?: "rendezvousil://schedule"

        NotificationHelper.showNotification(
            context = applicationContext,
            notificationId = (title + body).hashCode(),
            channelId = NotificationHelper.CHANNEL_BROADCAST,
            title = title,
            body = body,
            deepLink = deepLink,
        )
    }

    override fun onNewToken(token: String) {
        super.onNewToken(token)
        val app = application as? RendezvousApplication ?: return
        app.applicationScope.launch {
            app.fcmRegistrationService.registerIfEnabled()
        }
    }
}
