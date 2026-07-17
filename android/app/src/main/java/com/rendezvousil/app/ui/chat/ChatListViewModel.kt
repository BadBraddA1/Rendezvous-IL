package com.rendezvousil.app.ui.chat

import android.app.Application
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.rendezvousil.app.auth.AppSession
import com.rendezvousil.app.chat.ChatDataStore
import com.rendezvousil.app.chat.sortedForDisplay
import com.rendezvousil.core.network.ApiException
import com.rendezvousil.core.network.dto.ChatChannelSummary
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

data class ChatListUiState(
    val isSignedIn: Boolean = false,
    val channels: List<ChatChannelSummary> = emptyList(),
    val isLoading: Boolean = false,
    val errorMessage: String? = null,
    val emptyHint: String? = null,
)

class ChatListViewModel(
    private val appSession: AppSession,
    application: Application,
) : ViewModel() {
    private val cache = ChatDataStore(application)
    private val _uiState = MutableStateFlow(ChatListUiState())
    val uiState: StateFlow<ChatListUiState> = _uiState.asStateFlow()

    init {
        viewModelScope.launch {
            appSession.isSignedInFlow.collect { signedIn ->
                _uiState.update { it.copy(isSignedIn = signedIn) }
                if (signedIn) {
                    load(force = false)
                } else {
                    _uiState.update {
                        it.copy(
                            channels = emptyList(),
                            isLoading = false,
                            errorMessage = null,
                            emptyHint = "Sign in to see your year group chats.",
                        )
                    }
                }
            }
        }
        viewModelScope.launch { appSession.refreshAuth() }
    }

    fun refresh() = load(force = true)

    fun load(force: Boolean) {
        viewModelScope.launch {
            if (!appSession.isSignedIn) {
                _uiState.update {
                    it.copy(
                        isSignedIn = false,
                        channels = emptyList(),
                        isLoading = false,
                        emptyHint = "Sign in to see your year group chats.",
                    )
                }
                return@launch
            }

            val client = appSession.authenticatedApiClient
            if (client == null) {
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        errorMessage = "Could not connect your account. Try signing out and back in.",
                    )
                }
                return@launch
            }

            if (!force) {
                val cached = withContext(Dispatchers.IO) { cache.loadChannels() }
                if (!cached.isNullOrEmpty()) {
                    _uiState.update {
                        it.copy(
                            channels = cached.sortedForDisplay(),
                            isLoading = false,
                            errorMessage = null,
                        )
                    }
                } else {
                    _uiState.update { it.copy(isLoading = true, errorMessage = null) }
                }
            } else {
                _uiState.update { it.copy(errorMessage = null) }
            }

            try {
                val response = client.getChatChannels()
                val channels = response.channels.sortedForDisplay()
                withContext(Dispatchers.IO) { cache.saveChannels(channels) }
                _uiState.update {
                    it.copy(
                        channels = channels,
                        isLoading = false,
                        errorMessage = null,
                        emptyHint = if (channels.isEmpty()) {
                            "Register for a Rendezvous year on rendezvousil.com to join that year's group chat."
                        } else {
                            null
                        },
                    )
                }
            } catch (error: ApiException.Unauthorized) {
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        errorMessage = if (it.channels.isEmpty()) {
                            "Sign in required to load chats."
                        } else {
                            it.errorMessage
                        },
                    )
                }
            } catch (error: Exception) {
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        errorMessage = if (it.channels.isEmpty()) {
                            error.message ?: "Could not load chat"
                        } else {
                            it.errorMessage
                        },
                    )
                }
            }
        }
    }
}
