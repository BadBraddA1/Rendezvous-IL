package com.rendezvousil.app.ui.checkin

import android.app.Activity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.OpenInBrowser
import androidx.compose.material.icons.filled.QrCodeScanner
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.clerk.api.Clerk
import com.clerk.ui.auth.AuthView
import com.rendezvousil.app.BuildConfig
import com.rendezvousil.app.auth.AppSession
import com.rendezvousil.app.auth.WebLinks
import com.rendezvousil.app.di.RendezvousViewModelFactory
import com.rendezvousil.app.theme.BrandColors
import com.rendezvousil.core.network.dto.CheckInLookupResponse
import com.rendezvousil.core.network.dto.CheckInRegistrationSummary
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CheckInScreen(
    appSession: AppSession,
    viewModelFactory: RendezvousViewModelFactory,
    onBack: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val viewModel: CheckInViewModel = viewModel(factory = viewModelFactory)
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val isSignedIn by appSession.isSignedInFlow.collectAsStateWithLifecycle()
    val canCheckIn by appSession.canCheckInFlow.collectAsStateWithLifecycle()
    val adminName by appSession.adminNameFlow.collectAsStateWithLifecycle()
    val clerkInitialized by Clerk.isInitialized.collectAsStateWithLifecycle()
    val clerkSetupError by appSession.clerkSetupErrorFlow.collectAsStateWithLifecycle()
    val context = LocalContext.current

    val qrLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.StartActivityForResult(),
    ) { result ->
        if (result.resultCode == Activity.RESULT_OK) {
            val code = result.data?.getStringExtra(QrScanActivity.EXTRA_SCANNED_CODE)
            if (!code.isNullOrBlank()) {
                viewModel.onScannedCode(code)
            }
        }
    }

    LaunchedEffect(Unit) {
        appSession.refreshAuth()
    }

    Scaffold(
        modifier = modifier,
        topBar = {
            TopAppBar(
                title = { Text("Check-In") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
            )
        },
        containerColor = BrandColors.GroupedBackground,
    ) { padding ->
        when {
            !isSignedIn -> {
                StaffSignInContent(
                    clerkInitialized = clerkInitialized,
                    clerkSetupError = clerkSetupError,
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding)
                        .verticalScroll(rememberScrollState())
                        .padding(16.dp),
                )
            }
            !canCheckIn -> {
                CheckInAccessDeniedContent(
                    adminName = adminName,
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding)
                        .padding(16.dp),
                )
            }
            else -> {
                CheckInStationContent(
                    adminName = adminName,
                    uiState = uiState,
                    onCodeChange = viewModel::onCodeChange,
                    onSearchQueryChange = viewModel::onSearchQueryChange,
                    onRoomKeysChange = viewModel::onRoomKeysChange,
                    onTshirtsDistributedChange = viewModel::onTshirtsDistributedChange,
                    onLookup = viewModel::lookupByCode,
                    onSearch = viewModel::searchFamilies,
                    onSelectResult = viewModel::selectSearchResult,
                    onSubmit = viewModel::submitCheckIn,
                    onUndo = viewModel::undoCheckIn,
                    onScanQr = {
                        qrLauncher.launch(QrScanActivity.createIntent(context))
                    },
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding)
                        .verticalScroll(rememberScrollState())
                        .padding(16.dp),
                )
            }
        }
    }
}

@Composable
private fun StaffSignInContent(
    clerkInitialized: Boolean,
    clerkSetupError: String?,
    modifier: Modifier = Modifier,
) {
    val context = LocalContext.current

    Column(
        modifier = modifier,
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Text(
            text = "Staff sign-in",
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.SemiBold,
        )
        Text(
            text = "Sign in with the same Rendezvous admin account used on the website. You need check-in permissions (Check-In role or higher).",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )

        clerkSetupError?.let { message ->
            Text(
                text = message,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.error,
            )
        }

        when {
            !clerkInitialized -> {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(360.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center,
                ) {
                    CircularProgressIndicator(color = BrandColors.Lake)
                }
            }
            clerkSetupError != null -> Unit
            else -> {
                AuthView(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(360.dp),
                )
            }
        }

        TextButton(
            onClick = {
                WebLinks.open(context, WebLinks.url(BuildConfig.BASE_URL, "/admin/checkin"))
            },
        ) {
            Icon(Icons.Default.OpenInBrowser, contentDescription = null, tint = BrandColors.Lake)
            Text(
                text = "Open web check-in station",
                modifier = Modifier.padding(start = 8.dp),
                color = BrandColors.Lake,
            )
        }
    }
}

