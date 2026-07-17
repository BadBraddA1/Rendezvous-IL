package com.rendezvousil.app.ui.chat

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.rendezvousil.app.auth.AppSession
import com.rendezvousil.app.chat.AblyChatService
import com.rendezvousil.app.chat.ChatRealtimeEvent
import com.rendezvousil.core.network.ApiException
import com.rendezvousil.core.network.dto.ChatMessage
import com.rendezvousil.core.network.dto.ChatReactionEmoji
import com.rendezvousil.core.network.dto.ChatReactionUpdate
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.coroutines.Dispatchers

enum class ChatRealtimeStatus {
    Connecting,
    Connected,
    Unavailable,
}

data class PendingChatPhoto(
    val id: String,
    val bytes: ByteArray,
    val mimeType: String,
)

data class ChatThreadUiState(
    val channelId: String = "",
    val title: String = "Chat",
    val messages: List<ChatMessage> = emptyList(),
    val draft: String = "",
    val pendingPhotos: List<PendingChatPhoto> = emptyList(),
    val isLoading: Boolean = true,
    val isSending: Boolean = false,
    val canModerate: Boolean = false,
    val errorMessage: String? = null,
    val realtimeStatus: ChatRealtimeStatus = ChatRealtimeStatus.Connecting,
    val showPollSheet: Boolean = false,
    val pollQuestion: String = "",
    val pollOptions: List<String> = listOf("", ""),
    val currentUserId: String = "",
)

