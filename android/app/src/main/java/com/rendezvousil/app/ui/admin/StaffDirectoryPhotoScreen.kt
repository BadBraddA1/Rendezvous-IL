package com.rendezvousil.app.ui.admin

import android.graphics.Bitmap
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material.icons.filled.PhotoLibrary
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.compose.viewModel
import com.rendezvousil.app.auth.AppSession
import com.rendezvousil.app.di.RendezvousViewModelFactory
import com.rendezvousil.app.theme.BrandColors
import com.rendezvousil.app.ui.checkin.PersistentQrScanner
import com.rendezvousil.core.network.dto.CheckInLookupResponse
import java.io.ByteArrayOutputStream
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

data class StaffDirectoryPhotoUiState(
    val lookup: CheckInLookupResponse? = null,
    val isLoading: Boolean = false,
    val uploadingPhoto: Boolean = false,
    val nudgingFamily: Boolean = false,
    val errorMessage: String? = null,
    val successMessage: String? = null,
)

class StaffDirectoryPhotoViewModel(
    private val appSession: AppSession,
) : ViewModel() {
    private val _uiState = MutableStateFlow(StaffDirectoryPhotoUiState())
    val uiState: StateFlow<StaffDirectoryPhotoUiState> = _uiState.asStateFlow()

    init {
        viewModelScope.launch { appSession.refreshAuth() }
    }

    fun resetStation() {
        _uiState.value = StaffDirectoryPhotoUiState()
    }

    fun onScannedCode(code: String) {
        val trimmed = code.trim()
        if (trimmed.isEmpty()) return
        val client = appSession.authenticatedApiClient ?: return
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, errorMessage = null, successMessage = null) }
            try {
                val response = client.lookupCheckIn(trimmed)
                _uiState.update {
                    it.copy(isLoading = false, lookup = response)
                }
            } catch (error: Exception) {
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        lookup = null,
                        errorMessage = error.message ?: "Lookup failed",
                    )
                }
            }
        }
    }

    fun uploadDirectoryPhoto(bytes: ByteArray) {
        val client = appSession.authenticatedApiClient ?: return
        val familyId = _uiState.value.lookup?.directory_family_id ?: run {
            _uiState.update {
                it.copy(errorMessage = "No family directory profile linked for this registration.")
            }
            return
        }
        viewModelScope.launch {
            _uiState.update {
                it.copy(uploadingPhoto = true, errorMessage = null, successMessage = null)
            }
            try {
                val response = client.uploadAdminDirectoryFamilyPhoto(
                    familyId = familyId,
                    bytes = bytes,
                    filename = "family-photo.jpg",
                    mimeType = "image/jpeg",
                )
                val pinged = response.notify_recipients ?: 0
                _uiState.update { state ->
                    val lookup = state.lookup
                    state.copy(
                        uploadingPhoto = false,
                        successMessage = if (pinged > 0) {
                            "Photo uploaded · pinged family ($pinged)"
                        } else {
                            "Photo uploaded · family has no app devices yet"
                        },
                        lookup = lookup?.copy(
                            directory_photo_url = response.photo_url ?: lookup.directory_photo_url,
                            directory_faces_labeled = 0,
                            directory_faces_total = 0,
                        ),
                    )
                }
            } catch (error: Exception) {
                _uiState.update {
                    it.copy(
                        uploadingPhoto = false,
                        errorMessage = error.message ?: "Photo upload failed",
                    )
                }
            }
        }
    }

    fun nudgeDirectoryProfile() {
        val client = appSession.authenticatedApiClient ?: return
        val familyId = _uiState.value.lookup?.directory_family_id ?: return
        viewModelScope.launch {
            _uiState.update {
                it.copy(nudgingFamily = true, errorMessage = null, successMessage = null)
            }
            try {
                val response = client.nudgeFamilyDirectoryProfile(familyId)
                _uiState.update {
                    it.copy(
                        nudgingFamily = false,
                        successMessage = response.message ?: "Family pinged",
                    )
                }
            } catch (error: Exception) {
                _uiState.update {
                    it.copy(
                        nudgingFamily = false,
                        errorMessage = error.message ?: "Nudge failed",
                    )
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StaffDirectoryPhotoScreen(
    appSession: AppSession,
    viewModelFactory: RendezvousViewModelFactory,
    onBack: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val viewModel: StaffDirectoryPhotoViewModel = viewModel(factory = viewModelFactory)
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val canCheckIn by appSession.canCheckInFlow.collectAsStateWithLifecycle()
    val adminName by appSession.adminNameFlow.collectAsStateWithLifecycle()
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    val galleryLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.GetContent(),
    ) { uri ->
        if (uri == null) return@rememberLauncherForActivityResult
        scope.launch {
            val bytes = withContext(Dispatchers.IO) {
                context.contentResolver.openInputStream(uri)?.use { it.readBytes() }
            } ?: return@launch
            viewModel.uploadDirectoryPhoto(bytes)
        }
    }

    val cameraLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.TakePicturePreview(),
    ) { bitmap: Bitmap? ->
        if (bitmap == null) return@rememberLauncherForActivityResult
        scope.launch {
            val bytes = withContext(Dispatchers.Default) {
                val stream = ByteArrayOutputStream()
                bitmap.compress(Bitmap.CompressFormat.JPEG, 90, stream)
                stream.toByteArray()
            }
            viewModel.uploadDirectoryPhoto(bytes)
        }
    }

    Scaffold(
        modifier = modifier,
        topBar = {
            TopAppBar(
                title = { Text("Directory photos") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
            )
        },
        containerColor = BrandColors.GroupedBackground,
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            if (!canCheckIn) {
                Text(
                    "Staff access required to upload directory photos at the desk.",
                    color = MaterialTheme.colorScheme.error,
                )
                return@Column
            }

            adminName?.let { name ->
                Text(
                    text = "Staff: $name",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }

            if (uiState.lookup == null) {
                PersistentQrScanner(
                    isPaused = false,
                    onCode = viewModel::onScannedCode,
                )
                Text(
                    text = "Point at a family QR — then take or choose their directory photo.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            } else {
                FamilyPhotoCard(
                    lookup = uiState.lookup!!,
                    isLoading = uiState.isLoading,
                    uploadingPhoto = uiState.uploadingPhoto,
                    nudgingFamily = uiState.nudgingFamily,
                    onTakePhoto = { cameraLauncher.launch(null) },
                    onPickPhoto = { galleryLauncher.launch("image/*") },
                    onNudge = viewModel::nudgeDirectoryProfile,
                    onScanNext = viewModel::resetStation,
                )
            }

            uiState.errorMessage?.let { message ->
                Text(message, color = MaterialTheme.colorScheme.error)
            }
            uiState.successMessage?.let { message ->
                Text(message, color = Color(0xFF2E7D32))
            }
            if (uiState.isLoading || uiState.uploadingPhoto) {
                Box(modifier = Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = BrandColors.Lake)
                }
            }
        }
    }
}

@Composable
private fun FamilyPhotoCard(
    lookup: CheckInLookupResponse,
    isLoading: Boolean,
    uploadingPhoto: Boolean,
    nudgingFamily: Boolean,
    onTakePhoto: () -> Unit,
    onPickPhoto: () -> Unit,
    onNudge: () -> Unit,
    onScanNext: () -> Unit,
) {
    val registration = lookup.registration
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        color = BrandColors.SecondaryGroupedBackground,
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            Text(
                text = "${registration.family_last_name} Family",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
            )
            lookup.family_members?.forEach { member ->
                Text(
                    text = "• ${member.first_name} ${member.last_name.orEmpty()}".trim(),
                    style = MaterialTheme.typography.bodyMedium,
                )
            }

            val familyId = lookup.directory_family_id
            if (familyId != null && familyId > 0) {
                val photoUrl = lookup.directory_photo_url
                if (!photoUrl.isNullOrBlank()) {
                    val labeled = lookup.directory_faces_labeled ?: 0
                    val total = lookup.directory_faces_total ?: 0
                    Text(
                        text = if (total > 0) {
                            "Photo on file · $labeled/$total faces named"
                        } else {
                            "Photo on file — ask family to name faces"
                        },
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    OutlinedButton(
                        onClick = onNudge,
                        enabled = !isLoading && !uploadingPhoto && !nudgingFamily,
                    ) {
                        Text(if (nudgingFamily) "Pinging…" else "Ping family to finish profile")
                    }
                } else {
                    Text(
                        text = "No directory photo yet — take one now.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    Button(
                        onClick = onTakePhoto,
                        enabled = !isLoading && !uploadingPhoto,
                        colors = ButtonDefaults.buttonColors(containerColor = BrandColors.Lake),
                    ) {
                        Icon(Icons.Default.CameraAlt, contentDescription = null, modifier = Modifier.size(18.dp))
                        Text(modifier = Modifier.padding(start = 6.dp), text = "Take photo")
                    }
                    OutlinedButton(
                        onClick = onPickPhoto,
                        enabled = !isLoading && !uploadingPhoto,
                    ) {
                        Icon(Icons.Default.PhotoLibrary, contentDescription = null, modifier = Modifier.size(18.dp))
                        Text(modifier = Modifier.padding(start = 6.dp), text = "Choose")
                    }
                }
            } else {
                Text(
                    text = "No family directory profile linked — photo upload unavailable.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }

            OutlinedButton(onClick = onScanNext, modifier = Modifier.fillMaxWidth()) {
                Text("Scan next family")
            }
        }
    }
}
