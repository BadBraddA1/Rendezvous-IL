package com.rendezvousil.app.ui.checkin

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.rendezvousil.app.auth.AppSession
import com.rendezvousil.core.network.dto.CheckInLookupResponse
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class CheckInUiState(
    val lookup: CheckInLookupResponse? = null,
    val roomKeys: String = "",
    val tshirtsDistributed: Boolean = false,
    val isLoading: Boolean = false,
    val errorMessage: String? = null,
    val successMessage: String? = null,
    /** RF Orca–style banner after successful check-in. */
    val finalizedBanner: String? = null,
)

sealed interface CheckInBoopEvent {
    data object Good : CheckInBoopEvent
    data object Bad : CheckInBoopEvent
}

class CheckInViewModel(
    private val appSession: AppSession,
) : ViewModel() {
    private val _uiState = MutableStateFlow(CheckInUiState())
    val uiState: StateFlow<CheckInUiState> = _uiState.asStateFlow()

    private val _boops = MutableSharedFlow<CheckInBoopEvent>(extraBufferCapacity = 4)
    val boops: SharedFlow<CheckInBoopEvent> = _boops.asSharedFlow()

    init {
        viewModelScope.launch {
            appSession.refreshAuth()
        }
    }

    fun onRoomKeysChange(keys: String) {
        _uiState.update { it.copy(roomKeys = keys) }
    }

    fun onTshirtsDistributedChange(distributed: Boolean) {
        _uiState.update { it.copy(tshirtsDistributed = distributed) }
    }

    fun onScannedCode(code: String) {
        lookupByCode(code.trim())
    }

    fun resetStation() {
        _uiState.value = CheckInUiState()
    }

    private fun showFinalizedBanner(familyLastName: String) {
        viewModelScope.launch {
            _uiState.update {
                it.copy(
                    successMessage = null,
                    finalizedBanner = "Finalized check-in · $familyLastName family",
                )
            }
            delay(5_000)
            _uiState.update { state ->
                if (state.finalizedBanner != null) state.copy(finalizedBanner = null) else state
            }
        }
    }

    private fun lookupByCode(trimmed: String) {
        val client = appSession.authenticatedApiClient ?: return
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
                    )
                }
                _boops.emit(CheckInBoopEvent.Good)
            } catch (error: Exception) {
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        lookup = null,
                        errorMessage = error.message ?: "Lookup failed",
                    )
                }
                _boops.emit(CheckInBoopEvent.Bad)
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
                        successMessage = null,
                    )
                }
                _boops.emit(CheckInBoopEvent.Good)
                showFinalizedBanner(registration.family_last_name)            } catch (error: Exception) {
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        errorMessage = error.message ?: "Check-in failed",
                    )
                }
                _boops.emit(CheckInBoopEvent.Bad)
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
                        roomKeys = refreshed.registration.pre_assigned_keys
                            ?.joinToString(", ")
                            .orEmpty(),
                        tshirtsDistributed = refreshed.registration.tshirts_distributed ?: false,
                        successMessage = "Check-in undone.",
                    )
                }
                _boops.emit(CheckInBoopEvent.Good)
            } catch (error: Exception) {
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        errorMessage = error.message ?: "Undo failed",
                    )
                }
                _boops.emit(CheckInBoopEvent.Bad)
            }
        }
    }
}
