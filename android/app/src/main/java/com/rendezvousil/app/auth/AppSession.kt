package com.rendezvousil.app.auth

import com.rendezvousil.core.network.ApiClient
import kotlinx.coroutines.flow.StateFlow

/**
 * Auth surface for signed-in API calls and admin flags.
 */
interface AppSession {
    val isSignedIn: Boolean
    /** Clerk user id when signed in (for chat “mine” bubbles, etc.). */
    val clerkUserId: String?
    val isAdmin: Boolean
    val canViewDashboard: Boolean
    val canCheckIn: Boolean
    val canManageUsers: Boolean
    val adminRole: String?
    val adminName: String?
    val isLoading: Boolean
    val clerkSetupError: String?

    val isSignedInFlow: StateFlow<Boolean>
    val isAdminFlow: StateFlow<Boolean>
    val canViewDashboardFlow: StateFlow<Boolean>
    val canCheckInFlow: StateFlow<Boolean>
    val canManageUsersFlow: StateFlow<Boolean>
    val adminRoleFlow: StateFlow<String?>
    val adminNameFlow: StateFlow<String?>
    val isLoadingFlow: StateFlow<Boolean>
    val clerkSetupErrorFlow: StateFlow<String?>

    val authenticatedApiClient: ApiClient?
    val publicApiClient: ApiClient

    suspend fun bootstrapAuthIfNeeded()
    suspend fun refreshAuth()
    suspend fun refreshAdminStatus()
    suspend fun signOut()
    suspend fun recordActivityIfSignedIn()
}
