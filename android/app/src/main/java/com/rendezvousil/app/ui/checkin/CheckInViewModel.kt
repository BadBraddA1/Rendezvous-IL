package com.rendezvousil.app.ui.checkin

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.rendezvousil.app.auth.AppSession
import com.rendezvousil.core.network.dto.CheckInLookupResponse
import com.rendezvousil.core.network.dto.CheckInRegistrationSummary
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class CheckInUiState(
    val code: String = "",
    val searchQuery: String = "",
    val searchResults: List<CheckInRegistrationSummary> = emptyList(),
    val lookup: CheckInLookupResponse? = null,
    val roomKeys: String = "",
    val tshirtsDistributed: Boolean = false,
    val isLoading: Boolean = false,
    val errorMessage: String? = null,
    val successMessage: String? = null,
)

class CheckInViewModel(
    private val appSession: AppSession,
) : ViewModel() {
    private val _uiState = MutableStateFlow(CheckInUiState())
    val uiState: StateFlow<CheckInUiState> = _uiState.asStateFlow()

    init {
        viewModelScope.launch {
            appSession.refreshAuth()
        }
    }

    fun onCodeChange(code: String) {
        _uiState.update { it.copy(code = code.uppercase()) }
    }

    fun onSearchQueryChange(query: String) {
        _uiState.update { it.copy(searchQuery = query) }
    }

    fun onRoomKeysChange(keys: String) {
        _uiState.update { it.copy(roomKeys = keys) }
    }

    fun onTshirtsDistributedChange(distributed: Boolean) {
        _uiState.update { it.copy(tshirtsDistributed = distributed) }
    }

    fun onScannedCode(code: String) {
        _uiState.update { it.copy(code = code.trim().uppercase()) }
        lookupByCode()
    }

    fun lookupByCode() {
        val client = appSession.authenticatedApiClient ?: return
        val trimmed = _uiState.value.code.trim()
        if (trimmed.isEmpty()) return

        viewModelScope.launch {
            _uiState.update {
                it.copy(isLoading = true, errorMessage = null, successMessage = null)
            }
            try {
                val response = client.lookupCheckIn(trimmed)
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        lookup = response,
                        roomKeys = response.registration.pre_assigned_keys
                            ?.joinToString(", ")
                            .orEmpty(),
                        tshirtsDistributed = response.registration.tshirts_distributed ?: false,
                        searchResults = emptyList(),
                    )
                }
            } catch (error: Exception) {
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        lookup = null,
                        errorMessage = error.message ?: "Lookup failed",
                    )
                }
            }
        }
    }

    fun searchFamilies() {
        val client = appSession.authenticatedApiClient ?: return
        val trimmed = _uiState.value.searchQuery.trim()
        if (trimmed.isEmpty()) return

        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, errorMessage = null) }
            try {
                val results = client.searchCheckIn(trimmed)
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        searchResults = results,
                        lookup = null,
                    )
                }
            } catch (error: Exception) {
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        searchResults = emptyList(),
                        errorMessage = error.message ?: "Search failed",
                    )
                }
            }
        }
    }

    fun selectSearchResult(result: CheckInRegistrationSummary) {
        val client = appSession.authenticatedApiClient ?: return

        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, errorMessage = null) }
            try {
                val response = client.loadCheckInDetails(result.id)
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        lookup = response,
                        roomKeys = response.registration.pre_assigned_keys
                            ?.joinToString(", ")
                            .orEmpty(),
                        tshirtsDistributed = response.registration.tshirts_distributed ?: false,
                        searchResults = emptyList(),
                    )
                }
            } catch (error: Exception) {
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        errorMessage = error.message ?: "Could not load registration",
                    )
                }
            }
        }
    }

    fun submitCheckIn() {
        val client = appSession.authenticatedApiClient ?: return
        val registration = _uiState.value.lookup?.registration ?: return

        viewModelScope.launch {
            _uiState.update {
                it.copy(isLoading = true, errorMessage = null, successMessage = null)
            }
            val keys = _uiState.value.roomKeys
                .split(",")
                .map { it.trim() }
                .filter { it.isNotEmpty() }

            try {
                val response = client.submitCheckIn(
                    id = registration.id,
                    roomKeys = keys,
                    tshirtsDistributed = _uiState.value.tshirtsDistributed,
                )
                val updatedRegistration = response.registration
                _uiState.update { state ->
                    val lookup = state.lookup
                    state.copy(
                        isLoading = false,
                        lookup = if (updatedRegistration != null && lookup != null) {
                            lookup.copy(registration = updatedRegistration)
                        } else {
                            lookup
                        },
                        successMessage = "${registration.family_last_name} family checked in.",
                    )
                }
            } catch (error: Exception) {
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        errorMessage = error.message ?: "Check-in failed",
                    )
                }
            }
        }
    }

    fun undoCheckIn() {
        val client = appSession.authenticatedApiClient ?: return
        val registration = _uiState.value.lookup?.registration ?: return

        viewModelScope.launch {
            _uiState.update {
                it.copy(isLoading = true, errorMessage = null, successMessage = null)
            }
            try {
                client.undoCheckIn(registration.id)
                val refreshed = client.loadCheckInDetails(registration.id)
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        lookup = refreshed,
                        roomKeys = "",
                        tshirtsDistributed = false,
                        successMessage = "Check-in undone.",
                    )
                }
            } catch (error: Exception) {
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        errorMessage = error.message ?: "Undo failed",
                    )
                }
            }
        }
    }
}
