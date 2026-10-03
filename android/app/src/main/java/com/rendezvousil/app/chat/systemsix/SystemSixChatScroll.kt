package com.rendezvousil.app.chat.systemsix

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue

/** System Six decision 4 — new messages while reading do not jump the list. */
class SystemSixChatScrollState {
    var unseenCount by mutableIntStateOf(0)
        private set
    var scrollToBottomToken by mutableIntStateOf(0)
        private set

    private var stickToBottom = true
    private var previousItemCount = 0

    fun resetItemCount(count: Int) {
        previousItemCount = count
        unseenCount = 0
    }

    fun bind(itemCount: Int) {
        if (itemCount <= previousItemCount) {
            previousItemCount = itemCount
            return
        }
        val delta = itemCount - previousItemCount
        previousItemCount = itemCount
        if (stickToBottom) {
            requestScrollToBottom()
        } else {
            unseenCount += delta
        }
    }

    fun updateNearBottom(distanceFromBottomPx: Float) {
        val near = distanceFromBottomPx <= SystemSixConfig.NEAR_BOTTOM_THRESHOLD_PX
        stickToBottom = near
        if (near) unseenCount = 0
    }

    fun onPillTap() {
        unseenCount = 0
        stickToBottom = true
        requestScrollToBottom()
    }

    private fun requestScrollToBottom() {
        scrollToBottomToken++
        unseenCount = 0
        stickToBottom = true
    }
}
