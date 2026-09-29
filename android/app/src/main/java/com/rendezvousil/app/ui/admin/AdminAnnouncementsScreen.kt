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
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
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
import com.rendezvousil.core.network.dto.AdminAnnouncementItem
import com.rendezvousil.core.network.dto.AdminCreateAnnouncementBody
import java.time.LocalDateTime
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class AdminAnnouncementsUiState(
    val items: List<AdminAnnouncementItem> = emptyList(),
    val title: String = "",
    val message: String = "",
    val sendPush: Boolean = false,
    val scheduleLater: Boolean = false,
    val publishLocal: String = "",
    val isLoading: Boolean = false,
    val submitting: Boolean = false,
    val errorMessage: String? = null,
    val statusMessage: String? = null,
)

class AdminAnnouncementsViewModel(
    private val appSession: AppSession,
) : ViewModel() {
    private val _uiState = MutableStateFlow(AdminAnnouncementsUiState())
    val uiState: StateFlow<AdminAnnouncementsUiState> = _uiState.asStateFlow()

    init {
        refresh()
    }

    fun onTitle(value: String) = _uiState.update { it.copy(title = value) }
    fun onMessage(value: String) = _uiState.update { it.copy(message = value) }
    fun onSendPush(value: Boolean) = _uiState.update { it.copy(sendPush = value) }
    fun onScheduleLater(value: Boolean) = _uiState.update { it.copy(scheduleLater = value) }
    fun onPublishLocal(value: String) = _uiState.update { it.copy(publishLocal = value) }

    fun refresh() {
        val client = appSession.authenticatedApiClient ?: return
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, errorMessage = null) }
            try {
                val response = client.getAdminAnnouncements()
                _uiState.update {
                    it.copy(items = response.announcements.orEmpty(), isLoading = false)
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(isLoading = false, errorMessage = e.message ?: "Failed to load")
                }
            }
        }
    }

    fun create() {
        val client = appSession.authenticatedApiClient ?: return
        val state = _uiState.value
        val title = state.title.trim()
        val message = state.message.trim()
        if (title.isEmpty() || message.isEmpty()) {
            _uiState.update { it.copy(errorMessage = "Title and message are required") }
            return
        }
        val publishAt = if (state.scheduleLater) {
            centralLocalToIso(state.publishLocal) ?: run {
                _uiState.update { it.copy(errorMessage = "Use YYYY-MM-DDTHH:MM for schedule time") }
                return
            }
        } else {
            null
        }

        viewModelScope.launch {
            _uiState.update { it.copy(submitting = true, errorMessage = null, statusMessage = null) }
            try {
                val response = client.createAdminAnnouncement(
                    AdminCreateAnnouncementBody(
                        title = title,
                        message = message,
                        sendPush = state.sendPush,
                        publishAt = publishAt,
                    ),
                )
                _uiState.update {
                    it.copy(
                        submitting = false,
                        title = "",
                        message = "",
                        sendPush = false,
                        scheduleLater = false,
                        publishLocal = "",
                        statusMessage = response.message ?: "Saved",
                    )
                }
                refresh()
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(submitting = false, errorMessage = e.message ?: "Create failed")
                }
            }
        }
    }

    fun setActive(item: AdminAnnouncementItem, active: Boolean) {
        val client = appSession.authenticatedApiClient ?: return
        viewModelScope.launch {
            try {
                client.setAdminAnnouncementActive(item.id, active)
                refresh()
            } catch (e: Exception) {
                _uiState.update { it.copy(errorMessage = e.message ?: "Update failed") }
            }
        }
    }
}

private fun centralLocalToIso(local: String): String? {
    val trimmed = local.trim()
    if (!Regex("""\d{4}-\d{2}-\d{2}T\d{2}:\d{2}""").matches(trimmed)) return null
    val month = trimmed.substring(5, 7).toIntOrNull() ?: return null
    val offset = if (month in 3..10) "-05:00" else "-06:00"
    return "$trimmed:00$offset"
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AdminAnnouncementsScreen(
    appSession: AppSession,
    viewModelFactory: RendezvousViewModelFactory,
    onBack: () -> Unit,
) {
    val viewModel: AdminAnnouncementsViewModel = viewModel(factory = viewModelFactory)
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val canEdit by appSession.canEditFlow.collectAsStateWithLifecycle()

    LaunchedEffect(Unit) { viewModel.refresh() }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Announcements") },
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
            if (canEdit) {
                item {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text("New announcement", fontWeight = FontWeight.SemiBold, color = BrandColors.Lake)
                        OutlinedTextField(
                            value = uiState.title,
                            onValueChange = viewModel::onTitle,
                            label = { Text("Title") },
                            modifier = Modifier.fillMaxWidth(),
                        )
                        OutlinedTextField(
                            value = uiState.message,
                            onValueChange = viewModel::onMessage,
                            label = { Text("Message") },
                            modifier = Modifier.fillMaxWidth(),
                            minLines = 3,
                        )
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Checkbox(checked = uiState.sendPush, onCheckedChange = viewModel::onSendPush)
                            Text("Send app push")
                        }
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Checkbox(checked = uiState.scheduleLater, onCheckedChange = viewModel::onScheduleLater)
                            Text("Schedule for later (Central)")
                        }
                        if (uiState.scheduleLater) {
                            OutlinedTextField(
                                value = uiState.publishLocal,
                                onValueChange = viewModel::onPublishLocal,
                                label = { Text("YYYY-MM-DDTHH:MM") },
                                modifier = Modifier.fillMaxWidth(),
                                placeholder = {
                                    Text(
                                        LocalDateTime.now(ZoneId.of("America/Chicago"))
                                            .format(DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm")),
                                    )
                                },
                            )
                        }
                        Button(
                            onClick = viewModel::create,
                            enabled = !uiState.submitting,
                            colors = ButtonDefaults.buttonColors(containerColor = BrandColors.Lake),
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            Text(if (uiState.scheduleLater) "Schedule" else "Post")
                        }
                    }
                }
            }

            uiState.statusMessage?.let {
                item { Text(it, color = BrandColors.Lake, style = MaterialTheme.typography.bodySmall) }
            }
            uiState.errorMessage?.let {
                item { Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall) }
            }

            if (uiState.isLoading && uiState.items.isEmpty()) {
                item { CircularProgressIndicator(color = BrandColors.Lake) }
            }

            items(uiState.items, key = { it.id }) { item ->
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text(item.title, fontWeight = FontWeight.SemiBold)
                    Text(item.message, style = MaterialTheme.typography.bodySmall)
                    if (!item.is_active && item.publish_at != null) {
                        Text("Scheduled · ${item.publish_at}", style = MaterialTheme.typography.labelSmall)
                    }
                    if (canEdit) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text("Active", modifier = Modifier.weight(1f))
                            Switch(
                                checked = item.is_active,
                                onCheckedChange = { viewModel.setActive(item, it) },
                            )
                        }
                    }
                }
            }
        }
    }
}
