package com.rendezvousil.app.songs

import android.content.Context
import com.rendezvousil.core.network.ApiClient
import com.rendezvousil.core.network.dto.SongPackDetail
import com.rendezvousil.core.network.dto.SongPackItem
import java.io.File

class SongPackStore(context: Context) {
    private val root = File(context.filesDir, "song-packs").also { it.mkdirs() }

    private fun packDir(packId: String): File =
        File(root, packId).also { it.mkdirs() }

    fun localFile(packId: String, item: SongPackItem): File {
        val remoteExt = item.file_url.substringAfterLast('.', "").substringBefore('?').lowercase()
        val ext = when {
            item.file_type == "pdf" -> "pdf"
            remoteExt in listOf("png", "webp", "jpg", "jpeg") ->
                if (remoteExt == "jpeg") "jpg" else remoteExt
            else -> "jpg"
        }
        return File(packDir(packId), "${item.content_hash}.$ext")
    }

    fun isDownloaded(packId: String, item: SongPackItem): Boolean =
        localFile(packId, item).isFile

    fun downloadedCount(pack: SongPackDetail): Int =
        pack.items.count { isDownloaded(pack.id, it) }

    fun isFullyDownloaded(pack: SongPackDetail): Boolean =
        pack.items.isNotEmpty() && downloadedCount(pack) == pack.items.size

    suspend fun downloadPack(api: ApiClient, pack: SongPackDetail): Int {
        var count = 0
        for (item in pack.items) {
            val dest = localFile(pack.id, item)
            if (dest.isFile) {
                count++
                continue
            }
            try {
                api.downloadToFile(item.file_url, dest)
                if (dest.isFile) count++
            } catch (_: Exception) {
                // Leave partial; UI can retry.
            }
        }
        return count
    }
}
