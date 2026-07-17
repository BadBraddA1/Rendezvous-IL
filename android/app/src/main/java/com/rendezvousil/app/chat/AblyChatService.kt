package com.rendezvousil.app.chat

import com.rendezvousil.core.network.dto.AblyTokenRequestPayload
import com.rendezvousil.core.network.dto.ChatMessage
import com.rendezvousil.core.network.dto.ChatReactionUpdate
import io.ably.lib.realtime.AblyRealtime
import io.ably.lib.realtime.Channel
import io.ably.lib.rest.Auth
import io.ably.lib.types.ClientOptions
import io.ably.lib.types.Message
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.intOrNull
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.put

sealed class ChatRealtimeEvent {
    data class MessageReceived(val message: ChatMessage) : ChatRealtimeEvent()
    data class Deleted(val id: String) : ChatRealtimeEvent()
    data class Reaction(val update: ChatReactionUpdate) : ChatRealtimeEvent()
    data class PollUpdated(
        val messageId: String,
        val counts: List<Int>,
        val voterClerkId: String?,
    ) : ChatRealtimeEvent()
}

/**
 * Ably Pub/Sub for year chat — channel `rendezvous:channel:{id}`, events matching iOS/web.
 */
class AblyChatService {
    private val json = Json {
        ignoreUnknownKeys = true
        isLenient = true
    }

    private var client: AblyRealtime? = null
    private var activeChannel: Channel? = null

    suspend fun connect(tokenRequest: AblyTokenRequestPayload) = withContext(Dispatchers.IO) {
        disconnect()
        val tokenJson = json.encodeToString(tokenRequest)
        val options = ClientOptions().apply {
            authCallback = Auth.TokenCallback {
                Auth.TokenRequest.fromJson(tokenJson)
            }
            autoConnect = true
        }
        client = AblyRealtime(options)
    }

    fun subscribe(channelId: String, onEvent: (ChatRealtimeEvent) -> Unit) {
        val realtime = client ?: return
        val channelName = "rendezvous:channel:$channelId"
        activeChannel?.unsubscribe()
        activeChannel = null

        val channel = realtime.channels.get(channelName)
        activeChannel = channel

        channel.subscribe("message") { message ->
            decodeMessage(message)?.let { onEvent(ChatRealtimeEvent.MessageReceived(it)) }
        }
        channel.subscribe("message_deleted") { message ->
            val id = messageDataObject(message)?.get("id")?.jsonPrimitive?.contentOrNull
            if (!id.isNullOrBlank()) onEvent(ChatRealtimeEvent.Deleted(id))
        }
        channel.subscribe("reaction") { message ->
            decodeReaction(message)?.let { onEvent(ChatRealtimeEvent.Reaction(it)) }
        }
        channel.subscribe("poll_updated") { message ->
            val data = messageDataObject(message) ?: return@subscribe
            val messageId = data["message_id"]?.jsonPrimitive?.contentOrNull ?: return@subscribe
            val counts = data["poll_counts"]?.jsonArray
                ?.mapNotNull { it.jsonPrimitive.intOrNull }
                ?: emptyList()
            val voter = data["voter_clerk_id"]?.jsonPrimitive?.contentOrNull
            onEvent(ChatRealtimeEvent.PollUpdated(messageId, counts, voter))
        }
    }

    fun disconnect() {
        runCatching { activeChannel?.unsubscribe() }
        activeChannel = null
        runCatching { client?.close() }
        client = null
    }

    private fun decodeMessage(message: Message): ChatMessage? {
        val raw = messageDataJson(message) ?: return null
        return runCatching { json.decodeFromString<ChatMessage>(raw) }.getOrNull()
    }

    private fun decodeReaction(message: Message): ChatReactionUpdate? {
        val raw = messageDataJson(message) ?: return null
        return runCatching { json.decodeFromString<ChatReactionUpdate>(raw) }.getOrNull()
    }

    private fun messageDataObject(message: Message): JsonObject? {
        val raw = messageDataJson(message) ?: return null
        return runCatching { json.parseToJsonElement(raw).jsonObject }.getOrNull()
    }

    private fun messageDataJson(message: Message): String? = when (val data = message.data) {
        null -> null
        is String -> data
        is Map<*, *> -> json.encodeToString(JsonObject.serializer(), data.toJsonObject())
        else -> data.toString().takeIf { it.startsWith("{") || it.startsWith("[") }
    }

    private fun Map<*, *>.toJsonObject(): JsonObject = buildJsonObject {
        forEach { (key, value) ->
            val k = key?.toString() ?: return@forEach
            put(k, value.toJsonElement())
        }
    }

    private fun Any?.toJsonElement(): JsonElement = when (this) {
        null -> JsonNull
        is Number -> JsonPrimitive(this)
        is Boolean -> JsonPrimitive(this)
        is String -> JsonPrimitive(this)
        is List<*> -> JsonArray(map { it.toJsonElement() })
        is Map<*, *> -> this.toJsonObject()
        else -> JsonPrimitive(toString())
    }
}
