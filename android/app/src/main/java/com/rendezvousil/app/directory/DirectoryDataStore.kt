package com.rendezvousil.app.directory

import android.content.Context
import com.rendezvousil.core.network.dto.DirectoryFamily
import kotlinx.serialization.builtins.ListSerializer
import kotlinx.serialization.builtins.serializer
import kotlinx.serialization.json.Json
import java.io.File

/** On-disk directory cache so the list appears instantly, then refreshes in the background. */
class DirectoryDataStore(context: Context) {
    private val dir = File(context.applicationContext.filesDir, "directory-cache").also { it.mkdirs() }
    private val json = Json {
        ignoreUnknownKeys = true
        encodeDefaults = true
    }

    fun loadYears(): List<Int>? = readList(yearsFile(), Int.serializer())

    fun saveYears(years: List<Int>) {
        writeList(yearsFile(), years, Int.serializer())
    }

    fun loadFamilies(year: Int): List<DirectoryFamily>? =
        readList(familiesFile(year), DirectoryFamily.serializer())

    fun saveFamilies(year: Int, families: List<DirectoryFamily>) {
        writeList(familiesFile(year), families, DirectoryFamily.serializer())
    }

    private fun yearsFile() = File(dir, "directory-years.json")

    private fun familiesFile(year: Int) = File(dir, "directory-$year.json")

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
