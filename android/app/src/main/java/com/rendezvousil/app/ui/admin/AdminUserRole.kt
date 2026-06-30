package com.rendezvousil.app.ui.admin

enum class AdminUserRole(val apiValue: String?) {
    NONE(null),
    VIEWER("viewer"),
    CHECKIN("checkin"),
    EDITOR("editor"),
    ADMIN("admin"),
    ;

    val label: String
        get() = when (this) {
            NONE -> "No role"
            VIEWER -> "Viewer"
            CHECKIN -> "Check-In"
            EDITOR -> "Editor"
            ADMIN -> "Admin"
        }

    companion object {
        val selectableRoles: List<AdminUserRole> = entries

        fun from(role: String?): AdminUserRole =
            entries.firstOrNull { it.apiValue == role } ?: NONE
    }
}

object UserPlatformLabel {
    fun text(platform: String?): String = when (platform) {
        "ios" -> "iOS app"
        "android" -> "Android"
        "web" -> "Web"
        else -> "Unknown"
    }
}
