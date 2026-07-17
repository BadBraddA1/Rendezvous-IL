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
import androidx.glance.layout.Row
import androidx.glance.layout.Spacer
import androidx.glance.layout.fillMaxHeight
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.fillMaxWidth
import androidx.glance.layout.height
import androidx.glance.layout.padding
import androidx.glance.layout.width
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import androidx.compose.ui.unit.dp
import androidx.glance.unit.ColorProvider
import com.rendezvousil.core.schedule.ScheduleNowNext
import com.rendezvousil.core.schedule.SharedScheduleSnapshot

/** Medium widget — mirrors iOS NowNextWidget (NOW | NEXT columns). */
class NowNextWidget : GlanceAppWidget() {
    override suspend fun provideGlance(context: Context, id: GlanceId) {
        val snapshot = ScheduleSnapshotStore.load(context)
        val nowNext = ScheduleNowNext.evaluate(snapshot?.luItems.orEmpty())
        provideContent {
            NowNextWidgetContent(nowNext = nowNext)
        }
    }
}

@Composable
private fun NowNextWidgetContent(
    nowNext: com.rendezvousil.core.schedule.model.NowNextResult,
) {
    Row(
        modifier = GlanceModifier
            .fillMaxSize()
            .background(ColorProvider(androidx.compose.ui.graphics.Color(0.95f, 0.95f, 0.97f)))
            .padding(12.dp),
        verticalAlignment = Alignment.Top,
    ) {
        NowNextColumn(
            label = "NOW",
            title = nowNext.current?.title,
            detail = nowNext.current?.time,
            tint = WidgetBrandColors.Lake,
            modifier = GlanceModifier.defaultWeight().fillMaxHeight(),
        )
        Spacer(GlanceModifier.width(12.dp))
        Column(
            modifier = GlanceModifier
                .fillMaxHeight()
                .width(1.dp)
                .background(WidgetBrandColors.Secondary),
        ) {}
        Spacer(GlanceModifier.width(12.dp))
        NowNextColumn(
            label = "NEXT",
            title = nowNext.next?.title,
            detail = nowNext.next?.let { item ->
                listOfNotNull(item.day, item.time).joinToString(" · ")
            },
            tint = WidgetBrandColors.Coral,
            modifier = GlanceModifier.defaultWeight().fillMaxHeight(),
        )
    }
}

@Composable
private fun NowNextColumn(
    label: String,
    title: String?,
    detail: String?,
    tint: ColorProvider,
    modifier: GlanceModifier = GlanceModifier,
) {
    Column(
        modifier = modifier.fillMaxWidth(),
        verticalAlignment = Alignment.Top,
        horizontalAlignment = Alignment.Start,
    ) {
        Text(
            text = label,
            style = TextStyle(fontWeight = FontWeight.Bold, color = tint),
        )
        Spacer(GlanceModifier.height(4.dp))
        Text(
            text = title ?: "—",
            style = TextStyle(fontWeight = FontWeight.Medium),
            maxLines = 2,
        )
        Spacer(GlanceModifier.height(2.dp))
        Text(
            text = detail?.takeIf { it.isNotBlank() } ?: " ",
            style = TextStyle(color = WidgetBrandColors.Secondary),
            maxLines = 2,
        )
    }
}
