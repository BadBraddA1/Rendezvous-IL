package com.rendezvousil.app.ui.schedule

import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyListState
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.rendezvousil.app.theme.BrandColors
import com.rendezvousil.app.ui.components.EventCard
import com.rendezvousil.app.notifications.ReminderService
import com.rendezvousil.core.schedule.AssemblyMatcher
import com.rendezvousil.core.schedule.MealMatcher
import com.rendezvousil.core.schedule.ScheduleNowNext
import com.rendezvousil.core.schedule.matchingLUItem
import com.rendezvousil.core.schedule.model.Announcement
import com.rendezvousil.core.schedule.model.LUScheduleItem
import com.rendezvousil.core.schedule.model.ScheduleDay
import com.rendezvousil.core.schedule.model.ScheduleEvent
import com.rendezvousil.core.schedule.model.SchedulePayload
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ScheduleScreen(
    viewModel: ScheduleViewModel,
    reminderService: ReminderService,
    modifier: Modifier = Modifier,
) {
    val schedule by viewModel.schedule.collectAsState()
    val announcements by viewModel.scheduleAnnouncements.collectAsState()
    val isLoading by viewModel.isLoadingSchedule.collectAsState()
    val error by viewModel.scheduleError.collectAsState()
    var selectedDayIndex by remember { mutableIntStateOf(0) }
    var didAutoPosition by remember { mutableStateOf(false) }
    var isRefreshing by remember { mutableStateOf(false) }
    var reminderItem by remember { mutableStateOf<LUScheduleItem?>(null) }
    val scope = rememberCoroutineScope()
    val listState = rememberLazyListState()

    LaunchedEffect(schedule?.year, schedule?.days?.size) {
        val payload = schedule ?: return@LaunchedEffect
        if (payload.days.isEmpty() || didAutoPosition) return@LaunchedEffect
        didAutoPosition = true
        val focus = ScheduleNowNext.evaluate(payload.luItems).let { it.current ?: it.next }
        val dayIndex = if (focus != null) {
            payload.days.indexOfFirst { day ->
                (payload.dayDates[day.day] ?: day.day) == focus.date
            }.takeIf { it >= 0 }
                ?: ScheduleNowNext.preferredDayIndex(payload.dayDates, payload.days)
        } else {
            ScheduleNowNext.preferredDayIndex(payload.dayDates, payload.days)
        }
        selectedDayIndex = dayIndex
        val eventIndex = jumpTargetEventIndex(payload, dayIndex)
        if (eventIndex != null) {
            kotlinx.coroutines.delay(120)
            listState.animateScrollToItem(index = eventIndex + 1)
        }
    }

    Scaffold(
        modifier = modifier,
        topBar = { TopAppBar(title = { Text("Schedule") }) },
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
            when {
                isLoading && schedule == null -> {
                    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            CircularProgressIndicator(color = BrandColors.Lake)
                            Text(
                                "Loading schedule…",
                                modifier = Modifier.padding(top = 12.dp),
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                    }
                }
                schedule != null -> {
                    ScheduleContent(
                        schedule = schedule!!,
                        announcements = announcements,
                        selectedDayIndex = selectedDayIndex,
                        onDaySelected = { selectedDayIndex = it },
                        listState = listState,
                        mealFor = { date, event -> mealFor(viewModel, date, event) },
                        volunteersFor = { date, event -> volunteersFor(viewModel, date, event) },
                        reminderService = reminderService,
                        onReminderClick = { reminderItem = it },
                    )
                }
                else -> {
                    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text(
                                "Schedule unavailable",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.SemiBold,
                            )
                            Text(
                                error ?: "Pull to retry.",
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                    }
                }
            }
        }
    }

    reminderItem?.let { item ->
        EventReminderSheet(
            item = item,
            allItems = schedule?.luItems.orEmpty(),
            reminderService = reminderService,
            onDismiss = { reminderItem = null },
        )
    }
}

