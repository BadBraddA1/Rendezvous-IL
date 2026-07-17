package com.rendezvousil.app.ui.updates

import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.ExperimentalMaterial3Api
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
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.rendezvousil.app.theme.BrandColors
import com.rendezvousil.app.ui.components.PriorityBadge
import com.rendezvousil.core.network.AppConfig
import com.rendezvousil.core.schedule.model.Announcement
import com.rendezvousil.core.network.dto.WeatherCurrent
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun UpdatesScreen(
    viewModel: UpdatesViewModel,
    modifier: Modifier = Modifier,
) {
    val announcements by viewModel.liveAnnouncements.collectAsState()
    val weather by viewModel.weather.collectAsState()
    val nowNext = viewModel.nowNext()
    var isRefreshing by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    Scaffold(
        modifier = modifier,
        topBar = { TopAppBar(title = { Text("Updates") }) },
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
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(20.dp),
            ) {
                NowNextSection(nowNext = nowNext)
                WeatherSection(weather = weather?.current)
                AnnouncementsSection(announcements = announcements)
            }
        }
    }
}

@Composable
private fun NowNextSection(nowNext: com.rendezvousil.core.schedule.model.NowNextResult) {
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
                    text = "Event week: ${AppConfig.EVENT_DATES}. Live now/next appears during the retreat (Central Time).",
                    modifier = Modifier.padding(16.dp),
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
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
        modifier = Modifier
            .fillMaxWidth()
            .border(1.dp, tint.copy(alpha = 0.2f), RoundedCornerShape(12.dp)),
        shape = RoundedCornerShape(12.dp),
        color = tint.copy(alpha = 0.08f),
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
            Text(
                text = title,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
            )
            Text(
                text = subtitle,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

@Composable
private fun WeatherSection(weather: WeatherCurrent?) {
    weather ?: return

    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text("Lake Williamson weather", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
        Surface(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(12.dp),
            color = BrandColors.LakeLight.copy(alpha = 0.5f),
        ) {
            Row(
                modifier = Modifier.padding(16.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                Text(
                    text = "${weather.temp.toInt()}°",
                    style = MaterialTheme.typography.displayMedium,
                    fontWeight = FontWeight.SemiBold,
                    color = BrandColors.Lake,
                )
                Column {
                    Text(
                        text = weather.weather.firstOrNull()?.description?.replaceFirstChar { it.uppercase() }.orEmpty(),
                        style = MaterialTheme.typography.bodyMedium,
                    )
                    Text(
                        text = "Feels like ${weather.feels_like.toInt()}° · Wind ${weather.wind_speed.toInt()} mph",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
        }
    }
}

@Composable
private fun AnnouncementsSection(announcements: List<Announcement>) {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text("Announcements", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)

        if (announcements.isEmpty()) {
            Text(
                text = "No active announcements right now.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        } else {
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
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                        ) {
                            Text(
                                text = item.title,
                                style = MaterialTheme.typography.bodyMedium,
                                fontWeight = FontWeight.SemiBold,
                                modifier = Modifier.weight(1f),
                            )
                            PriorityBadge(priority = item.priority)
                        }
                        Text(
                            text = item.message,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
            }
        }
    }
}