class ChatThreadViewModel(
    private val appSession: AppSession,
    savedStateHandle: SavedStateHandle,
) : ViewModel() {
    private val channelId: String = checkNotNull(savedStateHandle.get<String>("channelId"))
    private val initialTitle: String = savedStateHandle.get<String>("title") ?: "Chat"
    private val initialCanModerate: Boolean =
        savedStateHandle.get<String>("canModerate") == "true"

    private val ably = AblyChatService()
    private var pollJob: Job? = null

    private val _uiState = MutableStateFlow(
        ChatThreadUiState(
            channelId = channelId,
            title = initialTitle,
            canModerate = initialCanModerate || appSession.isAdmin,
            currentUserId = appSession.clerkUserId.orEmpty(),
        ),
    )
    val uiState: StateFlow<ChatThreadUiState> = _uiState.asStateFlow()

    val reactionEmojis: List<String> = ChatReactionEmoji.all

    init {
        viewModelScope.launch { setup() }
    }

    override fun onCleared() {
        pollJob?.cancel()
        ably.disconnect()
        super.onCleared()
    }

    fun onDraftChange(value: String) {
        _uiState.update { it.copy(draft = value) }
    }

    fun onPollQuestionChange(value: String) {
        _uiState.update { it.copy(pollQuestion = value) }
    }

    fun onPollOptionChange(index: Int, value: String) {
        _uiState.update { state ->
            val options = state.pollOptions.toMutableList()
            if (index in options.indices) options[index] = value
            state.copy(pollOptions = options)
        }
    }

    fun addPollOption() {
        _uiState.update { state ->
            if (state.pollOptions.size >= 6) state
            else state.copy(pollOptions = state.pollOptions + "")
        }
    }

    fun removePollOption(index: Int) {
        _uiState.update { state ->
            if (state.pollOptions.size <= 2) state
            else state.copy(pollOptions = state.pollOptions.filterIndexed { i, _ -> i != index })
        }
    }

    fun setShowPollSheet(show: Boolean) {
        _uiState.update { it.copy(showPollSheet = show) }
    }

    fun addPhotos(photos: List<PendingChatPhoto>) {
        _uiState.update { state ->
            val remaining = (MAX_PHOTOS - state.pendingPhotos.size).coerceAtLeast(0)
            state.copy(pendingPhotos = state.pendingPhotos + photos.take(remaining))
        }
    }

    fun removePhoto(id: String) {
        _uiState.update { state ->
            state.copy(pendingPhotos = state.pendingPhotos.filterNot { it.id == id })
        }
    }

    fun refresh() {
        viewModelScope.launch { reloadMessages(showLoading = _uiState.value.messages.isEmpty()) }
    }

    fun sendMessage(isAnnouncement: Boolean = false) {
        viewModelScope.launch {
            val state = _uiState.value
            val body = state.draft.trim()
            val photos = state.pendingPhotos
            if (body.isEmpty() && photos.isEmpty()) return@launch

            val client = appSession.authenticatedApiClient ?: run {
                _uiState.update { it.copy(errorMessage = "Could not connect your account.") }
                return@launch
            }

            _uiState.update { it.copy(isSending = true, errorMessage = null) }
            try {
                val response = if (photos.isEmpty()) {
                    client.sendChatMessage(channelId, body, isAnnouncement)
                } else {
                    client.sendChatMessageWithPhotos(
                        channelId = channelId,
                        body = body,
                        isAnnouncement = isAnnouncement,
                        photos = photos.map { it.bytes to it.mimeType },
                    )
                }
                upsertMessage(response.message)
                _uiState.update {
                    it.copy(
                        draft = "",
                        pendingPhotos = emptyList(),
                        isSending = false,
                        errorMessage = null,
                    )
                }
            } catch (error: Exception) {
                _uiState.update {
                    it.copy(
                        isSending = false,
                        errorMessage = error.message ?: "Could not send message",
                    )
                }
            }
        }
    }

    fun createPoll() {
        viewModelScope.launch {
            val state = _uiState.value
            val question = state.pollQuestion.trim()
            val options = state.pollOptions.map { it.trim() }.filter { it.isNotEmpty() }
            if (question.isEmpty() || options.size < 2) return@launch

            val client = appSession.authenticatedApiClient ?: return@launch
            _uiState.update { it.copy(isSending = true, errorMessage = null) }
            try {
                val response = client.createChatPoll(channelId, question, options)
                upsertMessage(response.message)
                _uiState.update {
                    it.copy(
                        isSending = false,
                        showPollSheet = false,
                        pollQuestion = "",
                        pollOptions = listOf("", ""),
                        errorMessage = null,
                    )
                }
            } catch (error: Exception) {
                _uiState.update {
                    it.copy(
                        isSending = false,
                        errorMessage = error.message ?: "Could not create poll",
                    )
                }
            }
        }
    }

    fun vote(messageId: String, optionIndex: Int) {
        viewModelScope.launch {
            val client = appSession.authenticatedApiClient ?: return@launch
            try {
                val response = client.voteOnChatPoll(messageId, optionIndex)
                _uiState.update { state ->
                    state.copy(
                        messages = state.messages.map { message ->
                            if (message.id != messageId) message
                            else message.copy(
                                poll_counts = response.poll.poll_counts,
                                my_vote = response.poll.my_vote ?: optionIndex,
                            )
                        },
                    )
                }
            } catch (error: Exception) {
                _uiState.update {
                    it.copy(errorMessage = error.message ?: "Could not vote")
                }
            }
        }
    }

    fun toggleReaction(messageId: String, emoji: String) {
        viewModelScope.launch {
            val client = appSession.authenticatedApiClient ?: return@launch
            try {
                val response = client.toggleChatReaction(messageId, emoji)
                applyReactionUpdate(response.reaction)
            } catch (error: Exception) {
                _uiState.update {
                    it.copy(errorMessage = error.message ?: "Could not update reaction")
                }
            }
        }
    }

    fun deleteMessage(messageId: String) {
        viewModelScope.launch {
            val client = appSession.authenticatedApiClient ?: return@launch
            try {
                client.deleteChatMessage(messageId)
                _uiState.update { state ->
                    state.copy(messages = state.messages.filterNot { it.id == messageId })
                }
            } catch (error: Exception) {
                _uiState.update {
                    it.copy(errorMessage = error.message ?: "Could not delete message")
                }
            }
        }
    }

    private suspend fun setup() {
        appSession.refreshAdminStatus()
        _uiState.update {
            it.copy(
                canModerate = initialCanModerate || appSession.isAdmin,
                currentUserId = appSession.clerkUserId.orEmpty(),
            )
        }
        reloadMessages(showLoading = true)
        connectRealtime()
    }

    private suspend fun reloadMessages(showLoading: Boolean) {
        val client = appSession.authenticatedApiClient ?: run {
            _uiState.update {
                it.copy(
                    isLoading = false,
                    errorMessage = "Could not connect your account.",
                )
            }
            return
        }
        if (showLoading) {
            _uiState.update { it.copy(isLoading = true) }
        }
        try {
            val response = client.getChatMessages(channelId)
            val canModerate = response.can_moderate == true || appSession.isAdmin || initialCanModerate
            _uiState.update {
                it.copy(
                    messages = response.messages,
                    canModerate = canModerate,
                    isLoading = false,
                    errorMessage = null,
                    currentUserId = appSession.clerkUserId.orEmpty(),
                )
            }
        } catch (error: ApiException.Unauthorized) {
            _uiState.update {
                it.copy(isLoading = false, errorMessage = "Sign in required.")
            }
        } catch (error: Exception) {
            _uiState.update {
                it.copy(
                    isLoading = false,
                    errorMessage = if (it.messages.isEmpty()) {
                        error.message ?: "Could not load messages"
                    } else {
                        it.errorMessage
                    },
                )
            }
        }
    }

    private suspend fun connectRealtime() {
        val client = appSession.authenticatedApiClient ?: run {
            _uiState.update { it.copy(realtimeStatus = ChatRealtimeStatus.Unavailable) }
            startHttpPollFallback()
            return
        }
        _uiState.update { it.copy(realtimeStatus = ChatRealtimeStatus.Connecting) }
        try {
            val tokenResponse = withContext(Dispatchers.IO) { client.getAblyToken() }
            ably.connect(tokenResponse.tokenRequest)
            ably.subscribe(channelId) { event ->
                viewModelScope.launch { handleRealtimeEvent(event) }
            }
            _uiState.update { it.copy(realtimeStatus = ChatRealtimeStatus.Connected) }
            pollJob?.cancel()
        } catch (_: Exception) {
            _uiState.update { it.copy(realtimeStatus = ChatRealtimeStatus.Unavailable) }
            startHttpPollFallback()
        }
    }

    private fun startHttpPollFallback() {
        pollJob?.cancel()
        pollJob = viewModelScope.launch {
            while (isActive) {
                delay(4_000)
                reloadMessages(showLoading = false)
            }
        }
    }

    private fun handleRealtimeEvent(event: ChatRealtimeEvent) {
        when (event) {
            is ChatRealtimeEvent.MessageReceived -> upsertMessage(event.message)
            is ChatRealtimeEvent.Deleted -> {
                _uiState.update { state ->
                    state.copy(messages = state.messages.filterNot { it.id == event.id })
                }
            }
            is ChatRealtimeEvent.Reaction -> applyReactionUpdate(event.update)
            is ChatRealtimeEvent.PollUpdated -> {
                _uiState.update { state ->
                    state.copy(
                        messages = state.messages.map { message ->
                            if (message.id != event.messageId) message
                            else message.copy(poll_counts = event.counts)
                        },
                    )
                }
            }
        }
    }

    private fun upsertMessage(message: ChatMessage) {
        _uiState.update { state ->
            val index = state.messages.indexOfFirst { it.id == message.id }
            val messages = if (index >= 0) {
                state.messages.toMutableList().also { it[index] = message }
            } else {
                state.messages + message
            }
            state.copy(messages = messages)
        }
    }

    private fun applyReactionUpdate(update: ChatReactionUpdate) {
        val me = _uiState.value.currentUserId
        _uiState.update { state ->
            state.copy(
                messages = state.messages.map { message ->
                    if (message.id != update.message_id) return@map message
                    val merged = if (update.actor_clerk_id == me) {
                        update.reactions
                    } else {
                        update.reactions.map { incoming ->
                            val prev = message.reactionList.firstOrNull { it.emoji == incoming.emoji }
                            incoming.copy(reacted_by_me = prev?.reacted_by_me ?: false)
                        }
                    }
                    message.copy(reactions = merged)
                },
            )
        }
    }

    companion object {
        const val MAX_PHOTOS = 6
    }
}
