package com.rendezvousil.app.ui.home

import android.app.Application
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.rendezvousil.app.auth.AppSession
import com.rendezvousil.app.notifications.VolunteerReminderService
import com.rendezvousil.core.network.dto.FamilyVolunteeringResponse
import com.rendezvousil.core.network.dto.SongSearchHit
import com.rendezvousil.core.network.dto.WorshipSongPickPayload
import com.rendezvousil.core.network.dto.WorshipSongSetSaveBody
import com.rendezvousil.core.network.dto.WorshipSongVerseChoice
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

data class SongSetEditorState(
    val signupId: Int,
    val volunteerName: String,
    val eventYear: Int,
    val songs: List<WorshipSongPickPayload> = emptyList(),
    val note: String = "",
    val query: String = "",
    val hits: List<SongSearchHit> = emptyList(),
    val isLoading: Boolean = true,
    val isSearching: Boolean = false,
    val isSaving: Boolean = false,
    val statusMessage: String? = null,
)

class VolunteeringViewModel(
    private val appSession: AppSession,
    application: Application,
) : ViewModel() {
    private val volunteerReminders = VolunteerReminderService(application)
    private val _volunteering = MutableStateFlow<FamilyVolunteeringResponse?>(null)
    val volunteering: StateFlow<FamilyVolunteeringResponse?> = _volunteering.asStateFlow()

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _uploadingSignupId = MutableStateFlow<Int?>(null)
    val uploadingSignupId: StateFlow<Int?> = _uploadingSignupId.asStateFlow()

    private val _statusMessage = MutableStateFlow<String?>(null)
    val statusMessage: StateFlow<String?> = _statusMessage.asStateFlow()

    private val _songSetEditor = MutableStateFlow<SongSetEditorState?>(null)
    val songSetEditor: StateFlow<SongSetEditorState?> = _songSetEditor.asStateFlow()

    private var searchJob: Job? = null

    init {
        refresh()
    }

    fun refresh() {
        viewModelScope.launch {
            _isLoading.value = true
            val client = appSession.authenticatedApiClient
            val payload = withContext(Dispatchers.IO) {
                runCatching { client.getFamilyVolunteering() }.getOrNull()
            }
            _volunteering.value = payload
            volunteerReminders.sync(payload)
            _isLoading.value = false
        }
    }

    fun uploadLessonSlides(
        signupId: Int,
        bytes: ByteArray,
        filename: String,
        mimeType: String,
    ) {
        viewModelScope.launch {
            _uploadingSignupId.value = signupId
            _statusMessage.value = "Uploading…"
            val client = appSession.authenticatedApiClient
            val result = withContext(Dispatchers.IO) {
                runCatching {
                    client.uploadLessonSlides(signupId, bytes, filename, mimeType)
                }
            }
            _uploadingSignupId.value = null
            _statusMessage.value = result.fold(
                onSuccess = { "Slides uploaded." },
                onFailure = { it.message ?: "Upload failed" },
            )
            refresh()
        }
    }

    fun openSongSetEditor(signupId: Int, volunteerName: String, eventYear: Int) {
        _songSetEditor.value = SongSetEditorState(
            signupId = signupId,
            volunteerName = volunteerName,
            eventYear = eventYear,
        )
        viewModelScope.launch {
            val client = appSession.authenticatedApiClient
            val result = withContext(Dispatchers.IO) {
                runCatching { client.getWorshipSongSet(signupId, eventYear) }
            }
            val current = _songSetEditor.value ?: return@launch
            result.fold(
                onSuccess = { res ->
                    _songSetEditor.value = current.copy(
                        songs = res.submission?.songs.orEmpty(),
                        note = res.submission?.note.orEmpty(),
                        isLoading = false,
                    )
                },
                onFailure = {
                    _songSetEditor.value = current.copy(
                        isLoading = false,
                        statusMessage = it.message ?: "Could not load",
                    )
                },
            )
        }
    }

    fun closeSongSetEditor() {
        searchJob?.cancel()
        _songSetEditor.value = null
    }

    fun setSongSetQuery(query: String) {
        val current = _songSetEditor.value ?: return
        _songSetEditor.value = current.copy(query = query)
        searchJob?.cancel()
        val q = query.trim()
        if (q.isEmpty()) {
            _songSetEditor.value = current.copy(query = query, hits = emptyList(), isSearching = false)
            return
        }
        searchJob = viewModelScope.launch {
            delay(220)
            val editor = _songSetEditor.value ?: return@launch
            _songSetEditor.value = editor.copy(isSearching = true)
            val client = appSession.authenticatedApiClient
            val hits = withContext(Dispatchers.IO) {
                runCatching { client.searchSongs(q, editor.eventYear).results }.getOrDefault(emptyList())
            }
            val latest = _songSetEditor.value ?: return@launch
            if (latest.query.trim() == q) {
                _songSetEditor.value = latest.copy(hits = hits, isSearching = false)
            }
        }
    }

    fun addSongHit(hit: SongSearchHit) {
        val current = _songSetEditor.value ?: return
        if (current.songs.any { it.song_pack_item_id == hit.item_id }) {
            _songSetEditor.value = current.copy(statusMessage = "Already in your set.")
            return
        }
        val next = current.songs + WorshipSongPickPayload(
            song_pack_item_id = hit.item_id,
            pack_id = hit.pack_id,
            title = hit.title,
            verses = WorshipSongVerseChoice(mode = "all"),
        )
        _songSetEditor.value = current.copy(
            songs = next,
            query = "",
            hits = emptyList(),
            statusMessage = null,
        )
    }

    fun removeSongAt(index: Int) {
        val current = _songSetEditor.value ?: return
        if (index !in current.songs.indices) return
        _songSetEditor.value = current.copy(songs = current.songs.toMutableList().also { it.removeAt(index) })
    }

    fun setSongNote(note: String) {
        val current = _songSetEditor.value ?: return
        _songSetEditor.value = current.copy(note = note)
    }

    fun setAllVerses(index: Int) {
        updateVerses(index) { WorshipSongVerseChoice(mode = "all") }
    }

    fun toggleVerse(index: Int, verse: Int) {
        updateVerses(index) { current ->
            if (current.mode != "list") {
                WorshipSongVerseChoice(mode = "list", verses = listOf(verse))
            } else {
                val set = current.verses.orEmpty().toMutableSet()
                if (!set.add(verse)) set.remove(verse)
                val list = set.sorted()
                if (list.isEmpty()) WorshipSongVerseChoice(mode = "all")
                else WorshipSongVerseChoice(mode = "list", verses = list)
            }
        }
    }

    private fun updateVerses(index: Int, transform: (WorshipSongVerseChoice) -> WorshipSongVerseChoice) {
        val current = _songSetEditor.value ?: return
        if (index !in current.songs.indices) return
        val songs = current.songs.toMutableList()
        val song = songs[index]
        songs[index] = song.copy(verses = transform(song.verses))
        _songSetEditor.value = current.copy(songs = songs)
    }

    fun saveSongSet() {
        val current = _songSetEditor.value ?: return
        if (current.songs.isEmpty()) {
            _songSetEditor.value = current.copy(statusMessage = "Add at least one song.")
            return
        }
        viewModelScope.launch {
            _songSetEditor.value = current.copy(isSaving = true, statusMessage = null)
            val client = appSession.authenticatedApiClient
            val result = withContext(Dispatchers.IO) {
                runCatching {
                    client.putWorshipSongSet(
                        signupId = current.signupId,
                        body = WorshipSongSetSaveBody(
                            songs = current.songs,
                            note = current.note.trim().ifEmpty { null },
                        ),
                        year = current.eventYear,
                    )
                }
            }
            result.fold(
                onSuccess = {
                    _statusMessage.value = "Songs submitted."
                    closeSongSetEditor()
                    refresh()
                },
                onFailure = {
                    val latest = _songSetEditor.value ?: return@launch
                    _songSetEditor.value = latest.copy(
                        isSaving = false,
                        statusMessage = it.message ?: "Save failed",
                    )
                },
            )
        }
    }
}
