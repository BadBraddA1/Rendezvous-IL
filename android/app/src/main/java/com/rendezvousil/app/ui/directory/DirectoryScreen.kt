package com.rendezvousil.app.ui.directory

import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.Message
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.People
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material.icons.filled.Search
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
    onNavigateToManage: () -> Unit = {},
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
                        uiState.isLoading && uiState.families.isEmpty() -> {
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
                        uiState.errorMessage != null && uiState.families.isEmpty() -> {
                            ErrorDirectoryCard(
                                message = uiState.errorMessage.orEmpty(),
                                alternateYear = uiState.enabledYears.firstOrNull {
                                    it != uiState.selectedYear
                                },
                                onTryAlternateYear = viewModel::tryAlternateYear,
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
                                    text = if (uiState.searchQuery.isBlank()) {
                                        "No families listed for ${uiState.selectedYear} yet."
                                    } else {
                                        "No families match your search."
                                    },
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                        }
                        else -> {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 12.dp),
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Text(
                                    text = "${filteredFamilies.size} families",
                                    style = MaterialTheme.typography.labelMedium,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                                if (uiState.isRefreshing) {
                                    CircularProgressIndicator(
                                        modifier = Modifier.size(14.dp),
                                        strokeWidth = 2.dp,
                                    )
                                }
                            }
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
                val mapsQuery = family.formatted_address?.takeIf { it.isNotBlank() } ?: location
                TextButton(
                    onClick = { openMaps(context, mapsQuery) },
                    contentPadding = PaddingValues(0.dp),
                ) {
                    DirectoryInfoRow(
                        icon = { Icon(Icons.Default.LocationOn, contentDescription = null) },
                        text = location,
                    )
                }
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

            family.formatted_address
                ?.takeIf { it.isNotBlank() && it != family.displayLocation }
                ?.let { address ->
                    TextButton(
                        onClick = { openMaps(context, address) },
                        contentPadding = PaddingValues(0.dp),
                    ) {
                        DirectoryInfoRow(
                            icon = { Icon(Icons.Default.Home, contentDescription = null) },
                            text = address,
                        )
                    }
                }

            if (family.members.isNotEmpty()) {
                family.members.filter { it.role != "child" }.forEach { member ->
                    Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                        val roleLabel = if (member.role == "father") "Father" else "Mother"
                        DirectoryInfoRow(
                            icon = { Icon(Icons.Default.Person, contentDescription = null) },
                            text = "$roleLabel: ${member.name}",
                        )
                        phonesForMember(family, member.name).forEach { contact ->
                            PhoneContactRow(contact = contact, showName = false)
                        }
                    }
                }
                val kids = family.members.filter { it.role == "child" }
                if (kids.isNotEmpty()) {
                    val kidsLine = kids.joinToString(", ") { kid ->
                        kid.ageLabel?.let { "${kid.name} ($it)" } ?: kid.name
                    }
                    DirectoryInfoRow(
                        icon = { Icon(Icons.Default.People, contentDescription = null) },
                        text = "Kids: $kidsLine",
                    )
                    kids.forEach { kid ->
                        phonesForMember(family, kid.name).forEach { contact ->
                            PhoneContactRow(contact = contact, showName = true)
                        }
                    }
                }
                orphanPhones(family).forEach { contact ->
                    PhoneContactRow(contact = contact, showName = true)
                }
            } else if (family.member_names.isNotEmpty()) {
                family.member_names.forEach { name ->
                    Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                        DirectoryInfoRow(
                            icon = { Icon(Icons.Default.Person, contentDescription = null) },
                            text = name,
                        )
                        phonesForMember(family, name).forEach { contact ->
                            PhoneContactRow(contact = contact, showName = false)
                        }
                    }
                }
                orphanPhones(family).forEach { contact ->
                    PhoneContactRow(contact = contact, showName = true)
                }
            } else {
                family.contact_phones.forEach { contact ->
                    PhoneContactRow(contact = contact, showName = true)
                }
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
private fun PhoneContactRow(
    contact: DirectoryContactPhone,
    showName: Boolean,
) {
    val context = LocalContext.current
    val dialNumber = contact.phone.filter { it.isDigit() || it == '+' }

    Column(
        modifier = Modifier.padding(start = if (showName) 0.dp else 22.dp),
        verticalArrangement = Arrangement.spacedBy(2.dp),
    ) {
        if (showName && contact.name.isNotBlank()) {
            Text(
                text = contact.name,
                style = MaterialTheme.typography.labelMedium,
                fontWeight = FontWeight.Medium,
            )
        }
        Text(
            text = contact.phone,
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        if (dialNumber.isNotEmpty()) {
            Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                TextButton(
                    onClick = {
                        context.startActivity(Intent(Intent.ACTION_DIAL, Uri.parse("tel:$dialNumber")))
                    },
                    contentPadding = PaddingValues(horizontal = 4.dp, vertical = 0.dp),
                ) {
                    Icon(Icons.Default.Phone, contentDescription = null, modifier = Modifier.padding(end = 4.dp))
                    Text("Call")
                }
                TextButton(
                    onClick = {
                        context.startActivity(Intent(Intent.ACTION_SENDTO, Uri.parse("sms:$dialNumber")))
                    },
                    contentPadding = PaddingValues(horizontal = 4.dp, vertical = 0.dp),
                ) {
                    Icon(Icons.AutoMirrored.Filled.Message, contentDescription = null, modifier = Modifier.padding(end = 4.dp))
                    Text("Text")
                }
            }
        }
    }
}

private fun openMaps(context: Context, query: String) {
    val encoded = Uri.encode(query)
    val geo = Uri.parse("geo:0,0?q=$encoded")
    val intent = Intent(Intent.ACTION_VIEW, geo)
    if (intent.resolveActivity(context.packageManager) != null) {
        context.startActivity(intent)
    } else {
        context.startActivity(
            Intent(Intent.ACTION_VIEW, Uri.parse("https://maps.google.com/?q=$encoded")),
        )
    }
}

private fun contactMatchesMember(contact: DirectoryContactPhone, memberName: String): Boolean {
    val contactName = contact.name.trim()
    val member = memberName.trim()
    if (contactName.isEmpty() || member.isEmpty()) return false
    if (contactName.equals(member, ignoreCase = true)) return true
    val contactFirst = contactName.substringBefore(' ')
    return contactFirst.equals(member, ignoreCase = true) ||
        contactName.contains(member, ignoreCase = true)
}

private fun phonesForMember(
    family: DirectoryFamily,
    memberName: String,
): List<DirectoryContactPhone> =
    family.contact_phones.filter { contactMatchesMember(it, memberName) }

private fun orphanPhones(family: DirectoryFamily): List<DirectoryContactPhone> =
    family.contact_phones.filter { contact ->
        contact.name.isBlank() ||
            family.member_names.none { contactMatchesMember(contact, it) }
    }
