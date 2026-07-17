package com.rendezvousil.app.ui.home

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.Chat
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Restaurant
import androidx.compose.material.icons.filled.VolunteerActivism
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.rendezvousil.app.theme.BrandColors
import com.rendezvousil.core.network.AppConfig
import com.rendezvousil.core.network.dto.FamilyVolunteeringResponse
import com.rendezvousil.core.network.dto.WeatherCurrent
import com.rendezvousil.core.schedule.model.Announcement
import com.rendezvousil.core.schedule.model.NowNextResult
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(
    viewModel: HomeViewModel,
    onNavigateToSchedule: () -> Unit,
    onNavigateToChat: () -> Unit,
    onNavigateToVolunteering: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val announcements by viewModel.liveAnnouncements.collectAsState()
    val weather by viewModel.weather.collectAsState()
    val uiState by viewModel.uiState.collectAsState()
    val nowNext = viewModel.nowNext()
    var isRefreshing by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    Scaffold(
        modifier = modifier,
        topBar = { TopAppBar(title = { Text("Today") }) },
        containerColor = BrandColors.GroupedBackground,
    ) { padding ->
        PullToRefreshBox(
            isRefreshing = isRefreshing,
            onRefresh = {
                scope.launch {
                    isRefreshing = true
                    viewModel.refresh()
                    isRefreshing = false
                }
            },
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .verticalScroll(rememberScrollState())
                    .padding(horizontal = 20.dp, vertical = 16.dp),
                verticalArrangement = Arrangement.spacedBy(20.dp),
            ) {
                HeaderCard()
                NowNextCard(nowNext = nowNext, onOpenSchedule = onNavigateToSchedule)
                weather?.current?.let { WeatherCard(current = it) }
                if (announcements.isNotEmpty()) {
                    AnnouncementsCard(announcements = announcements.take(3))
                }
                uiState.nextMealLine?.let { meal ->
                    ActionCard(
                        title = "Next meal",
                        subtitle = meal,
                        icon = { Icon(Icons.Default.Restaurant, null, tint = BrandColors.Coral) },
                        onClick = onNavigateToSchedule,
                    )
                }
                ActionCard(
                    title = "Chat",
                    subtitle = if (uiState.chatUnreadTotal > 0) {
                        "${uiState.chatUnreadTotal} unread"
                    } else {
                        "Open year chat"
                    },
                    badge = uiState.chatUnreadTotal.takeIf { it > 0 }?.toString(),
                    icon = {
                        Icon(Icons.AutoMirrored.Filled.Chat, null, tint = BrandColors.Coral)
                    },
                    onClick = onNavigateToChat,
                )
                uiState.volunteering?.takeIf { it.hasContent }?.let { volunteering ->
                    VolunteeringCard(
                        volunteering = volunteering,
                        onClick = onNavigateToVolunteering,
                    )
                }
            }
        }
    }
}