@Composable
private fun CheckInAccessDeniedContent(
    adminName: String?,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier,
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Icon(
            Icons.Default.Lock,
            contentDescription = null,
            modifier = Modifier.size(40.dp),
            tint = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Text(
            text = "Check-in access required",
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.SemiBold,
        )
        Text(
            text = "Your account is signed in but does not have check-in permissions. Ask an admin to assign the Check-In role in Admin → Users.",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        adminName?.let { name ->
            Text(
                text = "Signed in as $name",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

@Composable
private fun CheckInStationContent(
    adminName: String?,
    uiState: CheckInUiState,
    onCodeChange: (String) -> Unit,
    onSearchQueryChange: (String) -> Unit,
    onRoomKeysChange: (String) -> Unit,
    onTshirtsDistributedChange: (Boolean) -> Unit,
    onLookup: () -> Unit,
    onSearch: () -> Unit,
    onSelectResult: (CheckInRegistrationSummary) -> Unit,
    onSubmit: () -> Unit,
    onUndo: () -> Unit,
    onScanQr: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier,
        verticalArrangement = Arrangement.spacedBy(20.dp),
    ) {
        adminName?.let { name ->
            Text(
                text = "Signed in as $name",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }

        LookupSection(
            code = uiState.code,
            isLoading = uiState.isLoading,
            onCodeChange = onCodeChange,
            onLookup = onLookup,
            onScanQr = onScanQr,
        )

        SearchSection(
            searchQuery = uiState.searchQuery,
            searchResults = uiState.searchResults,
            isLoading = uiState.isLoading,
            onSearchQueryChange = onSearchQueryChange,
            onSearch = onSearch,
            onSelectResult = onSelectResult,
        )

        uiState.lookup?.let { lookup ->
            ResultSection(
                lookup = lookup,
                roomKeys = uiState.roomKeys,
                tshirtsDistributed = uiState.tshirtsDistributed,
                isLoading = uiState.isLoading,
                onRoomKeysChange = onRoomKeysChange,
                onTshirtsDistributedChange = onTshirtsDistributedChange,
                onSubmit = onSubmit,
                onUndo = onUndo,
            )
        }

        uiState.errorMessage?.let { message ->
            Text(
                text = message,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.error,
            )
        }

        uiState.successMessage?.let { message ->
            Text(
                text = message,
                style = MaterialTheme.typography.bodyMedium,
                color = Color(0xFF2E7D32),
            )
        }

        if (uiState.isLoading) {
            CircularProgressIndicator(
                modifier = Modifier.align(Alignment.CenterHorizontally),
                color = BrandColors.Lake,
            )
        }
    }
}

@Composable
private fun LookupSection(
    code: String,
    isLoading: Boolean,
    onCodeChange: (String) -> Unit,
    onLookup: () -> Unit,
    onScanQr: () -> Unit,
) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Text(
            text = "QR / check-in code",
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.SemiBold,
        )
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            OutlinedTextField(
                value = code,
                onValueChange = onCodeChange,
                modifier = Modifier.weight(1f),
                placeholder = { Text("Enter code") },
                singleLine = true,
                keyboardOptions = KeyboardOptions(
                    capitalization = KeyboardCapitalization.Characters,
                ),
            )
            IconButton(
                onClick = onScanQr,
                enabled = !isLoading,
            ) {
                Icon(
                    Icons.Default.QrCodeScanner,
                    contentDescription = "Scan QR code",
                    tint = BrandColors.Lake,
                )
            }
            Button(
                onClick = onLookup,
                enabled = code.trim().isNotEmpty() && !isLoading,
                colors = ButtonDefaults.buttonColors(
                    containerColor = BrandColors.Lake,
                    contentColor = Color.White,
                ),
            ) {
                Text("Look up")
            }
        }
    }
}

@Composable
private fun SearchSection(
    searchQuery: String,
    searchResults: List<CheckInRegistrationSummary>,
    isLoading: Boolean,
    onSearchQueryChange: (String) -> Unit,
    onSearch: () -> Unit,
    onSelectResult: (CheckInRegistrationSummary) -> Unit,
) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Text(
            text = "Search by family name or email",
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.SemiBold,
        )
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            OutlinedTextField(
                value = searchQuery,
                onValueChange = onSearchQueryChange,
                modifier = Modifier.weight(1f),
                placeholder = { Text("Smith") },
                singleLine = true,
            )
            OutlinedButton(
                onClick = onSearch,
                enabled = searchQuery.trim().isNotEmpty() && !isLoading,
            ) {
                Text("Search")
            }
        }

        if (searchResults.isNotEmpty()) {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                searchResults.forEach { result ->
                    SearchResultRow(
                        result = result,
                        onClick = { onSelectResult(result) },
                    )
                }
            }
        }
    }
}

