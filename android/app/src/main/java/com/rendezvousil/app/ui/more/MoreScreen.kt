package com.rendezvousil.app.ui.more

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.automirrored.filled.OpenInNew
import androidx.compose.material.icons.filled.Analytics
import androidx.compose.material.icons.filled.AttachMoney
import androidx.compose.material.icons.filled.Badge
import androidx.compose.material.icons.filled.Book
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material.icons.filled.Campaign
import androidx.compose.material.icons.filled.Description
import androidx.compose.material.icons.filled.Groups
import androidx.compose.material.icons.filled.HelpOutline
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Language
import androidx.compose.material.icons.filled.ManageAccounts
import androidx.compose.material.icons.filled.MusicNote
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.NotificationsActive
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.VolunteerActivism
import androidx.compose.material.icons.filled.WbSunny
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.ListItem
import androidx.compose.material3.ListItemDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.clerk.api.Clerk
import com.rendezvousil.app.auth.AppSession
import com.rendezvousil.app.data.BundledContent
import com.rendezvousil.app.theme.BrandColors
import com.rendezvousil.core.network.AppConfig
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MoreScreen(
    appSession: AppSession,
    onNavigateToCalculator: () -> Unit,
    onNavigateToBibleBowl: () -> Unit,
    onNavigateToSongs: () -> Unit,
    onNavigateToFaq: () -> Unit,
    onNavigateToAbout: () -> Unit,
    onNavigateToAdminDashboard: () -> Unit,
    onNavigateToAdminUsers: () -> Unit,
    onNavigateToAdminAnnouncements: () -> Unit = {},
    onNavigateToAdminEventPings: () -> Unit = {},
    onNavigateToStaffDayOf: () -> Unit = {},
    onNavigateToCheckIn: () -> Unit,
    onNavigateToStaffDirectoryPhotos: () -> Unit = {},
    onNavigateToDirectory: () -> Unit,
    onNavigateToDirectoryManage: () -> Unit,
    onNavigateToVolunteering: () -> Unit = {},
    onNavigateToAccount: () -> Unit,
    onNavigateToNotifications: () -> Unit,
    onNavigateToUpdates: () -> Unit = {},
    modifier: Modifier = Modifier,
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val canViewDashboard by appSession.canViewDashboardFlow.collectAsStateWithLifecycle()
    val canManageUsers by appSession.canManageUsersFlow.collectAsStateWithLifecycle()
    val canCheckIn by appSession.canCheckInFlow.collectAsStateWithLifecycle()
    val canEdit by appSession.canEditFlow.collectAsStateWithLifecycle()
    val isAdmin by appSession.isAdminFlow.collectAsStateWithLifecycle()
    val adminRole by appSession.adminRoleFlow.collectAsStateWithLifecycle()
    val adminName by appSession.adminNameFlow.collectAsStateWithLifecycle()
    val clerkUser by Clerk.userFlow.collectAsStateWithLifecycle()

    val displayName = adminName ?: clerkUser?.let { user ->
        listOfNotNull(user.firstName, user.lastName)
            .map { it.trim() }
            .filter { it.isNotEmpty() }
            .joinToString(" ")
            .ifBlank { null }
    }
    val email = clerkUser?.primaryEmailAddress?.emailAddress

    Scaffold(
        modifier = modifier,
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        "More",
                        style = MaterialTheme.typography.headlineSmall,
                        fontWeight = FontWeight.Bold,
                    )
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = BrandColors.GroupedBackground,
                ),
            )
        },
        containerColor = BrandColors.GroupedBackground,
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
        ) {
            item {
                AccountHeaderRow(
                    displayName = displayName,
                    email = email,
                    adminRole = adminRole.takeIf { isAdmin },
                    onAccountClick = onNavigateToAccount,
                )
            }

            item { SectionHeader("Community") }
            item {
                NavListItem(
                    title = "Family account",
                    icon = { Icon(Icons.Default.Person, contentDescription = null, tint = BrandColors.Lake) },
                    onClick = onNavigateToAccount,
                )
                NavListItem(
                    title = "Your directory photo",
                    icon = { Icon(Icons.Default.CameraAlt, contentDescription = null, tint = BrandColors.Lake) },
                    onClick = onNavigateToDirectoryManage,
                )
                NavListItem(
                    title = "Your volunteering",
                    icon = { Icon(Icons.Default.VolunteerActivism, contentDescription = null, tint = BrandColors.Lake) },
                    onClick = onNavigateToVolunteering,
                )
            }

            item {
                HorizontalDivider(
                    modifier = Modifier.padding(vertical = 4.dp),
                    color = BrandColors.CardBorder,
                )
                SectionHeader("Retreat resources")
            }
            item {
                NavListItem(
                    title = "Bible Bowl (${AppConfig.THEME})",
                    icon = { Icon(Icons.Default.Book, contentDescription = null, tint = BrandColors.Lake) },
                    onClick = onNavigateToBibleBowl,
                )
                NavListItem(
                    title = "FAQ",
                    icon = { Icon(Icons.Default.HelpOutline, contentDescription = null, tint = BrandColors.Lake) },
                    onClick = onNavigateToFaq,
                )
                NavListItem(
                    title = "Cost calculator",
                    icon = { Icon(Icons.Default.AttachMoney, contentDescription = null, tint = BrandColors.Lake) },
                    onClick = onNavigateToCalculator,
                )
                NavListItem(
                    title = "Songs",
                    icon = { Icon(Icons.Default.MusicNote, contentDescription = null, tint = BrandColors.Lake) },
                    onClick = onNavigateToSongs,
                )
                NavListItem(
                    title = "About Rendezvous",
                    icon = { Icon(Icons.Default.Info, contentDescription = null, tint = BrandColors.Lake) },
                    onClick = onNavigateToAbout,
                )
                NavListItem(
                    title = "Account & registration",
                    icon = { Icon(Icons.Default.Settings, contentDescription = null, tint = BrandColors.Lake) },
                    onClick = onNavigateToAccount,
                )
                NavListItem(
                    title = "Notifications & widgets",
                    icon = { Icon(Icons.Default.Notifications, contentDescription = null, tint = BrandColors.Lake) },
                    onClick = onNavigateToNotifications,
                )
            }

            if (canViewDashboard) {
                item {
                    HorizontalDivider(
                        modifier = Modifier.padding(vertical = 4.dp),
                        color = BrandColors.CardBorder,
                    )
                    SectionHeader("Admin")
                }
                item {
                    NavListItem(
                        title = "Admin dashboard",
                        icon = { Icon(Icons.Default.Analytics, contentDescription = null, tint = BrandColors.Lake) },
                        onClick = onNavigateToAdminDashboard,
                    )
                    if (canEdit) {
                        NavListItem(
                            title = "Announcements",
                            icon = { Icon(Icons.Default.Campaign, contentDescription = null, tint = BrandColors.Lake) },
                            onClick = onNavigateToAdminAnnouncements,
                        )
                        NavListItem(
                            title = "Event pings",
                            icon = { Icon(Icons.Default.NotificationsActive, contentDescription = null, tint = BrandColors.Lake) },
                            onClick = onNavigateToAdminEventPings,
                        )
                    }
                    NavListItem(
                        title = "Day-of ops",
                        icon = { Icon(Icons.Default.WbSunny, contentDescription = null, tint = BrandColors.Lake) },
                        onClick = onNavigateToStaffDayOf,
                    )
                    if (canManageUsers) {
                        NavListItem(
                            title = "User management",
                            icon = { Icon(Icons.Default.ManageAccounts, contentDescription = null, tint = BrandColors.Lake) },
                            onClick = onNavigateToAdminUsers,
                        )
                    }
                }
            }

            if (canCheckIn) {
                item {
                    HorizontalDivider(
                        modifier = Modifier.padding(vertical = 4.dp),
                        color = BrandColors.CardBorder,
                    )
                    SectionHeader("Staff")
                }
                item {
                    if (!canViewDashboard) {
                        NavListItem(
                            title = "Day-of ops",
                            icon = { Icon(Icons.Default.WbSunny, contentDescription = null, tint = BrandColors.Lake) },
                            onClick = onNavigateToStaffDayOf,
                        )
                    }
                    NavListItem(
                        title = "Check-in station",
                        icon = { Icon(Icons.Default.Badge, contentDescription = null, tint = BrandColors.Lake) },
                        onClick = onNavigateToCheckIn,
                    )
                    NavListItem(
                        title = "Directory photos",
                        icon = { Icon(Icons.Default.CameraAlt, contentDescription = null, tint = BrandColors.Lake) },
                        onClick = onNavigateToStaffDirectoryPhotos,
                    )
                }
            }

            item {
                HorizontalDivider(
                    modifier = Modifier.padding(vertical = 4.dp),
                    color = BrandColors.CardBorder,
                )
                SectionHeader("Links")
            }
            item {
                NavListItem(
                    title = "Schedule PDF",
                    icon = { Icon(Icons.Default.Description, contentDescription = null, tint = BrandColors.Lake) },
                    onClick = {
                        context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(BundledContent.SCHEDULE_PDF_URL)))
                    },
                )
                NavListItem(
                    title = "Facebook group",
                    icon = { Icon(Icons.Default.Groups, contentDescription = null, tint = BrandColors.Lake) },
                    onClick = {
                        context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(BundledContent.FACEBOOK_GROUP_URL)))
                    },
                )
                NavListItem(
                    title = "rendezvousil.com",
                    icon = { Icon(Icons.Default.Language, contentDescription = null, tint = BrandColors.Lake) },
                    trailing = {
                        Icon(
                            Icons.AutoMirrored.Filled.OpenInNew,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    },
                    onClick = {
                        context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(BundledContent.WEBSITE_URL)))
                    },
                )
            }

            item {
                HorizontalDivider(
                    modifier = Modifier.padding(vertical = 4.dp),
                    color = BrandColors.CardBorder,
                )
                ListItem(
                    headlineContent = {
                        Text(
                            "Sign out",
                            color = MaterialTheme.colorScheme.error,
                            fontWeight = FontWeight.Medium,
                        )
                    },
                    leadingContent = {
                        Icon(
                            Icons.AutoMirrored.Filled.Logout,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.error,
                        )
                    },
                    colors = ListItemDefaults.colors(containerColor = BrandColors.GroupedBackground),
                    modifier = Modifier.clickable {
                        scope.launch { appSession.signOut() }
                    },
                )
            }
        }
    }
}

