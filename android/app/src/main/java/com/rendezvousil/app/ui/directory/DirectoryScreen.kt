package com.rendezvousil.app.ui.directory

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.People
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.rendezvousil.app.theme.BrandColors
import com.rendezvousil.core.network.dto.DirectoryContactPhone
import com.rendezvousil.core.network.dto.DirectoryFamily

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DirectoryScreen(
    viewModel: DirectoryViewModel,
    onBack: (() -> Unit)? = null,
    onNavigateToAccount: () -> Unit,
    onNavigateToManage: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val uiState by viewModel.uiState.collectAsState()
    val filteredFamilies = viewModel.filteredFamilies

    Scaffold(
        modifier = modifier,
        topBar = {
            TopAppBar(
                title = { Text("Family Directory") },
                navigationIcon = {
                    if (onBack != null) {
                        IconButton(onClick = onBack) {
                            Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                        }
                    }
                },
            )
        },
        containerColor = BrandColors.GroupedBackground,
    ) { padding ->
        when {
            !uiState.isSignedIn -> {
                SignedOutDirectoryContent(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding)
                        .padding(16.dp),
                    onNavigateToAccount = onNavigateToAccount,
                )
            }
            uiState.enabledYears.isEmpty() -> {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding)
                        .padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    Text(
                        text = "Directory not available",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold,
                    )
                    Text(
                        text = "The family directory is not open for any event year yet.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
            else -> {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding)
                        .padding(horizontal = 16.dp),
                ) {
                    if (uiState.enabledYears.size > 1) {
                        YearPicker(
                            years = uiState.enabledYears,
                            selectedYear = uiState.selectedYear,
                            onYearSelected = viewModel::onYearSelected,
                            modifier = Modifier.padding(vertical = 12.dp),
                        )
                    }

                    OutlinedTextField(
                        value = uiState.searchQuery,
                        onValueChange = viewModel::onSearchQueryChange,
                        modifier = Modifier.fillMaxWidth(),
                        placeholder = { Text("Search families") },
                        leadingIcon = {
                            Icon(Icons.Default.Search, contentDescription = null)
                        },
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(
                            capitalization = KeyboardCapitalization.None,
                        ),
                        shape = RoundedCornerShape(12.dp),
                    )

                    when {
                        uiState.isLoading -> {
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 40.dp),
                                contentAlignment = Alignment.Center,
                            ) {
                                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                    CircularProgressIndicator()
                                    Text(
                                        text = "Loading directory...",
                                        modifier = Modifier.padding(top = 12.dp),
                                        style = MaterialTheme.typography.bodyMedium,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    )
                                }
                            }
                        }
                        uiState.errorMessage != null -> {
                            ErrorDirectoryCard(
                                message = uiState.errorMessage.orEmpty(),
                                alternateYear = uiState.enabledYears.firstOrNull {
                                    it != uiState.selectedYear
                                },
                                onTryAlternateYear = viewModel::tryAlternateYear,
                                onNavigateToManage = onNavigateToManage,
                                modifier = Modifier.padding(top = 16.dp),
                            )
                        }
                        filteredFamilies.isEmpty() -> {
                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 32.dp),
                                horizontalAlignment = Alignment.CenterHorizontally,
                                verticalArrangement = Arrangement.spacedBy(12.dp),
                            ) {
                                Icon(
                                    Icons.Default.People,
                                    contentDescription = null,
                                    tint = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                                Text(
                                    text = "No families listed for ${uiState.selectedYear} yet.",
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                                Button(onClick = onNavigateToManage) {
                                    Text("Add your family photo")
                                }
                            }
                        }
                        else -> {
                            Text(
                                text = "${filteredFamilies.size} families",
                                modifier = Modifier.padding(vertical = 12.dp),
                                style = MaterialTheme.typography.labelMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                            LazyVerticalGrid(
                                columns = GridCells.Adaptive(minSize = 160.dp),
                                contentPadding = PaddingValues(bottom = 16.dp),
                                horizontalArrangement = Arrangement.spacedBy(16.dp),
                                verticalArrangement = Arrangement.spacedBy(16.dp),
                                modifier = Modifier.fillMaxSize(),
                            ) {
                                items(filteredFamilies, key = { it.id }) { family ->
                                    DirectoryFamilyCard(family = family)
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun SignedOutDirectoryContent(
    onNavigateToAccount: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier,
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Text(
            text = "Sign in to browse the family directory",
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.SemiBold,
        )
        Text(
            text = "Registered Rendezvous families can share a photo and short note so other attendees can get to know them.",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        TextButton(onClick = onNavigateToAccount) {
            Text("Go to Account to sign in")
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun YearPicker(
    years: List<Int>,
    selectedYear: Int,
    onYearSelected: (Int) -> Unit,
    modifier: Modifier = Modifier,
) {
    FlowRow(
        modifier = modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        years.forEach { year ->
            FilterChip(
                selected = year == selectedYear,
                onClick = { onYearSelected(year) },
                label = { Text("Rendezvous $year") },
            )
        }
    }
}

@Composable
private fun ErrorDirectoryCard(
    message: String,
    alternateYear: Int?,
    onTryAlternateYear: () -> Unit,
    onNavigateToManage: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Surface(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        color = BrandColors.SecondaryGroupedBackground,
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Text(
                text = message,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            if (alternateYear != null) {
                OutlinedButton(onClick = onTryAlternateYear) {
                    Text("Try Rendezvous $alternateYear")
                }
            }
            Button(onClick = onNavigateToManage) {
                Text("Manage your family photo")
            }
        }
    }
}

@Composable
private fun DirectoryFamilyCard(
    family: DirectoryFamily,
    modifier: Modifier = Modifier,
) {
    val context = LocalContext.current

    Surface(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        color = BrandColors.SecondaryGroupedBackground,
    ) {
        Column(
            modifier = Modifier.padding(12.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(140.dp)
                    .clip(RoundedCornerShape(12.dp)),
            ) {
                if (!family.photo_url.isNullOrEmpty()) {
                    AsyncImage(
                        model = family.photo_url,
                        contentDescription = "${family.family_last_name} family photo",
                        modifier = Modifier.fillMaxSize(),
                        contentScale = ContentScale.Crop,
                    )
                } else {
                    DirectoryPhotoPlaceholder()
                }
            }

            Text(
                text = "${family.family_last_name} Family",
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.SemiBold,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
            )

            family.displayLocation?.let { location ->
                DirectoryInfoRow(
                    icon = { Icon(Icons.Default.LocationOn, contentDescription = null) },
                    text = location,
                )
            }

            family.email?.takeIf { it.isNotEmpty() }?.let { email ->
                TextButton(
                    onClick = {
                        context.startActivity(
                            Intent(Intent.ACTION_SENDTO, Uri.parse("mailto:$email")),
                        )
                    },
                    contentPadding = PaddingValues(0.dp),
                ) {
                    DirectoryInfoRow(
                        icon = { Icon(Icons.Default.Email, contentDescription = null) },
                        text = email,
                    )
                }
            }

            family.contact_phones.forEach { contact ->
                PhoneContactRow(contact = contact)
            }

            Text(
                text = "${family.member_count} attendee${if (family.member_count == 1) "" else "s"}",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )

            family.directory_blurb?.takeIf { it.isNotEmpty() }?.let { blurb ->
                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = BrandColors.GroupedBackground,
                ) {
                    Text(
                        text = blurb,
                        modifier = Modifier.padding(8.dp),
                        style = MaterialTheme.typography.labelSmall,
                    )
                }
            }
        }
    }
}

@Composable
private fun DirectoryPhotoPlaceholder(modifier: Modifier = Modifier) {
    Box(
        modifier = modifier
            .fillMaxSize()
            .clip(RoundedCornerShape(12.dp)),
        contentAlignment = Alignment.Center,
    ) {
        Surface(
            modifier = Modifier.fillMaxSize(),
            color = BrandColors.GroupedBackground,
        ) {
            Column(
                modifier = Modifier.fillMaxSize(),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center,
            ) {
                Icon(
                    Icons.Default.People,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Text(
                    text = "No photo yet",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
    }
}

@Composable
private fun DirectoryInfoRow(
    icon: @Composable () -> Unit,
    text: String,
    modifier: Modifier = Modifier,
) {
    androidx.compose.foundation.layout.Row(
        modifier = modifier,
        horizontalArrangement = Arrangement.spacedBy(6.dp),
        verticalAlignment = Alignment.Top,
    ) {
        icon()
        Text(
            text = text,
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            maxLines = 3,
            overflow = TextOverflow.Ellipsis,
        )
    }
}

@Composable
private fun PhoneContactRow(contact: DirectoryContactPhone) {
    val context = LocalContext.current
    val dialNumber = contact.phone.filter { it.isDigit() || it == '+' }
    val label = if (contact.name.isEmpty()) contact.phone else "${contact.name}: ${contact.phone}"

    TextButton(
        onClick = {
            context.startActivity(Intent(Intent.ACTION_DIAL, Uri.parse("tel:$dialNumber")))
        },
        contentPadding = PaddingValues(0.dp),
    ) {
        DirectoryInfoRow(
            icon = { Icon(Icons.Default.Phone, contentDescription = null) },
            text = label,
        )
    }
}