@Composable
private fun SearchResultRow(
    result: CheckInRegistrationSummary,
    onClick: () -> Unit,
) {
    Surface(
        onClick = onClick,
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(10.dp),
        color = BrandColors.SecondaryGroupedBackground,
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column {
                Text(
                    text = "${result.family_last_name} Family",
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.SemiBold,
                )
                result.email?.let { email ->
                    Text(
                        text = email,
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
            if (result.checked_in == true) {
                Text(
                    text = "Checked in",
                    style = MaterialTheme.typography.labelSmall,
                    color = Color(0xFF2E7D32),
                )
            }
        }
    }
}

@Composable
private fun ResultSection(
    lookup: CheckInLookupResponse,
    roomKeys: String,
    tshirtsDistributed: Boolean,
    isLoading: Boolean,
    onRoomKeysChange: (String) -> Unit,
    onTshirtsDistributedChange: (Boolean) -> Unit,
    onSubmit: () -> Unit,
    onUndo: () -> Unit,
) {
    val registration = lookup.registration
    val lodgingLabel = registration.lodging_type
        ?.replace('_', ' ')
        ?.split(' ')
        ?.joinToString(" ") { word ->
            word.replaceFirstChar { char ->
                if (char.isLowerCase()) char.titlecase(Locale.US) else char.toString()
            }
        }

    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        color = BrandColors.SecondaryGroupedBackground,
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Text(
                    text = "${registration.family_last_name} Family",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold,
                )
                lodgingLabel?.let { lodging ->
                    Text(
                        text = lodging,
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                if (registration.checked_in == true) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            Icons.Default.CheckCircle,
                            contentDescription = null,
                            tint = Color(0xFF2E7D32),
                            modifier = Modifier.size(18.dp),
                        )
                        Text(
                            text = "Already checked in",
                            modifier = Modifier.padding(start = 6.dp),
                            style = MaterialTheme.typography.bodyMedium,
                            color = Color(0xFF2E7D32),
                        )
                    }
                }
            }

            lookup.family_members?.takeIf { it.isNotEmpty() }?.let { members ->
                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text(
                        text = "Family members",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold,
                    )
                    members.forEach { member ->
                        Text(
                            text = "• ${member.first_name} ${member.last_name.orEmpty()}".trim(),
                            style = MaterialTheme.typography.bodyMedium,
                        )
                    }
                }
            }

            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(
                    text = "Room keys",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold,
                )
                OutlinedTextField(
                    value = roomKeys,
                    onValueChange = onRoomKeysChange,
                    modifier = Modifier.fillMaxWidth(),
                    placeholder = { Text("101, 102") },
                    singleLine = true,
                )
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    text = "T-shirts distributed",
                    style = MaterialTheme.typography.bodyMedium,
                )
                Switch(
                    checked = tshirtsDistributed,
                    onCheckedChange = onTshirtsDistributedChange,
                )
            }

            Row(
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Button(
                    onClick = onSubmit,
                    enabled = !isLoading,
                    colors = ButtonDefaults.buttonColors(
                        containerColor = BrandColors.Lake,
                        contentColor = Color.White,
                    ),
                ) {
                    Text(
                        if (registration.checked_in == true) {
                            "Update check-in"
                        } else {
                            "Check in family"
                        },
                    )
                }
                if (registration.checked_in == true) {
                    OutlinedButton(
                        onClick = onUndo,
                        enabled = !isLoading,
                        colors = ButtonDefaults.outlinedButtonColors(
                            contentColor = MaterialTheme.colorScheme.error,
                        ),
                    ) {
                        Text("Undo")
                    }
                }
            }
        }
    }
}
