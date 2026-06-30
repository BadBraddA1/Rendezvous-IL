package com.rendezvousil.app.auth

import com.clerk.api.Clerk
import com.clerk.api.network.serialization.ClerkResult
import com.clerk.api.session.GetTokenOptions
import com.clerk.api.session.fetchToken
import com.rendezvousil.core.network.ApiClient
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.drop
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch

class ClerkAppSession(
    private val applicationScope: CoroutineScope,
    private val baseUrl: String,
    private val appVersion: String,
    private val clerkPublishableKey: String,
    override val publicApiClient: ApiClient,
) : AppSession {
    private val _isSignedIn = MutableStateFlow(false)
    override val isSignedInFlow: StateFlow<Boolean> = _isSignedIn.asStateFlow()
    override val isSignedIn: Boolean
        get() = _isSignedIn.value

    private val _isAdmin = MutableStateFlow(false)
    override val isAdminFlow: StateFlow<Boolean> = _isAdmin.asStateFlow()
    override val isAdmin: Boolean
        get() = _isAdmin.value

    private val _canViewDashboard = MutableStateFlow(false)
    override val canViewDashboardFlow: StateFlow<Boolean> = _canViewDashboard.asStateFlow()
    override val canViewDashboard: Boolean
        get() = _canViewDashboard.value

    private val _canCheckIn = MutableStateFlow(false)
    override val canCheckInFlow: StateFlow<Boolean> = _canCheckIn.asStateFlow()
    override val canCheckIn: Boolean
        get() = _canCheckIn.value

    private val _canManageUsers = MutableStateFlow(false)
    override val canManageUsersFlow: StateFlow<Boolean> = _canManageUsers.asStateFlow()
    override val canManageUsers: Boolean
        get() = _canManageUsers.value

    private val _adminRole = MutableStateFlow<String?>(null)
    override val adminRoleFlow: StateFlow<String?> = _adminRole.asStateFlow()
    override val adminRole: String?
        get() = _adminRole.value

    private val _adminName = MutableStateFlow<String?>(null)
    override val adminNameFlow: StateFlow<String?> = _adminName.asStateFlow()
    override val adminName: String?
        get() = _adminName.value

    private val _isLoading = MutableStateFlow(false)
    override val isLoadingFlow: StateFlow<Boolean> = _isLoading.asStateFlow()
    override val isLoading: Boolean
        get() = _isLoading.value

    private val _clerkSetupError = MutableStateFlow<String?>(null)
    override val clerkSetupErrorFlow: StateFlow<String?> = _clerkSetupError.asStateFlow()
    override val clerkSetupError: String?
        get() = _clerkSetupError.value

    private var authenticatedClient: ApiClient? = null
    override val authenticatedApiClient: ApiClient?
        get() = authenticatedClient

    private var activityPingJob: Job? = null
    private var sessionObserverStarted = false

    override suspend fun bootstrapAuthIfNeeded() {
        if (clerkPublishableKey.isBlank()) {
            _clerkSetupError.value =
                "Add CLERK_PUBLISHABLE_KEY to android/local.properties (copy from .env.local)."
            return
        }

        if (Clerk.session != null) {
            _isLoading.value = true
        }

        try {
            Clerk.isInitialized.first { it }
        } catch (error: Exception) {
            _clerkSetupError.value = error.message
            _isLoading.value = false
            return
        }

        startSessionObserverIfNeeded()
        refreshAuth(suppressLoadingUI = true)
    }

    override suspend fun refreshAuth() {
        refreshAuth(suppressLoadingUI = false)
    }

    private suspend fun refreshAuth(suppressLoadingUI: Boolean) {
        if (!suppressLoadingUI) {
            _isLoading.value = true
        }

        try {
            if (Clerk.session == null) {
                clearSession()
                return
            }

            authenticatedClient = ApiClient.create(
                baseUrl = baseUrl,
                bearerTokenProvider = { sessionToken(forceRefresh = false) },
            )
            _isSignedIn.value = true
            refreshAdminStatus()
            recordActivityIfSignedIn()
            startActivityPingLoop()
        } finally {
            _isLoading.value = false
        }
    }

    override suspend fun recordActivityIfSignedIn() {
        val client = authenticatedClient ?: return
        try {
            client.recordUserActivity(appVersion = appVersion)
        } catch (_: Exception) {
            // Best-effort heartbeat; ignore transient failures.
        }
    }

    override suspend fun refreshAdminStatus() {
        val client = authenticatedClient
        if (client == null) {
            clearAdminFlags()
            return
        }

        try {
            val response = client.getAdminMe()
            val admin = response.admin
            if (admin != null) {
                _isAdmin.value = true
                _adminRole.value = admin.role
                _adminName.value = admin.fullName.ifBlank { admin.email }
                _canViewDashboard.value = response.permissions?.canViewDashboard ?: true
                _canCheckIn.value = response.permissions?.canCheckIn
                    ?: (admin.role == "admin" || admin.role == "editor" || admin.role == "checkin")
                _canManageUsers.value = response.permissions?.canManageUsers
                    ?: (admin.role == "admin")
            } else {
                clearAdminFlags()
            }
        } catch (_: Exception) {
            clearAdminFlags()
        }
    }

    override suspend fun signOut() {
        Clerk.auth.signOut()
        clearSession()
    }

    private fun startSessionObserverIfNeeded() {
        if (sessionObserverStarted) return
        sessionObserverStarted = true

        applicationScope.launch {
            Clerk.sessionFlow.drop(1).collect { session ->
                if (session != null) {
                    refreshAuth(suppressLoadingUI = true)
                } else {
                    clearSession()
                }
            }
        }
    }

    private fun startActivityPingLoop() {
        activityPingJob?.cancel()
        if (!_isSignedIn.value || authenticatedClient == null) return

        activityPingJob = applicationScope.launch {
            while (isActive) {
                delay(ACTIVITY_PING_INTERVAL_MS)
                recordActivityIfSignedIn()
            }
        }
    }

    private fun clearSession() {
        activityPingJob?.cancel()
        activityPingJob = null
        authenticatedClient = null
        _isSignedIn.value = false
        clearAdminFlags()
    }

    private fun clearAdminFlags() {
        _isAdmin.value = false
        _canViewDashboard.value = false
        _canCheckIn.value = false
        _canManageUsers.value = false
        _adminRole.value = null
        _adminName.value = null
    }

    private suspend fun sessionToken(forceRefresh: Boolean): String? {
        val session = Clerk.session ?: return null
        return when (
            val result = session.fetchToken(
                GetTokenOptions(skipCache = forceRefresh),
            )
        ) {
            is ClerkResult.Success -> result.value.jwt
            is ClerkResult.Failure -> null
        }
    }

    companion object {
        private const val ACTIVITY_PING_INTERVAL_MS = 300_000L
    }
}
