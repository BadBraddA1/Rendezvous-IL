package com.rendezvousil.app.ui.admin

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Campaign
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Key
import androidx.compose.material.icons.filled.NotificationsActive
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.rendezvousil.app.auth.AppSession
import com.rendezvousil.app.theme.BrandColors
import com.rendezvousil.core.network.dto.StaffDayOfResponse
import java.time.OffsetDateTime
import java.time.format.DateTimeFormatter
import java.time.format.DateTimeParseException
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StaffDayOfScreen(
    appSession: AppSession,
    onBack: () -> Unit,
    onNavigateToCheckIn: () -> Unit,
    onNavigateToAnnouncements: () -> Unit,
    onNavigateToEventPings: () -> Unit,
    modifier: Modifier = Modifier,
) {
    var payload by remember { mutableStateOf<StaffDayOfResponse?>(null) }
    var isLoading by remember { mutableStateOf(true) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    val canCheckIn by appSession.canCheckInFlow.collectAsStateWithLifecycle()
    val canEdit by appSession.canEditFlow.collectAsStateWithLifecycle()

    fun load() {
        val client = appSession.authenticatedApiClient ?: return
        scope.launch {
            isLoading = true
            errorMessage = null
            try {
                payload = client.getStaffDayOf()
            } catch (e: Exception) {
                errorMessage = e.message ?: "Failed to load day-of"
            } finally {
                isLoading = false
            }
        }
    }

    LaunchedEffect(Unit) { load() }

    Scaffold(
        modifier = modifier,
        topBar = {
            TopAppBar(
                title = { Text("Day-of") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
            )
        },
        containerColor = BrandColors.GroupedBackground,
    ) { padding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
        ) {
            when {
                isLoading && payload == null -> {
                    CircularProgressIndicator(
                        modifier = Modifier.align(Alignment.Center),
                        color = BrandColors.Lake,
                    )
                }
                errorMessage != null && payload == null -> {
                    Column(
                        modifier = Modifier
                            .align(Alignment.Center)
                            .padding(24.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        Text(errorMessage.orEmpty(), color = MaterialTheme.colorScheme.error)
                        Button(onClick = { load() }) { Text("Retry") }
                    }
                }
                payload != null -> {
                    val data = payload!!
                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .verticalScroll(rememberScrollState())
                            .padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(20.dp),
                    ) {
                        Text(
                            text = "Check-in",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.SemiBold,
                            color = BrandColors.Lake,
                        )
                        StatRow("Checked in", "${data.checkedIn}", Icons.Default.CheckCircle)
                        StatRow(
                            "Still waiting",
                            "${data.notCheckedIn}",
                            Icons.Default.Person,
                            emphasize = data.notCheckedIn > 0,
                        )
                        StatRow("Total families", "${data.totalRegistrations}", Icons.Default.Person)
                        if (canCheckIn) {
                            Button(
                                onClick = onNavigateToCheckIn,
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = BrandColors.Lake,
                                ),
                                modifier = Modifier.fillMaxWidth(),
                            ) {
                                Icon(Icons.Default.Key, contentDescription = null)
                                Text(
                                    text = "Open check-in station",
                                    modifier = Modifier.padding(start = 8.dp),
                                )
                            }
                        }

                        Text(
                            text = "Next up",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.SemiBold,
                            color = BrandColors.Lake,
                        )
                        val next = data.nextEvent
                        if (next != null) {
                            Text(
                                next.title,
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.SemiBold,
                            )
                            Text(
                                "${next.day} · ${next.time}",
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                            next.location?.takeIf { it.isNotBlank() }?.let { loc ->
                                Text(
                                    loc,
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                            if (canEdit) {
                                OutlinedButton(
                                    onClick = onNavigateToEventPings,
                                    modifier = Modifier.fillMaxWidth(),
                                ) {
                                    Icon(Icons.Default.NotificationsActive, contentDescription = null)
                                    Text(
                                        text = "Event pings",
                                        modifier = Modifier.padding(start = 8.dp),
                                    )
                                }
                            }
                        } else {
                            Text(
                                "No upcoming schedule events.",
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }

                        Text(
                            text = "Announcements",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.SemiBold,
                            color = BrandColors.Lake,
                        )
                        StatRow("Active", "${data.activeAnnouncements}", Icons.Default.Campaign)
                        if (canEdit) {
                            OutlinedButton(
                                onClick = onNavigateToAnnouncements,
                                modifier = Modifier.fillMaxWidth(),
                            ) {
                                Icon(Icons.Default.Campaign, contentDescription = null)
                                Text(
                                    text = "Post / schedule",
                                    modifier = Modifier.padding(start = 8.dp),
                                )
                            }
                        }

                        Text(
                            text = "Updated ${formatUpdated(data.updatedAt)}",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )

                        OutlinedButton(
                            onClick = { load() },
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            Text("Refresh")
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun StatRow(
    label: String,
    value: String,
    icon: ImageVector,
    emphasize: Boolean = false,
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(icon, contentDescription = null, tint = BrandColors.Lake)
            Text(
                text = label,
                modifier = Modifier.padding(start = 8.dp),
                style = MaterialTheme.typography.bodyMedium,
            )
        }
        Text(
            text = value,
            style = MaterialTheme.typography.bodyMedium,
            fontWeight = FontWeight.SemiBold,
            color = if (emphasize) BrandColors.Coral else MaterialTheme.colorScheme.onSurface,
        )
    }
}

private fun formatUpdated(iso: String): String {
    return try {
        val odt = OffsetDateTime.parse(iso)
        odt.format(DateTimeFormatter.ofPattern("h:mm a"))
    } catch (_: DateTimeParseException) {
        iso
    }
}
