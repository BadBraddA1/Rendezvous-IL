package com.rendezvousil.app.ui.admin

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.compose.viewModel
import com.rendezvousil.app.auth.AppSession
import com.rendezvousil.app.di.RendezvousViewModelFactory
import com.rendezvousil.app.theme.BrandColors
import com.rendezvousil.core.network.dto.AdminEventPingBody
import com.rendezvousil.core.network.dto.AdminScheduleEventRow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class AdminEventPingsUiState(
    val events: List<AdminScheduleEventRow> = emptyList(),
    val isLoading: Boolean = false,
    val busyId: Int? = null,
    val errorMessage: String? = null,
    val statusMessage: String? = null,
)

class AdminEventPingsViewModel(
    private val appSession: AppSession,
) : ViewModel() {
    private val _uiState = MutableStateFlow(AdminEventPingsUiState())
    val uiState: StateFlow<AdminEventPingsUiState> = _uiState.asStateFlow()

    init {
        refresh()
    }

    fun refresh() {
        val client = appSession.authenticatedApiClient ?: return
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, errorMessage = null) }
            try {
                val response = client.getAdminScheduleEvents()
                _uiState.update {
                    it.copy(events = response.events.orEmpty(), isLoading = false)
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(isLoading = false, errorMessage = e.message ?: "Failed to load schedule")
                }
            }
        }
    }

    fun ping(event: AdminScheduleEventRow, mode: String, minutesBefore: Int? = null) {
        val client = appSession.authenticatedApiClient ?: return
        viewModelScope.launch {
            _uiState.update { it.copy(busyId = event.id, errorMessage = null, statusMessage = null) }
            try {
                val response = client.pingScheduleEvent(
                    event.id,
                    AdminEventPingBody(mode = mode, minutesBefore = minutesBefore),
                )
                val status = if (mode == "now") {
                    val n = response.push?.recipients
                    if (n != null) "Pinged “${event.title}” · $n devices" else "Pinged “${event.title}”"
                } else {
                    "Scheduled ping for “${event.title}”"
                }
                _uiState.update { it.copy(busyId = null, statusMessage = status) }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(busyId = null, errorMessage = e.message ?: "Ping failed")
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AdminEventPingsScreen(
    appSession: AppSession,
    viewModelFactory: RendezvousViewModelFactory,
    onBack: () -> Unit,
) {
    val viewModel: AdminEventPingsViewModel = viewModel(factory = viewModelFactory)
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val canEdit by appSession.canEditFlow.collectAsStateWithLifecycle()

    LaunchedEffect(Unit) { viewModel.refresh() }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Event pings") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
            )
        },
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            if (!canEdit) {
                item {
                    Text("Editor or admin role required to send event pings.")
                }
            }
            uiState.statusMessage?.let {
                item { Text(it, color = BrandColors.Lake, style = MaterialTheme.typography.bodySmall) }
            }
            uiState.errorMessage?.let {
                item { Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall) }
            }
            if (uiState.isLoading && uiState.events.isEmpty()) {
                item { CircularProgressIndicator(color = BrandColors.Lake) }
            }
            items(uiState.events, key = { it.id }) { event ->
                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text("${event.time} · ${event.title}", fontWeight = FontWeight.SemiBold)
                    event.location?.takeIf { it.isNotBlank() }?.let {
                        Text(it, style = MaterialTheme.typography.bodySmall)
                    }
                    if (canEdit) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            Button(
                                onClick = { viewModel.ping(event, "now") },
                                enabled = uiState.busyId != event.id,
                                colors = ButtonDefaults.buttonColors(containerColor = BrandColors.Lake),
                            ) { Text("Ping now") }
                            OutlinedButton(
                                onClick = { viewModel.ping(event, "at_start") },
                                enabled = uiState.busyId != event.id,
                            ) { Text("At start") }
                            OutlinedButton(
                                onClick = { viewModel.ping(event, "minutes_before", 10) },
                                enabled = uiState.busyId != event.id,
                            ) { Text("−10 min") }
                        }
                    }
                }
            }
        }
    }
}
