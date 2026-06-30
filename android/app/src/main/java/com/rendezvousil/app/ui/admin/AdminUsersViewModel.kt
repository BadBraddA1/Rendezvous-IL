package com.rendezvousil.app.ui.admin

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.rendezvousil.app.auth.AppSession
import com.rendezvousil.core.network.dto.AdminUserRecord
import com.rendezvousil.core.network.dto.AdminUserRolePatchBody
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class AdminUsersUiState(
    val isSignedIn: Boolean = false,
    val canManageUsers: Boolean = false,
    val users: List<AdminUserRecord> = emptyList(),
    val searchQuery: String = "",
    val isLoading: Boolean = false,
    val errorMessage: String? = null,
    val selectedUser: AdminUserRecord? = null,
    val showCreateUser: Boolean = false,
)

class AdminUsersViewModel(
    private val appSession: AppSession,
) : ViewModel() {
    private val _uiState = MutableStateFlow(AdminUsersUiState())
    val uiState: StateFlow<AdminUsersUiState> = _uiState.asStateFlow()

    val filteredUsers: List<AdminUserRecord>
        get() {
            val query = _uiState.value.searchQuery.trim().lowercase()
            if (query.isEmpty()) return _uiState.value.users
            return _uiState.value.users.filter { user ->
                user.email.lowercase().contains(query) ||
                    user.displayName.lowercase().contains(query) ||
                    (user.role?.lowercase()?.contains(query) == true)
            }
        }

    init {
        viewModelScope.launch {
            appSession.isSignedInFlow.collect { signedIn ->
                _uiState.update { it.copy(isSignedIn = signedIn) }
            }
        }
        viewModelScope.launch {
            appSession.canManageUsersFlow.collect { canManage ->
                _uiState.update { it.copy(canManageUsers = canManage) }
            }
        }
        viewModelScope.launch {
            appSession.refreshAuth()
            loadUsers(force = false)
        }
    }

    fun onSearchQueryChange(query: String) {
        _uiState.update { it.copy(searchQuery = query) }
    }

    fun selectUser(user: AdminUserRecord?) {
        _uiState.update { it.copy(selectedUser = user) }
    }

    fun showCreateUser(show: Boolean) {
        _uiState.update { it.copy(showCreateUser = show) }
    }

    fun refresh() {
        viewModelScope.launch {
            appSession.refreshAuth()
            _uiState.update {
                it.copy(
                    isSignedIn = appSession.isSignedIn,
                    canManageUsers = appSession.canManageUsers,
                )
            }
            loadUsers(force = true)
        }
    }

    fun replaceUser(updated: AdminUserRecord) {
        _uiState.update { state ->
            state.copy(
                users = state.users.map { if (it.id == updated.id) updated else it },
                selectedUser = if (state.selectedUser?.id == updated.id) updated else state.selectedUser,
            )
        }
    }

    fun removeUser(userId: String) {
        _uiState.update { state ->
            state.copy(
                users = state.users.filterNot { it.id == userId },
                selectedUser = if (state.selectedUser?.id == userId) null else state.selectedUser,
            )
        }
    }

    fun insertUser(created: AdminUserRecord) {
        _uiState.update { state ->
            state.copy(users = listOf(created) + state.users)
        }
    }

    fun updateAdminUserRole(
        userId: String,
        role: AdminUserRole,
        firstName: String,
        lastName: String,
        onSuccess: (AdminUserRecord) -> Unit,
        onError: (String) -> Unit,
    ) {
        viewModelScope.launch {
            val client = appSession.authenticatedApiClient
            if (client == null) {
                onError("Sign in required.")
                return@launch
            }
            try {
                val response = client.updateAdminUserRole(
                    AdminUserRolePatchBody(
                        userId = userId,
                        role = role.apiValue,
                        firstName = firstName.trim(),
                        lastName = lastName.trim(),
                    ),
                )
                replaceUser(response.user)
                onSuccess(response.user)
            } catch (error: Exception) {
                onError(error.message ?: "Could not update user")
            }
        }
    }

    fun updateAdminUserBan(
        user: AdminUserRecord,
        onSuccess: (AdminUserRecord) -> Unit,
        onError: (String) -> Unit,
    ) {
        viewModelScope.launch {
            val client = appSession.authenticatedApiClient
            if (client == null) {
                onError("Sign in required.")
                return@launch
            }
            try {
                val response = client.updateAdminUserBan(
                    com.rendezvousil.core.network.dto.AdminUserBanPatchBody(
                        userId = user.id,
                        banned = !user.banned,
                    ),
                )
                replaceUser(response.user)
                onSuccess(response.user)
            } catch (error: Exception) {
                onError(error.message ?: "Could not update ban status")
            }
        }
    }

    fun deleteAdminUser(
        userId: String,
        onSuccess: () -> Unit,
        onError: (String) -> Unit,
    ) {
        viewModelScope.launch {
            val client = appSession.authenticatedApiClient
            if (client == null) {
                onError("Sign in required.")
                return@launch
            }
            try {
                client.deleteAdminUser(userId)
                removeUser(userId)
                onSuccess()
            } catch (error: Exception) {
                onError(error.message ?: "Could not delete user")
            }
        }
    }

    fun resetAdminUserPassword(
        userId: String,
        mode: String,
        password: String?,
        onSuccess: (String?) -> Unit,
        onError: (String) -> Unit,
    ) {
        viewModelScope.launch {
            val client = appSession.authenticatedApiClient
            if (client == null) {
                onError("Sign in required.")
                return@launch
            }
            try {
                val response = client.resetAdminUserPassword(userId, mode, password)
                onSuccess(response.url)
            } catch (error: Exception) {
                onError(error.message ?: "Could not reset password")
            }
        }
    }

    fun createAdminUser(
        email: String,
        firstName: String,
        lastName: String,
        role: AdminUserRole,
        password: String?,
        onSuccess: (AdminUserRecord) -> Unit,
        onError: (String) -> Unit,
    ) {
        viewModelScope.launch {
            val client = appSession.authenticatedApiClient
            if (client == null) {
                onError("Sign in required.")
                return@launch
            }
            try {
                val response = client.createAdminUser(
                    email = email.trim().lowercase(),
                    firstName = firstName.trim(),
                    lastName = lastName.trim(),
                    role = role.apiValue,
                    password = password?.takeIf { it.isNotEmpty() },
                )
                insertUser(response.user)
                onSuccess(response.user)
            } catch (error: Exception) {
                onError(error.message ?: "Could not create user")
            }
        }
    }

    private fun loadUsers(force: Boolean) {
        viewModelScope.launch {
            if (_uiState.value.isLoading && !force) return@launch
            val client = appSession.authenticatedApiClient
            if (client == null) {
                _uiState.update { it.copy(errorMessage = "Sign in required.") }
                return@launch
            }

            _uiState.update { it.copy(isLoading = true, errorMessage = null) }
            try {
                val response = client.getAdminUsers()
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        users = response.users,
                        errorMessage = null,
                    )
                }
            } catch (error: Exception) {
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        errorMessage = error.message ?: "Could not load users",
                    )
                }
            }
        }
    }
}
