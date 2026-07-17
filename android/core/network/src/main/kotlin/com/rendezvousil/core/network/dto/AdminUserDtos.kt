package com.rendezvousil.core.network.dto

import kotlinx.serialization.Serializable

@Serializable
data class AdminUserRecord(
    val id: String,
    val email: String,
    val firstName: String? = null,
    val lastName: String? = null,
    val imageUrl: String,
    val role: String? = null,
    val createdAt: Long,
    val lastSignInAt: Long? = null,
    val lastActiveAt: Long? = null,
    val banned: Boolean,
    val locked: Boolean,
    val lastSeenAt: String? = null,
    val lastPlatform: String? = null,
    val lastAppVersion: String? = null,
    val visitCount: Int,
) {
    val displayName: String
        get() {
            val name = listOfNotNull(firstName, lastName)
                .joinToString(" ")
                .trim()
            return name.ifEmpty { email }
        }

    val roleLabel: String
        get() = when (role?.lowercase()) {
            "admin" -> "Admin"
            "staff" -> "Staff"
            "moderator" -> "Moderator"
            null, "", "user", "member" -> "Member"
            else -> role.replaceFirstChar { it.uppercase() }
        }
}

@Serializable
data class AdminUsersListResponse(
    val users: List<AdminUserRecord> = emptyList(),
)

@Serializable
data class AdminUserMutationResponse(
    val success: Boolean,
    val user: AdminUserRecord,
)

@Serializable
data class AdminUserCreateBody(
    val email: String,
    val firstName: String? = null,
    val lastName: String? = null,
    val role: String? = null,
    val password: String? = null,
)

@Serializable
data class AdminUserRolePatchBody(
    val userId: String,
    val role: String? = null,
    val firstName: String,
    val lastName: String,
)

@Serializable
data class AdminUserBanPatchBody(
    val userId: String,
    val banned: Boolean,
)

@Serializable
data class AdminResetPasswordBody(
    val mode: String,
    val password: String? = null,
)

@Serializable
data class AdminResetPasswordResponse(
    val success: Boolean,
    val mode: String? = null,
    val url: String? = null,
    val forgotPasswordUrl: String? = null,
)

@Serializable
data class SimpleSuccessResponse(
    val success: Boolean,
)
