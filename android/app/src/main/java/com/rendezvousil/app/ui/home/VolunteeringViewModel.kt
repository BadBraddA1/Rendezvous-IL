package com.rendezvousil.app.ui.home

import android.app.Application
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.rendezvousil.app.auth.AppSession
import com.rendezvousil.app.notifications.VolunteerReminderService
import com.rendezvousil.core.network.dto.FamilyVolunteeringResponse
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class VolunteeringViewModel(
    private val appSession: AppSession,
    application: Application,
) : ViewModel() {
    private val volunteerReminders = VolunteerReminderService(application)
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
            val payload = if (client == null) {
                null
            } else {
                runCatching { client.getFamilyVolunteering() }.getOrNull()
            }
            _volunteering.value = payload
            withContext(Dispatchers.Default) { volunteerReminders.sync(payload) }
            _isLoading.value = false
        }
    }
}
