package com.rendezvousil.app.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.NotificationsActive
import androidx.compose.material.icons.filled.Place
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.rendezvousil.app.theme.BrandColors
import com.rendezvousil.core.schedule.model.LUScheduleItem
import com.rendezvousil.core.schedule.model.Meal
import com.rendezvousil.core.schedule.model.ScheduleEvent
import com.rendezvousil.core.schedule.model.VolunteerScheduleSlot

@Composable
fun EventCard(
    event: ScheduleEvent,
    isoDate: String,
    meal: Meal?,
    volunteers: VolunteerScheduleSlot?,
    luItem: LUScheduleItem? = null,
    hasReminder: Boolean = false,
    onReminderClick: (() -> Unit)? = null,
    modifier: Modifier = Modifier,
) {
    Surface(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        color = BrandColors.SecondaryGroupedBackground,
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Top,
            ) {
                Column(
                    modifier = Modifier.weight(1f),
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    Text(
                        text = event.time,
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.SemiBold,
                        color = BrandColors.Lake,
                    )
                    Text(
                        text = event.title,
                        style = MaterialTheme.typography.bodyLarge,
                        fontWeight = FontWeight.Medium,
                    )
                    event.location?.let { location ->
                        Row(
                            horizontalArrangement = Arrangement.spacedBy(6.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Icon(
                                Icons.Default.Place,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                            Text(
                                text = location,
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                    }
                    event.note?.let { note ->
                        Text(
                            text = note,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                    meal?.let { MealDetailView(meal = it) }
                    volunteers?.let { VolunteerDetailView(slot = it) }
                }
                if (luItem != null && onReminderClick != null) {
                    IconButton(onClick = onReminderClick) {
                        Icon(
                            imageVector = if (hasReminder) {
                                Icons.Default.NotificationsActive
                            } else {
                                Icons.Default.Notifications
                            },
                            contentDescription = "Set reminder",
                            tint = BrandColors.Coral,
                            modifier = Modifier.size(28.dp),
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun MealDetailView(
    meal: Meal,
    modifier: Modifier = Modifier,
) {
    Surface(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(8.dp),
        color = BrandColors.LakeLight.copy(alpha = 0.6f),
    ) {
        Column(
            modifier = Modifier.padding(10.dp),
            verticalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            Text(
                text = "Menu",
                style = MaterialTheme.typography.labelSmall,
                fontWeight = FontWeight.SemiBold,
                color = BrandColors.CoralInk,
            )
            Text(text = meal.main_dish, style = MaterialTheme.typography.bodyMedium)
            meal.sides?.takeIf { it.isNotEmpty() }?.let { sides ->
                Text(
                    text = sides.joinToString(", "),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            meal.dessert?.takeIf { it.isNotEmpty() }?.let { dessert ->
                Text(
                    text = "Dessert: $dessert",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
    }
}

@Composable
fun VolunteerDetailView(
    slot: VolunteerScheduleSlot,
    modifier: Modifier = Modifier,
) {
    Surface(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(8.dp),
        color = BrandColors.WarmSurface,
    ) {
        Column(
            modifier = Modifier.padding(10.dp),
            verticalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            Text(
                text = "Worship leaders",
                style = MaterialTheme.typography.labelSmall,
                fontWeight = FontWeight.SemiBold,
                color = BrandColors.Lake,
            )
            slot.openingPrayer?.let { VolunteerRow("Opening prayer", it) }
            slot.leadingSingingA?.let { VolunteerRow("Singing A", it) }
            slot.leadingSingingB?.let { VolunteerRow("Singing B", it) }
            slot.readingScriptureA?.let { VolunteerRow("Scripture A", it) }
            if (slot.presentingLessonA != null && slot.lessonTitleA != null) {
                VolunteerRow("Lesson A", "${slot.presentingLessonA} — ${slot.lessonTitleA}")
            }
            slot.closingPrayer?.let { VolunteerRow("Closing prayer", it) }
        }
    }
}

@Composable
private fun VolunteerRow(label: String, value: String) {
    Row(modifier = Modifier.fillMaxWidth()) {
        Text(
            text = label,
            modifier = Modifier.weight(0.4f),
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Text(
            text = value,
            modifier = Modifier.weight(0.6f),
            style = MaterialTheme.typography.labelSmall,
        )
    }
}

