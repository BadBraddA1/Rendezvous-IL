package com.rendezvousil.app.songs

import android.content.Context
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import java.io.File
import java.net.HttpURLConnection
import java.net.URL

@Serializable
data class SongOcrPage(
    val index: Int = 0,
    val text: String? = null,
)

@Serializable
data class SongOcrDocument(
    val item_id: String? = null,
    val title: String? = null,
    val verse_count: Int? = null,
    val page_count: Int? = null,
    val pages: List<SongOcrPage> = emptyList(),
    val verse_pages: List<Int>? = null,
)

class SongOcrStore(context: Context) {
    private val root = File(context.filesDir, "song-ocr").also { it.mkdirs() }
    private val json = Json { ignoreUnknownKeys = true }
    private val memory = mutableMapOf<String, SongOcrDocument>()

    private fun cacheFile(itemId: String) = File(root, "$itemId.json")

    fun cached(itemId: String): SongOcrDocument? {
        memory[itemId]?.let { return it }
        val file = cacheFile(itemId)
        if (!file.isFile) return null
        return runCatching {
            json.decodeFromString<SongOcrDocument>(file.readText()).also { memory[itemId] = it }
        }.getOrNull()
    }

    suspend fun load(itemId: String, ocrUrl: String?): SongOcrDocument? = withContext(Dispatchers.IO) {
        if (ocrUrl.isNullOrBlank()) return@withContext null
        cached(itemId)?.let { return@withContext it }
        val conn = (URL(ocrUrl).openConnection() as HttpURLConnection).apply {
            connectTimeout = 20_000
            readTimeout = 30_000
            requestMethod = "GET"
        }
        try {
            if (conn.responseCode !in 200..299) return@withContext null
            val body = conn.inputStream.bufferedReader().use { it.readText() }
            val doc = json.decodeFromString<SongOcrDocument>(body)
            cacheFile(itemId).writeText(body)
            memory[itemId] = doc
            doc
        } catch (_: Exception) {
            null
        } finally {
            conn.disconnect()
        }
    }

    fun displayPages(doc: SongOcrDocument): List<Pair<Int, String>> =
        doc.pages.mapNotNull { page ->
            val cleaned = cleanPageText(page.text.orEmpty(), isTitle = page.index == 0)
            if (cleaned.isEmpty()) return@mapNotNull null
            if (page.index == 0 && isMostlyTitleCard(cleaned)) return@mapNotNull null
            page.index to cleaned
        }

    private fun cleanPageText(raw: String, isTitle: Boolean): String {
        var lines = raw.replace("\u000c", "\n").lines().map { it.trim() }
        if (!isTitle) {
            lines = lines.filter { line ->
                line.isNotEmpty() && line.count { it.isLetter() } >= 3
            }
        }
        val out = mutableListOf<String>()
        var blank = false
        for (line in lines) {
            if (line.isEmpty()) {
                if (!blank) out += ""
                blank = true
            } else {
                out += line
                blank = false
            }
        }
        return out.joinToString("\n").trim()
    }

    private fun isMostlyTitleCard(text: String): Boolean {
        val lower = text.lowercase()
        if ("verse" in lower && text.length < 80) return true
        val lines = text.lines().filter { it.isNotBlank() }
        return lines.size <= 4 && text.length < 120
    }
}