@Composable
private fun ScheduleContent(
    schedule: SchedulePayload,
    announcements: List<Announcement>,
    selectedDayIndex: Int,
    onDaySelected: (Int) -> Unit,
    listState: LazyListState,
    mealFor: (String, com.rendezvousil.core.schedule.model.ScheduleEvent) -> com.rendezvousil.core.schedule.model.Meal?,
    volunteersFor: (String, com.rendezvousil.core.schedule.model.ScheduleEvent) -> com.rendezvousil.core.schedule.model.VolunteerScheduleSlot?,
    reminderService: ReminderService,
    onReminderClick: (LUScheduleItem) -> Unit,
) {
    Column(modifier = Modifier.fillMaxSize()) {
        if (announcements.isNotEmpty()) {
            AnnouncementsBanner(announcements = announcements)
        }

        DayPicker(
            days = schedule.days,
            selectedDayIndex = selectedDayIndex,
            onDaySelected = onDaySelected,
        )

        if (selectedDayIndex < schedule.days.size) {
            val day = schedule.days[selectedDayIndex]
            val isoDate = schedule.dayDates[day.day].orEmpty()
            val nowNext = ScheduleNowNext.evaluate(schedule.luItems)
            val happeningTitle = nowNext.current?.title
            LazyColumn(
                state = listState,
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                item {
                    DayHeader(day = day, draftNotice = schedule.draftNotice)
                }
                itemsIndexed(day.events, key = { _, event -> event.id }) { _, event ->
                    val luItem = matchingLUItem(event, isoDate, schedule.luItems)
                    var hasReminder by remember(luItem?.id) { mutableStateOf(false) }
                    LaunchedEffect(luItem?.id) {
                        hasReminder = luItem?.let { reminderService.preference(it.id) != null } == true
                    }
                    EventCard(
                        event = event,
                        isoDate = isoDate,
                        meal = mealFor(isoDate, event),
                        volunteers = volunteersFor(isoDate, event),
                        luItem = luItem,
                        hasReminder = hasReminder,
                        isHappeningNow = happeningTitle != null &&
                            event.title == happeningTitle &&
                            isoDate == nowNext.current?.date,
                        onReminderClick = luItem?.let { item -> { onReminderClick(item) } },
                    )
                }
            }
        }
    }
}

/** Index of the current/next event within the selected day’s event list, if any. */
private fun jumpTargetEventIndex(schedule: SchedulePayload, dayIndex: Int): Int? {
    if (dayIndex !in schedule.days.indices) return null
    val day = schedule.days[dayIndex]
    val isoDate = schedule.dayDates[day.day].orEmpty()
    val item = ScheduleNowNext.evaluate(schedule.luItems).let { it.current ?: it.next } ?: return null
    if (item.date != isoDate) return null
    return day.events.indexOfFirst { it.title == item.title && it.time == item.time }
        .takeIf { it >= 0 }
        ?: day.events.indexOfFirst { it.title == item.title }.takeIf { it >= 0 }
}

@Composable
private fun AnnouncementsBanner(announcements: List<Announcement>) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(BrandColors.LakeLight.copy(alpha = 0.5f))
            .padding(vertical = 8.dp),
    ) {
        Row(
            modifier = Modifier
                .horizontalScroll(rememberScrollState())
                .padding(horizontal = 16.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            announcements.forEach { item ->
                Surface(
                    shape = RoundedCornerShape(50),
                    color = BrandColors.WarmSurface,
                ) {
                    Text(
                        text = item.title,
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = FontWeight.SemiBold,
                    )
                }
            }
        }
    }
}

@Composable
private fun DayPicker(
    days: List<ScheduleDay>,
    selectedDayIndex: Int,
    onDaySelected: (Int) -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .horizontalScroll(rememberScrollState())
            .padding(horizontal = 16.dp, vertical = 8.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        days.forEachIndexed { index, day ->
            val selected = index == selectedDayIndex
            Surface(
                onClick = { onDaySelected(index) },
                shape = RoundedCornerShape(12.dp),
                color = if (selected) BrandColors.Lake else BrandColors.SecondaryGroupedBackground,
            ) {
                Column(
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 10.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    Text(
                        text = day.day.firstOrNull()?.toString().orEmpty(),
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold,
                        color = if (selected) Color.White else MaterialTheme.colorScheme.onSurface,
                    )
                    Text(
                        text = day.day,
                        style = MaterialTheme.typography.labelSmall,
                        color = if (selected) Color.White else MaterialTheme.colorScheme.onSurface,
                    )
                }
            }
        }
    }
}

@Composable
private fun DayHeader(day: ScheduleDay, draftNotice: String) {
    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Text(
            text = "${day.date} (${day.day})",
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.SemiBold,
            color = BrandColors.Lake,
        )
        if (draftNotice.isNotBlank()) {
            Text(
                text = draftNotice,
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

private fun mealFor(
    viewModel: ScheduleViewModel,
    isoDate: String,
    event: ScheduleEvent,
): com.rendezvousil.core.schedule.model.Meal? {
    val mealType = MealMatcher.mealTypeFor(event.title) ?: return null
    return viewModel.meal(isoDate, mealType)
}

private fun volunteersFor(
    viewModel: ScheduleViewModel,
    isoDate: String,
    event: ScheduleEvent,
): com.rendezvousil.core.schedule.model.VolunteerScheduleSlot? {
    val slot = AssemblyMatcher.timeSlotFor(event.title, event.time) ?: return null
    return viewModel.volunteers(isoDate, slot)
}
