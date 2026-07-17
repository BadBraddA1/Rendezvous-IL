package com.rendezvousil.core.network.dto

import kotlinx.serialization.Serializable

@Serializable
data class ChatChannelSummary(
    val id: String,
    val name: String,
    val channel_type: String = "year",
    val event_year: Int? = null,
    val description: String? = null,
    val is_active: Boolean = true,
    val is_test: Boolean = false,
    val last_message_preview: String? = null,
    val last_message_at: String? = null,
    val unread_count: Int? = null,
    val can_moderate: Boolean? = null,
) {
    val displayTitle: String
        get() = if (channel_type == "year" && event_year != null) {
            "Rendezvous $event_year"
        } else {
            name
        }

    val unreadCount: Int get() = unread_count?.coerceAtLeast(0) ?: 0

    val unreadBadgeText: String?
        get() = when {
            unreadCount <= 0 -> null
            unreadCount > 99 -> "99+"
            else -> unreadCount.toString()
        }
}

@Serializable
data class ChatChannelsResponse(
    val channels: List<ChatChannelSummary> = emptyList(),
)

@Serializable
data class ChatReactionSummary(
    val emoji: String,
    val count: Int = 0,
    val reacted_by_me: Boolean = false,
)

@Serializable
data class ChatMessage(
    val id: String,
    val channel_id: String,
    val sender_clerk_id: String,
    val sender_display_name: String,
    val sender_avatar_url: String? = null,
    val body: String = "",
    val image_url: String? = null,
    val image_urls: List<String>? = null,
    val kind: String? = "text",
    val is_announcement: Boolean = false,
    val poll_question: String? = null,
    val poll_options: List<String>? = null,
    val poll_counts: List<Int>? = null,
    val my_vote: Int? = null,
    val reactions: List<ChatReactionSummary>? = null,
    val created_at: String = "",
) {
    val isPoll: Boolean get() = kind == "poll"

    val photoUrls: List<String>
        get() = when {
            !image_urls.isNullOrEmpty() -> image_urls
            !image_url.isNullOrBlank() -> listOf(image_url)
            else -> emptyList()
        }

    val reactionList: List<ChatReactionSummary> get() = reactions.orEmpty()
}

@Serializable
data class ChatMessagesResponse(
    val messages: List<ChatMessage> = emptyList(),
    val nextCursor: String? = null,
    val hasMore: Boolean = false,
    val can_moderate: Boolean? = null,
)

@Serializable
data class ChatMessageResponse(
    val message: ChatMessage,
)

@Serializable
data class ChatSendMessageBody(
    val body: String,
    val is_announcement: Boolean = false,
    val image_urls: List<String>? = null,
)

@Serializable
data class ChatPhotoUploadResponse(
    val url: String,
)

@Serializable
data class ChatCreatePollBody(
    val kind: String = "poll",
    val body: String,
    val poll_question: String,
    val poll_options: List<String>,
)

@Serializable
data class ChatVoteBody(
    val option_index: Int,
)

@Serializable
data class ChatVoteResponse(
    val poll: ChatPollUpdate,
)

@Serializable
data class ChatPollUpdate(
    val message_id: String,
    val channel_id: String,
    val poll_counts: List<Int> = emptyList(),
    val my_vote: Int? = null,
)

@Serializable
data class ChatReactionBody(
    val emoji: String,
)

@Serializable
data class ChatReactionResponse(
    val reaction: ChatReactionUpdate,
)

@Serializable
data class ChatReactionUpdate(
    val message_id: String,
    val channel_id: String,
    val reactions: List<ChatReactionSummary> = emptyList(),
    val actor_clerk_id: String = "",
    val added: Boolean? = null,
)

@Serializable
data class ChatMessageDeletedPayload(
    val id: String,
    val channel_id: String? = null,
)

@Serializable
data class AblyTokenResponse(
    val tokenRequest: AblyTokenRequestPayload,
)

@Serializable
data class AblyTokenRequestPayload(
    val keyName: String? = null,
    val ttl: Long? = null,
    val capability: String? = null,
    val clientId: String? = null,
    val timestamp: Long? = null,
    val nonce: String? = null,
    val mac: String? = null,
)

object ChatReactionEmoji {
    val all = listOf("🦙", "👍", "❤️", "😂", "🙏")
}
