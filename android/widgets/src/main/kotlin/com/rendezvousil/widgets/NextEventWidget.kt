package com.rendezvousil.widgets

import android.content.Context
import androidx.compose.runtime.Composable
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.provideContent
import androidx.glance.background
import androidx.glance.layout.Alignment
import androidx.glance.layout.Column
import androidx.glance.layout.Spacer
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.height
import androidx.glance.layout.padding
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import androidx.compose.ui.unit.dp
import com.rendezvousil.core.schedule.ScheduleNowNext
import com.rendezvousil.core.schedule.SharedScheduleSnapshot

/** Small widget — mirrors iOS NextEventWidget. */
class NextEventWidget : GlanceAppWidget() {
    override suspend fun provideGlance(context: Context, id: GlanceId) {
        val snapshot = ScheduleSnapshotStore.load(context)
        val nowNext = ScheduleNowNext.evaluate(snapshot?.luItems.orEmpty())
        provideContent {
            NextEventWidgetContent(snapshot = snapshot, nowNext = nowNext)
        }
    }
}

@Composable
private fun NextEventWidgetContent(
    snapshot: SharedScheduleSnapshot?,
    nowNext: com.rendezvousil.core.schedule.model.NowNextResult,
) {
    val current = nowNext.current
    val next = nowNext.next
    val primaryTitle = when {
        current?.title != null -> "Now: ${current.title}"
        next?.title != null -> next.title
        else -> "Registration opens ${snapshot?.registrationOpens ?: "Jan 1, 2027"}"
    }
    val subtitle = when {
        next != null -> listOfNotNull(next.day, next.time).joinToString(" · ")
        else -> snapshot?.dateRange ?: "May 3–7, 2027"
    }

    Column(
        modifier = GlanceModifier
            .fillMaxSize()
            .background(WidgetBrandColors.LakeLight)
            .padding(12.dp),
        verticalAlignment = Alignment.Top,
        horizontalAlignment = Alignment.Start,
    ) {
        Text(
            text = "Rendezvous ${snapshot?.eventYear ?: 2027}",
            style = TextStyle(
                fontWeight = FontWeight.Medium,
                color = WidgetBrandColors.Lake,
            ),
        )
        Spacer(GlanceModifier.height(6.dp))
        Text(
            text = primaryTitle,
            style = TextStyle(fontWeight = FontWeight.Bold),
            maxLines = 3,
        )
        Spacer(GlanceModifier.height(4.dp))
        Text(
            text = subtitle,
            style = TextStyle(color = WidgetBrandColors.Secondary),
            maxLines = 2,
        )
    }
}