@Composable
private fun HeaderCard() {
    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Text(
            text = "Today at Rendezvous",
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.SemiBold,
        )
        Text(
            text = "${AppConfig.EVENT_DATES} · ${AppConfig.LOCATION}",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@Composable
private fun NowNextCard(
    nowNext: NowNextResult,
    onOpenSchedule: () -> Unit,
) {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text("Now & next", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
        nowNext.current?.let { current ->
            StatusCard(
                label = "Happening now",
                title = current.title,
                subtitle = listOfNotNull(current.time, current.location).joinToString(" · "),
                tint = BrandColors.Lake,
            )
        }
        nowNext.next?.let { next ->
            StatusCard(
                label = if (nowNext.current == null) "Up next" else "Then",
                title = next.title,
                subtitle = listOfNotNull(next.day, next.time, next.location).joinToString(" · "),
                tint = BrandColors.Coral,
            )
        }
        if (nowNext.current == null && nowNext.next == null) {
            Surface(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp),
                color = BrandColors.SecondaryGroupedBackground,
            ) {
                Text(
                    text = "Live now/next appears during retreat week (Central Time).",
                    modifier = Modifier.padding(16.dp),
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        } else {
            androidx.compose.material3.TextButton(onClick = onOpenSchedule) {
                Text("Open schedule")
            }
        }
    }
}

@Composable
private fun WeatherCard(current: WeatherCurrent) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text("Weather", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
        Surface(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(12.dp),
            color = BrandColors.LakeLight.copy(alpha = 0.5f),
        ) {
            Row(
                modifier = Modifier.padding(16.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalAlignment = Alignment.Bottom,
            ) {
                Text(
                    text = "${current.temp.toInt()}°",
                    style = MaterialTheme.typography.displaySmall,
                    fontWeight = FontWeight.SemiBold,
                    color = BrandColors.Lake,
                )
                Column {
                    Text(
                        text = current.weather.firstOrNull()?.description?.replaceFirstChar {
                            if (it.isLowerCase()) it.titlecase() else it.toString()
                        } ?: "Conditions",
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.Medium,
                    )
                    Text(
                        text = "Feels like ${current.feels_like.toInt()}° · Wind ${current.wind_speed.toInt()} mph",
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
        }
    }
}

@Composable
private fun AnnouncementsCard(announcements: List<Announcement>) {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text("Announcements", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
        announcements.forEach { item ->
            Surface(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp),
                color = BrandColors.SecondaryGroupedBackground,
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(6.dp),
                ) {
                    Text(item.title, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold)
                    Text(
                        item.message,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
        }
    }
}

@Composable
private fun ActionCard(
    title: String,
    subtitle: String,
    icon: @Composable () -> Unit,
    onClick: () -> Unit,
    badge: String? = null,
) {
    Surface(
        onClick = onClick,
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        color = BrandColors.SecondaryGroupedBackground,
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            icon()
            Column(modifier = Modifier.weight(1f)) {
                Text(title, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold)
                Text(
                    subtitle,
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            badge?.let {
                Surface(shape = RoundedCornerShape(50), color = BrandColors.Coral) {
                    Text(
                        text = it,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                        style = MaterialTheme.typography.labelSmall,
                        fontWeight = FontWeight.Bold,
                        color = androidx.compose.ui.graphics.Color.White,
                    )
                }
            }
            Icon(Icons.Default.ChevronRight, null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

@Composable
private fun VolunteeringCard(
    volunteering: FamilyVolunteeringResponse,
    onClick: () -> Unit,
) {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text("Your volunteering", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
        Surface(
            onClick = onClick,
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(12.dp),
            color = BrandColors.SecondaryGroupedBackground,
        ) {
            Column(
                modifier = Modifier.padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                Row(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Icon(Icons.Default.VolunteerActivism, null, tint = BrandColors.Lake)
                    Text(
                        "View assignments",
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.SemiBold,
                        modifier = Modifier.weight(1f),
                    )
                    Icon(Icons.Default.ChevronRight, null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                if (volunteering.summary.pendingActionCount > 0) {
                    Text(
                        "${volunteering.summary.pendingActionCount} action(s) needed",
                        style = MaterialTheme.typography.bodySmall,
                        fontWeight = FontWeight.SemiBold,
                        color = BrandColors.Coral,
                    )
                }
                if (volunteering.summary.confirmedWorshipCount > 0) {
                    Text(
                        "${volunteering.summary.confirmedWorshipCount} worship assignment(s)",
                        style = MaterialTheme.typography.bodySmall,
                    )
                }
                if (volunteering.summary.specialAssignmentCount > 0) {
                    Text(
                        "${volunteering.summary.specialAssignmentCount} special job(s)",
                        style = MaterialTheme.typography.bodySmall,
                    )
                }
            }
        }
    }
}

@Composable
private fun StatusCard(
    label: String,
    title: String,
    subtitle: String,
    tint: androidx.compose.ui.graphics.Color,
) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        color = tint.copy(alpha = 0.08f),
        border = androidx.compose.foundation.BorderStroke(1.dp, tint.copy(alpha = 0.2f)),
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            Text(
                text = label.uppercase(),
                style = MaterialTheme.typography.labelSmall,
                fontWeight = FontWeight.Bold,
                color = tint,
            )
            Text(title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
            if (subtitle.isNotBlank()) {
                Text(
                    subtitle,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun VolunteeringScreen(
    viewModel: VolunteeringViewModel,
    onBack: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val volunteering by viewModel.volunteering.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    val context = LocalContext.current
    val payload = volunteering

    Scaffold(
        modifier = modifier,
        topBar = {
            TopAppBar(
                title = { Text("Your volunteering") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "Back",
                        )
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
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            if (isLoading && payload == null) {
                Text("Loading volunteering…", color = MaterialTheme.colorScheme.onSurfaceVariant)
            } else if (payload == null || !payload.hasContent) {
                Text(
                    "When your family has worship roles, lesson topics, or special jobs, they’ll show up here.",
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            } else {
                val pending = payload.volunteers.flatMap { it.pendingActions }
                if (pending.isNotEmpty()) {
                    Text("Needs your attention", fontWeight = FontWeight.Bold)
                    pending.forEach { action ->
                        Surface(
                            onClick = {
                                runCatching {
                                    context.startActivity(
                                        Intent(Intent.ACTION_VIEW, Uri.parse(action.href)),
                                    )
                                }
                            },
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(12.dp),
                            color = BrandColors.WarmSurface,
                        ) {
                            Text(
                                text = action.label,
                                modifier = Modifier.padding(16.dp),
                                style = MaterialTheme.typography.bodyMedium,
                                fontWeight = FontWeight.SemiBold,
                                color = BrandColors.CoralInk,
                            )
                        }
                    }
                }

                val assigned = payload.volunteers.filter {
                    it.worshipAssignment != null || it.lessonTopic != null
                }
                if (assigned.isNotEmpty()) {
                    Text("Your assignments", fontWeight = FontWeight.Bold)
                    assigned.forEach { volunteer ->
                        Surface(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(12.dp),
                            color = BrandColors.SecondaryGroupedBackground,
                        ) {
                            Column(
                                modifier = Modifier.padding(16.dp),
                                verticalArrangement = Arrangement.spacedBy(4.dp),
                            ) {
                                Text(volunteer.volunteerName, fontWeight = FontWeight.SemiBold)
                                Text(volunteer.volunteerType, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                volunteer.worshipAssignment?.let { worship ->
                                    Text(
                                        listOfNotNull(worship.assignedDate, worship.timeSlot, worship.roleLabel)
                                            .joinToString(" · "),
                                        style = MaterialTheme.typography.bodySmall,
                                    )
                                }
                                volunteer.lessonTopic?.let { lesson ->
                                    Text("Topic: ${lesson.topicTitle}", style = MaterialTheme.typography.bodySmall)
                                }
                            }
                        }
                    }
                }

                if (payload.specialAssignments.isNotEmpty()) {
                    Text("Special assignments", fontWeight = FontWeight.Bold)
                    payload.specialAssignments.forEach { item ->
                        Surface(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(12.dp),
                            color = BrandColors.SecondaryGroupedBackground,
                        ) {
                            Column(
                                modifier = Modifier.padding(16.dp),
                                verticalArrangement = Arrangement.spacedBy(4.dp),
                            ) {
                                Text(item.activityName, fontWeight = FontWeight.SemiBold)
                                Text(
                                    listOfNotNull(item.matchedName, item.assignedDate, item.timeSlot)
                                        .joinToString(" · "),
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
