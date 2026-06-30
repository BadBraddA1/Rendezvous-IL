package com.rendezvousil.app.ui.admin

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.rendezvousil.app.auth.AppSession
import com.rendezvousil.core.network.dto.AdminDashboardResponse
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class AdminDashboardUiState(
    val dashboard: AdminDashboardResponse? = null,
    val isLoading: Boolean = false,
    val isRefreshing: Boolean = false,
    val errorMessage: String? = null,
)

class AdminDashboardViewModel(
    private val appSession: AppSession,
) : ViewModel() {
    private val _uiState = MutableStateFlow(AdminDashboardUiState())
    val uiState: StateFlow<AdminDashboardUiState> = _uiState.asStateFlow()

    init {
        viewModelScope.launch {
            appSession.refreshAuth()
            if (appSession.canViewDashboard) {
                loadDashboard(force = false)
            }
        }
    }

    fun refreshAuthAndDashboard() {
        viewModelScope.launch {
            appSession.refreshAuth()
            if (appSession.canViewDashboard) {
                loadDashboard(force = true)
            }
        }
    }

    fun loadDashboard(force: Boolean) {
        if (!appSession.canViewDashboard) return
        val client = appSession.authenticatedApiClient ?: return

        viewModelScope.launch {
            val hasData = _uiState.value.dashboard != null
            _uiState.update {
                it.copy(
                    isLoading = !hasData && (force || it.dashboard == null),
                    isRefreshing = hasData && force,
                    errorMessage = null,
                )
            }

            try {
                val dashboard = client.getAdminDashboard()
                _uiState.update {
                    it.copy(
                        dashboard = dashboard,
                        isLoading = false,
                        isRefreshing = false,
                        errorMessage = null,
                    )
                }
            } catch (error: Exception) {
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        isRefreshing = false,
                        errorMessage = if (it.dashboard == null) {
                            error.message ?: "Could not load dashboard"
                        } else {
                            it.errorMessage
                        },
                    )
                }
            }
        }
    }
}
