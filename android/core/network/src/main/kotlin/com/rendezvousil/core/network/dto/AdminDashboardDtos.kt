package com.rendezvousil.core.network.dto

import kotlinx.serialization.Serializable

@Serializable
data class AdminUserPayload(
    val id: String,
    val email: String,
    val fullName: String,
    val role: String,
)

@Serializable
data class AdminLodgingBreakdown(
    val motel: Int,
    val rv: Int,
    val tent: Int,
    val drivein: Int,
)

@Serializable
data class AdminDashboardSummary(
    val eventYear: Int,
    val registrationGoal: Int,
    val registrations: Int,
    val registeredAttendees: Int,
    val checkedIn: Int,
    val totalFamilies: Int,
    val totalMembers: Int,
    val expressRegistrations: Int,
    val pendingChanges: Int,
    val activeAnnouncements: Int,
    val feedbackCount: Int,
    val avgRating: Double,
    val returningFamilies: Int,
    val newFamilies: Int,
    val totalRevenue: Double,
    val depositsPaid: Double,
    val fullyPaid: Int,
    val balanceDue: Double,
    val lodgingBreakdown: AdminLodgingBreakdown,
)

@Serializable
data class AdminDashboardResponse(
    val admin: AdminUserPayload,
    val summary: AdminDashboardSummary,
    val registrationProgress: Double,
    val updatedAt: String,
)
