package com.rendezvousil.app.ui.songs

import android.app.Application
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.rendezvousil.app.auth.AppSession
import com.rendezvousil.app.songs.SongPackStore
import com.rendezvousil.core.network.ApiException
import com.rendezvousil.core.network.dto.SongPackDetail
import com.rendezvousil.core.network.dto.SongPackSummary
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class SongPacksUiState(
    val isSignedIn: Boolean = false,
    val packs: List<SongPackSummary> = emptyList(),
    val isLoading: Boolean = false,
    val errorMessage: String? = null,
    val downloadingPackIds: Set<String> = emptySet(),
)

data class SongPackDetailUiState(
    val pack: SongPackDetail? = null,
    val isLoading: Boolean = false,
    val isDownloading: Boolean = false,
    val downloadedCount: Int = 0,
    val statusMessage: String? = null,
    val errorMessage: String? = null,
)

class SongPacksViewModel(
    private val appSession: AppSession,
    application: Application,
) : ViewModel() {
    private val store = SongPackStore(application)

    private val _listState = MutableStateFlow(SongPacksUiState())
    val listState: StateFlow<SongPacksUiState> = _listState.asStateFlow()

    private val _detailState = MutableStateFlow(SongPackDetailUiState())
    val detailState: StateFlow<SongPackDetailUiState> = _detailState.asStateFlow()

    init {
        viewModelScope.launch {
            appSession.isSignedInFlow.collect { signedIn ->
                _listState.update { it.copy(isSignedIn = signedIn) }
                if (signedIn) refreshPacks()
            }
        }
        viewModelScope.launch { appSession.refreshAuth() }
    }

    fun refreshPacks() {
        viewModelScope.launch {
            _listState.update { it.copy(isLoading = true, errorMessage = null) }
            val client = appSession.authenticatedApiClient
            if (client == null) {
                _listState.update {
                    it.copy(
                        isLoading = false,
                        isSignedIn = false,
                        errorMessage = "Sign in with your family account to download song packs.",
                    )
                }
                return@launch
            }
            try {
                val response = client.getSongPacks()
                val packs = response.packs
                _listState.update {
                    it.copy(isLoading = false, packs = packs, errorMessage = null)
                }
                packs.forEach { pack ->
                    viewModelScope.launch { downloadPackInBackground(pack.id) }
                }
            } catch (e: ApiException.Unauthorized) {
                _listState.update {
                    it.copy(
                        isLoading = false,
                        errorMessage = "Sign in with your family account to download song packs.",
                    )
                }
            } catch (e: ApiException.BadStatus) {
                _listState.update {
                    it.copy(
                        isLoading = false,
                        errorMessage = if (e.code == 403) {
                            "Registration for this year is required to download song packs."
                        } else {
                            "Couldn’t load song packs (HTTP ${e.code})."
                        },
                    )
                }
            } catch (e: Exception) {
                _listState.update {
                    it.copy(isLoading = false, errorMessage = e.message ?: "Couldn’t load song packs.")
                }
            }
        }
    }

    fun loadPack(packId: String) {
        viewModelScope.launch {
            _detailState.update {
                it.copy(isLoading = true, errorMessage = null, statusMessage = null)
            }
            val client = appSession.authenticatedApiClient
            if (client == null) {
                _detailState.update {
                    it.copy(isLoading = false, errorMessage = "Sign in required.")
                }
                return@launch
            }
            try {
                val response = client.getSongPack(packId)
                val pack = response.pack
                if (pack == null) {
                    _detailState.update {
                        it.copy(isLoading = false, errorMessage = "Pack not found.")
                    }
                    return@launch
                }
                _detailState.update {
                    it.copy(
                        isLoading = false,
                        pack = pack,
                        downloadedCount = store.downloadedCount(pack),
                    )
                }
                if (!store.isFullyDownloaded(pack)) {
                    downloadCurrentPack()
                }
            } catch (e: Exception) {
                _detailState.update {
                    it.copy(isLoading = false, errorMessage = e.message ?: "Couldn’t load pack.")
                }
            }
        }
    }

    fun downloadCurrentPack() {
        val pack = _detailState.value.pack ?: return
        viewModelScope.launch {
            val client = appSession.authenticatedApiClient ?: return@launch
            _detailState.update { it.copy(isDownloading = true, statusMessage = null) }
            val count = store.downloadPack(client, pack)
            _detailState.update {
                it.copy(
                    isDownloading = false,
                    downloadedCount = count,
                    statusMessage = "Saved $count of ${pack.items.size} files on this phone.",
                    pack = pack,
                )
            }
        }
    }

    fun isItemDownloaded(packId: String, itemId: String): Boolean {
        val pack = _detailState.value.pack ?: return false
        val item = pack.items.find { it.id == itemId } ?: return false
        return store.isDownloaded(packId, item)
    }

    fun localFile(packId: String, itemId: String): java.io.File? {
        val pack = _detailState.value.pack ?: return null
        val item = pack.items.find { it.id == itemId } ?: return null
        val file = store.localFile(packId, item)
        return file.takeIf { it.isFile }
    }

    fun store(): SongPackStore = store

    private suspend fun downloadPackInBackground(packId: String) {
        val client = appSession.authenticatedApiClient ?: return
        if (packId in _listState.value.downloadingPackIds) return
        _listState.update { it.copy(downloadingPackIds = it.downloadingPackIds + packId) }
        try {
            val detail = client.getSongPack(packId).pack ?: return
            store.downloadPack(client, detail)
        } catch (_: Exception) {
        } finally {
            _listState.update { it.copy(downloadingPackIds = it.downloadingPackIds - packId) }
        }
    }
}
