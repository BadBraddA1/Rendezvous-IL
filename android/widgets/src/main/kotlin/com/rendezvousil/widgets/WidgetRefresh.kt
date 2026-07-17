package com.rendezvousil.widgets

import android.content.Context
import androidx.glance.appwidget.updateAll

object WidgetRefresh {
    suspend fun updateAll(context: Context) {
        NextEventWidget().updateAll(context)
        NowNextWidget().updateAll(context)
    }
}
