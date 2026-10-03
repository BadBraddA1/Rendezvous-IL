package com.rendezvousil.app.chat.systemsix

object SystemSixConfig {
    const val GROUP_WINDOW_MS = 2 * 60 * 1000L
    const val NEAR_BOTTOM_THRESHOLD_PX = 80f
    const val COMPOSER_MAX_LINES = 5

    fun newMessagesLabel(count: Int): String =
        if (count == 1) "1 new message" else "$count new messages"

    const val FAILED_LABEL = "Couldn't send"
    const val RETRY_LABEL = "Retry"
}
