package com.rendezvousil.app

import android.Manifest
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.lifecycleScope
import com.rendezvousil.app.navigation.Routes
import com.rendezvousil.app.notifications.NotificationHelper
import com.rendezvousil.app.theme.RendezvousTheme
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {
    private var deepLinkRoute by mutableStateOf<String?>(null)

    private val notificationPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission(),
    ) { /* Settings screen handles follow-up */ }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        val app = application as RendezvousApplication

        handleDeepLink(intent)
        requestNotificationPermissionIfNeeded()

        lifecycleScope.launch {
            app.appSession.bootstrapAuthIfNeeded()
            app.fcmRegistrationService.registerIfEnabled()
        }

        lifecycle.addObserver(
            LifecycleEventObserver { _, event ->
                if (event == Lifecycle.Event.ON_RESUME) {
                    lifecycleScope.launch {
                        app.appSession.recordActivityIfSignedIn()
                        // Refresh schedule in the background so admin edits show without force-stop.
                        app.repository.loadScheduleBundle()
                        app.repository.loadScheduleExtras()
                    }
                }
            },
        )

        setContent {
            RendezvousTheme {
                RendezvousApp(
                    repository = app.repository,
                    appSession = app.appSession,
                    reminderService = app.reminderService,
                    notificationPreferences = app.notificationPreferences,
                    fcmRegistrationService = app.fcmRegistrationService,
                    deepLinkRoute = deepLinkRoute,
                    onDeepLinkConsumed = { deepLinkRoute = null },
                )
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        handleDeepLink(intent)
    }

    private fun handleDeepLink(intent: Intent?) {
        val uri: Uri = intent?.data ?: return
        if (uri.scheme == "rendezvousil" && uri.host == "schedule") {
            deepLinkRoute = Routes.SCHEDULE
        }
    }

    private fun requestNotificationPermissionIfNeeded() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return
        if (NotificationHelper.areNotificationsEnabled(this)) return
        notificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
    }
}
