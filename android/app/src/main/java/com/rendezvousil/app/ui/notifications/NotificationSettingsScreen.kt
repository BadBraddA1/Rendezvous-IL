package com.rendezvousil.app.ui.notifications

import android.Manifest
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import com.rendezvousil.app.notifications.NotificationHelper
import com.rendezvousil.app.notifications.NotificationPreferences
import com.rendezvousil.app.notifications.ReminderService
import com.rendezvousil.app.theme.BrandColors
import com.rendezvousil.core.network.RendezvousRepository
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NotificationSettingsScreen(
    reminderService: ReminderService,
    notificationPreferences: NotificationPreferences,
    fcmRegistrationService: com.rendezvousil.app.notifications.FcmRegistrationService,
    repository: RendezvousRepository,
    onBack: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var notificationsEnabled by remember { mutableStateOf(NotificationHelper.areNotificationsEnabled(context)) }
    var broadcastAlerts by remember { mutableStateOf(notificationPreferences.broadcastAlertsEnabled) }
    val schedule by repository.schedule.collectAsState()

    val permissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission(),
    ) {
        notificationsEnabled = NotificationHelper.areNotificationsEnabled(context)
        if (notificationsEnabled) {
            scope.launch { fcmRegistrationService.registerIfEnabled() }
        }
    }

    LaunchedEffect(Unit) {
        notificationsEnabled = NotificationHelper.areNotificationsEnabled(context)
    }

    Scaffold(
        modifier = modifier,
        topBar = {
            TopAppBar(
                title = { Text("Notifications") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
            )
        },
        containerColor = BrandColors.GroupedBackground,
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
        ) {
            SectionHeader("Permission")
            SettingsRow(
                label = "Permission",
                value = permissionStatusLabel(notificationsEnabled, context),
            )
            if (!notificationsEnabled && Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                Button(
                    onClick = { permissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS) },
                    modifier = Modifier.padding(top = 8.dp),
                ) {
                    Text("Enable notifications")
                }
            } else if (!notificationsEnabled) {
                Button(
                    onClick = {
                        context.startActivity(
                            Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).apply {
                                putExtra(Settings.EXTRA_APP_PACKAGE, context.packageName)
                            },
                        )
                    },
                    modifier = Modifier.padding(top = 8.dp),
                ) {
                    Text("Open Settings")
                }
            }
            Text(
                text = "Event reminders are scheduled on your device. Retreat-wide alerts use Firebase Cloud Messaging (FCM).",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(top = 8.dp, bottom = 16.dp),
            )

            HorizontalDivider()
            SectionHeader("Retreat alerts")
            SettingsToggleRow(
                label = "Organizer announcements (FCM)",
                checked = broadcastAlerts,
                onCheckedChange = { enabled ->
                    broadcastAlerts = enabled
                    notificationPreferences.broadcastAlertsEnabled = enabled
                    scope.launch { fcmRegistrationService.onBroadcastAlertsToggled(enabled) }
                },
            )

            HorizontalDivider(modifier = Modifier.padding(vertical = 16.dp))
            SectionHeader("Event reminders")
            Text(
                text = "Open any event on the Schedule tab and tap the bell to set a reminder (5 min, 15 min, 1 hour before, or at start).",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(bottom = 12.dp),
            )
            Button(
                onClick = {
                    scope.launch {
                        reminderService.rescheduleAll(schedule?.luItems)
                    }
                },
            ) {
                Text("Reschedule saved reminders")
            }

            HorizontalDivider(modifier = Modifier.padding(vertical = 16.dp))
            SectionHeader("Widgets")
            Text(
                text = "Add the Rendezvous widget from your Home Screen for now/next at a glance (iOS today; Android widgets coming later).",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

@Composable
private fun SectionHeader(title: String) {
    Text(
        text = title,
        style = MaterialTheme.typography.titleSmall,
        color = BrandColors.Lake,
        modifier = Modifier.padding(vertical = 8.dp),
    )
}

@Composable
private fun SettingsRow(label: String, value: String) {
    Column(modifier = Modifier.padding(vertical = 4.dp)) {
        Text(text = label, style = MaterialTheme.typography.bodyMedium)
        Text(
            text = value,
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@Composable
private fun SettingsToggleRow(
    label: String,
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit,
) {
    androidx.compose.foundation.layout.Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 8.dp),
        horizontalArrangement = androidx.compose.foundation.layout.Arrangement.SpaceBetween,
        verticalAlignment = androidx.compose.ui.Alignment.CenterVertically,
    ) {
        Text(text = label, modifier = Modifier.weight(1f))
        Switch(checked = checked, onCheckedChange = onCheckedChange)
    }
}

private fun permissionStatusLabel(enabled: Boolean, context: android.content.Context): String {
    if (enabled) return "Allowed"
    return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) "Not asked" else "Denied"
}
