package com.rendezvousil.app.navigation

object Routes {
    const val HOME = "home"
    const val SCHEDULE = "schedule"
    const val UPDATES = "updates"
    const val MORE = "more"
    const val MORE_CALCULATOR = "more/calculator"
    const val MORE_BIBLE_BOWL = "more/bible_bowl"
    const val MORE_FAQ = "more/faq"
    const val MORE_ABOUT = "more/about"
    const val MORE_DIRECTORY = "more/directory"
    const val MORE_DIRECTORY_MANAGE = "more/directory_manage"
    const val MORE_ACCOUNT = "more/account"
    const val MORE_NOTIFICATIONS = "more/notifications"
    const val MORE_ADMIN_DASHBOARD = "more/admin_dashboard"
    const val MORE_CHECKIN = "more/checkin"
    const val MORE_ADMIN_USERS = "more/admin_users"
    /** Alias for [MORE_CHECKIN] (MoreScreen navigation). */
    const val MORE_CHECK_IN = MORE_CHECKIN

    val topLevelRoutes = listOf(HOME, SCHEDULE, UPDATES, MORE)

    fun isTopLevelRoute(route: String?): Boolean = route in topLevelRoutes

    fun isMoreRoute(route: String?): Boolean =
        route == MORE || route?.startsWith("more/") == true
}
