package com.rendezvousil.app.chat

import android.content.Context
import com.rendezvousil.core.network.dto.ChatChannelSummary
import com.rendezvousil.core.network.dto.ChatMessage
import kotlinx.serialization.builtins.ListSerializer
import kotlinx.serialization.json.Json
import java.io.File

/** On-disk chat cache so lists/threads appear instantly, then refresh in the background. */
class ChatDataStore(context: Context) {
    private val dir = File(context.applicationContext.filesDir, "chat-cache").also { it.mkdirs() }
    private val json = Json {
        ignoreUnknownKeys = true
        encodeDefaults = true
    }

    fun loadChannels(): List<ChatChannelSummary>? = readList(channelsFile(), ChatChannelSummary.serializer())

    fun saveChannels(channels: List<ChatChannelSummary>) {
        writeList(channelsFile(), channels, ChatChannelSummary.serializer())
    }

    fun loadMessages(channelId: String): List<ChatMessage>? =
        readList(messagesFile(channelId), ChatMessage.serializer())

    fun saveMessages(channelId: String, messages: List<ChatMessage>) {
        writeList(messagesFile(channelId), messages, ChatMessage.serializer())
    }

    private fun channelsFile() = File(dir, "channels.json")

    private fun messagesFile(channelId: String): File {
        val safe = channelId.replace('/', '_')
        return File(dir, "messages-$safe.json")
    }

    private fun <T> readList(
        file: File,
        serializer: kotlinx.serialization.KSerializer<T>,
    ): List<T>? {
        if (!file.exists()) return null
        return runCatching {
            json.decodeFromString(ListSerializer(serializer), file.readText())
        }.getOrNull()
    }

    private fun <T> writeList(
        file: File,
        items: List<T>,
        serializer: kotlinx.serialization.KSerializer<T>,
    ) {
        runCatching {
            file.writeText(json.encodeToString(ListSerializer(serializer), items))
        }
    }
}
