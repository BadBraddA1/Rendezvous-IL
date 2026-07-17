package com.rendezvousil.app.ui.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.rendezvousil.app.auth.AppSession
import com.rendezvousil.core.network.dto.FamilyVolunteeringResponse
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class VolunteeringViewModel(
    private val appSession: AppSession,
) : ViewModel() {
    private val _volunteering = MutableStateFlow<FamilyVolunteeringResponse?>(null)
    val volunteering: StateFlow<FamilyVolunteeringResponse?> = _volunteering.asStateFlow()

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    init {
        refresh()
    }

    fun refresh() {
        viewModelScope.launch {
            _isLoading.value = true
            val client = appSession.authenticatedApiClient
            _volunteering.value = if (client == null) {
                null
            } else {
                runCatching { client.getFamilyVolunteering() }.getOrNull()
            }
            _isLoading.value = false
        }
    }
}
