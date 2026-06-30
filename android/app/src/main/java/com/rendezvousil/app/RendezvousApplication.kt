package com.rendezvousil.app

import android.app.Application
import com.clerk.api.Clerk
import com.rendezvousil.app.auth.ClerkAppSession
import com.rendezvousil.app.auth.AppSession
import com.rendezvousil.app.data.AssetScheduleFallbackLoader
import com.rendezvousil.app.data.ScheduleSnapshotPublisher
import com.rendezvousil.app.notifications.FcmRegistrationService
import com.rendezvousil.app.notifications.FirebaseAppHolder
import com.rendezvousil.app.notifications.NotificationHelper
import com.rendezvousil.app.notifications.NotificationPreferences
import com.rendezvousil.app.notifications.ReminderService
import com.rendezvousil.core.network.ApiClient
import com.rendezvousil.core.network.RendezvousRepository
import com.rendezvousil.core.schedule.ScheduleNowNext
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.SupervisorJob

class RendezvousApplication : Application() {
    lateinit var repository: RendezvousRepository
        private set

    lateinit var appSession: AppSession
        private set

    lateinit var reminderService: ReminderService
        private set

    lateinit var notificationPreferences: NotificationPreferences
        private set

    lateinit var fcmRegistrationService: FcmRegistrationService
        private set

    val applicationScope = CoroutineScope(SupervisorJob())

    override fun onCreate() {
        super.onCreate()

        initializeFirebase()

        val clerkKey = BuildConfig.CLERK_PUBLISHABLE_KEY
        if (clerkKey.isNotBlank()) {
            Clerk.initialize(
                context = this,
                publishableKey = clerkKey,
            )
        }

        val publicClient = ApiClient.create(baseUrl = BuildConfig.BASE_URL)
        appSession = ClerkAppSession(
            applicationScope = applicationScope,
            baseUrl = BuildConfig.BASE_URL,
            appVersion = BuildConfig.VERSION_NAME,
            clerkPublishableKey = clerkKey,
            publicApiClient = publicClient,
        )

        val fallbackLoader = AssetScheduleFallbackLoader(applicationContext)
        repository = RendezvousRepository(
            apiClient = publicClient,
            fallbackLoader = fallbackLoader,
            onScheduleSynced = { schedule ->
                if (schedule != null) {
                    ScheduleSnapshotPublisher.publish(
                        context = applicationContext,
                        schedule = schedule,
                        nowNext = ScheduleNowNext.evaluate(schedule.luItems),
                        scope = applicationScope,
                    )
                }
            },
        )

        notificationPreferences = NotificationPreferences(this)
        reminderService = ReminderService(this)
        fcmRegistrationService = FcmRegistrationService(this, publicClient, notificationPreferences)
        NotificationHelper.ensureChannels(this)
    }

    private fun initializeFirebase() {
        val projectId = BuildConfig.FIREBASE_PROJECT_ID
        val appId = BuildConfig.FIREBASE_APP_ID
        val apiKey = BuildConfig.FIREBASE_API_KEY
        val gcmSenderId = BuildConfig.FIREBASE_GCM_SENDER_ID

        val manual = if (projectId.isNotBlank() && appId.isNotBlank() && apiKey.isNotBlank() && gcmSenderId.isNotBlank()) {
            FirebaseAppHolder.ManualFirebaseOptions(
                projectId = projectId,
                appId = appId,
                apiKey = apiKey,
                gcmSenderId = gcmSenderId,
            )
        } else {
            null
        }

        FirebaseAppHolder.initialize(this, manual)
    }
}
