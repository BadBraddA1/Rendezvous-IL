package com.rendezvousil.widgets

import android.content.Context

object WidgetRefresh {
    suspend fun updateAll(context: Context) {
        NextEventWidget().updateAll(context)
        NowNextWidget().updateAll(context)
    }
}
