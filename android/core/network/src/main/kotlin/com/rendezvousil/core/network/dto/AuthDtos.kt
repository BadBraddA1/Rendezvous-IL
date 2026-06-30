package com.rendezvousil.core.network.dto

import kotlinx.serialization.Serializable

@Serializable
data class AdminMeResponse(
    val authenticated: Boolean,
    val admin: AdminUserDto? = null,
    val permissions: AdminPermissionsDto? = null,
)

@Serializable
data class AdminUserDto(
    val id: String,
    val email: String,
    val fullName: String,
    val role: String,
)

@Serializable
data class AdminPermissionsDto(
    val canViewDashboard: Boolean = false,
    val canViewRegistrations: Boolean = false,
    val canCheckIn: Boolean = false,
    val canEdit: Boolean = false,
    val canManageUsers: Boolean = false,
)

@Serializable
data class UserActivityResponse(
    val success: Boolean,
    val platform: String? = null,
)

@Serializable
data class UserActivityBody(
    val platform: String,
    val appVersion: String,
)
