package com.rendezvousil.app.navigation

import android.net.Uri

object Routes {
    const val HOME = "home"
    const val CHAT = "chat"
    const val CHAT_THREAD = "chat/{channelId}?title={title}&canModerate={canModerate}"
    const val SCHEDULE = "schedule"
    const val DIRECTORY = "directory"
    const val UPDATES = "updates"
    const val MORE = "more"
    const val MORE_CALCULATOR = "more/calculator"
    const val MORE_BIBLE_BOWL = "more/bible_bowl"
    const val MORE_SONGS = "more/songs"
    const val MORE_SONG_PACK = "more/songs/{packId}?name={name}"
    const val MORE_SONG_VIEWER = "more/songs/{packId}/view?index={index}&name={name}"
    const val MORE_FAQ = "more/faq"
    const val MORE_ABOUT = "more/about"
    const val MORE_DIRECTORY = "more/directory"
    const val MORE_DIRECTORY_MANAGE = "more/directory_manage"
    const val MORE_VOLUNTEERING = "more/volunteering"
    const val MORE_ACCOUNT = "more/account"
    const val MORE_NOTIFICATIONS = "more/notifications"
    const val MORE_ADMIN_DASHBOARD = "more/admin_dashboard"
    const val MORE_CHECKIN = "more/checkin"
    const val MORE_ADMIN_USERS = "more/admin_users"
    /** Alias for [MORE_CHECKIN] (MoreScreen navigation). */
    const val MORE_CHECK_IN = MORE_CHECKIN

    val topLevelRoutes = listOf(HOME, CHAT, SCHEDULE, DIRECTORY, MORE)

    fun isTopLevelRoute(route: String?): Boolean = route in topLevelRoutes

    fun isMoreRoute(route: String?): Boolean =
        route == MORE || route?.startsWith("more/") == true

    fun isChatThreadRoute(route: String?): Boolean =
        route?.startsWith("chat/") == true

    fun chatThread(channelId: String, title: String, canModerate: Boolean): String {
        val encodedTitle = Uri.encode(title)
        return "chat/$channelId?title=$encodedTitle&canModerate=$canModerate"
    }

    fun songPack(packId: String, name: String): String =
        "more/songs/$packId?name=${Uri.encode(name)}"

    fun songViewer(packId: String, index: Int, name: String): String =
        "more/songs/$packId/view?index=$index&name=${Uri.encode(name)}"
}