@Composable
private fun AccountHeaderRow(
    displayName: String?,
    email: String?,
    adminRole: String?,
    onAccountClick: () -> Unit,
) {
    val avatarLabel = displayName ?: email
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 12.dp),
        horizontalArrangement = Arrangement.spacedBy(14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        ProfileAvatar(name = avatarLabel)
        Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text(
                text = displayName ?: "Your family account",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
            )
            if (email != null && displayName != null) {
                Text(
                    text = email,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 1,
                )
            }
            adminRole?.let { role ->
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(50))
                        .background(BrandColors.Coral.copy(alpha = 0.15f))
                        .padding(horizontal = 8.dp, vertical = 2.dp),
                ) {
                    Text(
                        text = role.replaceFirstChar { it.uppercase() },
                        style = MaterialTheme.typography.labelSmall,
                        fontWeight = FontWeight.SemiBold,
                        color = BrandColors.CoralInk,
                    )
                }
            }
        }
        TextButton(onClick = onAccountClick) {
            Text("Account", color = BrandColors.Lake)
        }
    }
}

@Composable
private fun ProfileAvatar(name: String?) {
    val initials = rememberInitials(name)
    Box(
        modifier = Modifier
            .size(48.dp)
            .clip(CircleShape)
            .background(BrandColors.LakeLight),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text = initials,
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.SemiBold,
            color = BrandColors.Lake,
        )
    }
}

@Composable
private fun rememberInitials(name: String?): String {
    if (name.isNullOrBlank()) return "?"
    val parts = name.trim().split(Regex("\\s+")).take(2)
    val letters = parts.mapNotNull { it.firstOrNull()?.uppercaseChar()?.toString() }
    return if (letters.isEmpty()) name.first().uppercaseChar().toString() else letters.joinToString("")
}

@Composable
private fun SectionHeader(title: String) {
    Text(
        text = title,
        modifier = Modifier.padding(horizontal = 16.dp, vertical = 10.dp),
        style = MaterialTheme.typography.labelLarge,
        fontWeight = FontWeight.SemiBold,
        color = BrandColors.Lake,
    )
}

@Composable
private fun NavListItem(
    title: String,
    icon: @Composable () -> Unit,
    onClick: () -> Unit,
    trailing: @Composable (() -> Unit)? = null,
) {
    ListItem(
        headlineContent = { Text(title, style = MaterialTheme.typography.bodyLarge) },
        leadingContent = icon,
        trailingContent = trailing,
        colors = ListItemDefaults.colors(containerColor = BrandColors.GroupedBackground),
        modifier = Modifier.clickable(onClick = onClick),
    )
}
