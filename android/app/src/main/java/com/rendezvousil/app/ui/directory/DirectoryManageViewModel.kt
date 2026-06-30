package com.rendezvousil.app.ui.directory

import android.content.ContentResolver
import android.net.Uri
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.rendezvousil.app.auth.AppSession
import com.rendezvousil.core.network.dto.FamilyDirectorySettings
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

data class DirectoryManageUiState(
    val isSignedIn: Boolean = false,
    val settings: FamilyDirectorySettings = FamilyDirectorySettings(),
    val blurb: String = "",
    val optIn: Boolean = true,
    val isLoading: Boolean = false,
    val isSaving: Boolean = false,
    val errorMessage: String? = null,
    val successMessage: String? = null,
)

class DirectoryManageViewModel(
    private val appSession: AppSession,
    private val contentResolver: ContentResolver,
) : ViewModel() {
    private val _uiState = MutableStateFlow(DirectoryManageUiState())
    val uiState: StateFlow<DirectoryManageUiState> = _uiState.asStateFlow()

    init {
        viewModelScope.launch {
            appSession.isSignedInFlow.collect { signedIn ->
                _uiState.update { it.copy(isSignedIn = signedIn) }
                if (signedIn) {
                    loadSettings()
                }
            }
        }
        viewModelScope.launch {
            appSession.refreshAuth()
        }
    }

    fun onBlurbChange(value: String) {
        _uiState.update { it.copy(blurb = value) }
    }

    fun onOptInChange(value: Boolean) {
        _uiState.update { it.copy(optIn = value) }
    }

    fun uploadPhoto(uri: Uri) {
        viewModelScope.launch {
            val client = appSession.authenticatedApiClient ?: return@launch
            _uiState.update {
                it.copy(isLoading = true, errorMessage = null, successMessage = null)
            }
            try {
                val bytes = withContext(Dispatchers.IO) {
                    contentResolver.openInputStream(uri)?.use { stream -> stream.readBytes() }
                } ?: throw IllegalStateException("Could not read image")

                val mimeType = contentResolver.getType(uri) ?: "image/jpeg"
                val filename = when {
                    mimeType.contains("png") -> "family-photo.png"
                    mimeType.contains("webp") -> "family-photo.webp"
                    else -> "family-photo.jpg"
                }

                val response = client.uploadFamilyDirectoryPhoto(
                    bytes = bytes,
                    filename = filename,
                    mimeType = mimeType,
                )
                applySettings(response.settings)
                _uiState.update {
                    it.copy(isLoading = false, successMessage = "Photo uploaded")
                }
            } catch (error: Exception) {
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        errorMessage = error.message ?: "Upload failed",
                    )
                }
            }
        }
    }

    fun removePhoto() {
        viewModelScope.launch {
            val client = appSession.authenticatedApiClient ?: return@launch
            _uiState.update {
                it.copy(isLoading = true, errorMessage = null, successMessage = null)
            }
            try {
                val response = client.deleteFamilyDirectoryPhoto()
                applySettings(response.settings)
                _uiState.update {
                    it.copy(isLoading = false, successMessage = "Photo removed")
                }
            } catch (error: Exception) {
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        errorMessage = error.message ?: "Could not remove photo",
                    )
                }
            }
        }
    }

    fun saveSettings() {
        viewModelScope.launch {
            val client = appSession.authenticatedApiClient ?: return@launch
            _uiState.update {
                it.copy(isSaving = true, errorMessage = null, successMessage = null)
            }
            try {
                val trimmedBlurb = _uiState.value.blurb.trim()
                val response = client.updateFamilyDirectorySettings(
                    directoryOptIn = _uiState.value.optIn,
                    directoryBlurb = trimmedBlurb.ifEmpty { null },
                )
                applySettings(response.settings)
                _uiState.update {
                    it.copy(isSaving = false, successMessage = "Directory settings saved")
                }
            } catch (error: Exception) {
                _uiState.update {
                    it.copy(
                        isSaving = false,
                        errorMessage = error.message ?: "Could not save settings",
                    )
                }
            }
        }
    }

    private suspend fun loadSettings() {
        val client = appSession.authenticatedApiClient ?: return
        _uiState.update { it.copy(isLoading = true) }
        try {
            val settings = client.getFamilyDirectorySettings()
            applySettings(settings)
            _uiState.update { it.copy(isLoading = false) }
        } catch (error: Exception) {
            _uiState.update {
                it.copy(
                    isLoading = false,
                    errorMessage = error.message ?: "Could not load settings",
                )
            }
        }
    }

    private fun applySettings(settings: FamilyDirectorySettings) {
        _uiState.update {
            it.copy(
                settings = settings,
                optIn = settings.directory_opt_in,
                blurb = settings.directory_blurb.orEmpty(),
            )
        }
    }
}
