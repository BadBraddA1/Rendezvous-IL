package com.rendezvousil.app.ui.schedule

import android.Manifest
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import com.rendezvousil.app.notifications.EventReminderOffset
import com.rendezvousil.app.notifications.NotificationHelper
import com.rendezvousil.app.notifications.ReminderService
import com.rendezvousil.app.theme.BrandColors
import com.rendezvousil.core.schedule.model.LUScheduleItem
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EventReminderSheet(
    item: LUScheduleItem,
    allItems: List<LUScheduleItem>,
    reminderService: ReminderService,
    onDismiss: () -> Unit,
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    var selected by remember { mutableStateOf<EventReminderOffset?>(null) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    val context = LocalContext.current

    val permissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission(),
    ) { granted ->
        if (granted) {
            scope.launch {
                reminderService.setReminder(item, selected, allItems)
                onDismiss()
            }
        } else {
            errorMessage = "Enable notifications in Settings to use reminders."
        }
    }

    LaunchedEffect(item.id) {
        selected = reminderService.preference(item.id)
    }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
    ) {
        Column(modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)) {
            Text(
                text = "Event reminder",
                style = MaterialTheme.typography.titleMedium,
                modifier = Modifier.padding(bottom = 12.dp),
            )
            Text(text = item.title, style = MaterialTheme.typography.titleSmall)
            Text(
                text = "${item.day} · ${item.time}",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            item.location?.let { location ->
                Text(
                    text = location,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }

            Text(
                text = "Remind me",
                style = MaterialTheme.typography.labelLarge,
                color = BrandColors.Lake,
                modifier = Modifier.padding(top = 20.dp, bottom = 8.dp),
            )

            ReminderOption(
                label = "None",
                selected = selected == null,
                onClick = { selected = null },
            )
            EventReminderOffset.allCases.forEach { offset ->
                ReminderOption(
                    label = offset.label,
                    selected = selected == offset,
                    onClick = { selected = offset },
                )
            }

            errorMessage?.let { message ->
                Text(
                    text = message,
                    color = Color.Red,
                    style = MaterialTheme.typography.bodySmall,
                    modifier = Modifier.padding(top = 8.dp),
                )
            }

            Button(
                onClick = {
                    scope.launch {
                        val enabled = NotificationHelper.areNotificationsEnabled(context)
                        if (!enabled) {
                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                                permissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
                                return@launch
                            }
                            errorMessage = "Enable notifications in Settings to use reminders."
                            return@launch
                        }
                        reminderService.setReminder(item, selected, allItems)
                        onDismiss()
                    }
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 16.dp),
            ) {
                Text("Save")
            }
        }
    }
}

@Composable
private fun ReminderOption(
    label: String,
    selected: Boolean,
    onClick: () -> Unit,
) {
    Text(
        text = label,
        color = if (selected) BrandColors.Lake else MaterialTheme.colorScheme.onSurface,
        style = MaterialTheme.typography.bodyLarge,
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(vertical = 12.dp),
    )
}
