package com.rendezvousil.app.ui.more

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.OpenInNew
import androidx.compose.material.icons.filled.Analytics
import androidx.compose.material.icons.filled.AttachMoney
import androidx.compose.material.icons.filled.Badge
import androidx.compose.material.icons.filled.Book
import androidx.compose.material.icons.filled.Description
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material.icons.filled.Groups
import androidx.compose.material.icons.filled.HelpOutline
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Language
import androidx.compose.material.icons.filled.ManageAccounts
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.People
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.VolunteerActivism
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.ListItem
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.rendezvousil.app.auth.AppSession
import com.rendezvousil.app.data.BundledContent
import com.rendezvousil.app.theme.BrandColors

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MoreScreen(
    appSession: AppSession,
    onNavigateToCalculator: () -> Unit,
    onNavigateToBibleBowl: () -> Unit,
    onNavigateToFaq: () -> Unit,
    onNavigateToAbout: () -> Unit,
    onNavigateToAdminDashboard: () -> Unit,
    onNavigateToAdminUsers: () -> Unit,
    onNavigateToCheckIn: () -> Unit,
    onNavigateToDirectory: () -> Unit,
    onNavigateToDirectoryManage: () -> Unit,
    onNavigateToVolunteering: () -> Unit = {},
    onNavigateToAccount: () -> Unit,
    onNavigateToNotifications: () -> Unit,
    onNavigateToUpdates: () -> Unit = {},
    modifier: Modifier = Modifier,
) {
    val context = LocalContext.current
    val canViewDashboard by appSession.canViewDashboardFlow.collectAsStateWithLifecycle()
    val canManageUsers by appSession.canManageUsersFlow.collectAsStateWithLifecycle()
    val canCheckIn by appSession.canCheckInFlow.collectAsStateWithLifecycle()

    Scaffold(
        modifier = modifier,
        topBar = { TopAppBar(title = { Text("More") }) },
        containerColor = BrandColors.GroupedBackground,
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
        ) {
            item {
                SectionHeader("Plan your trip")
            }
            item {
                NavListItem(
                    title = "Live updates",
                    icon = { Icon(Icons.Default.Notifications, contentDescription = null) },
                    onClick = onNavigateToUpdates,
                )
                NavListItem(
                    title = "Cost calculator",
                    icon = { Icon(Icons.Default.AttachMoney, contentDescription = null) },
                    onClick = onNavigateToCalculator,
                )
                NavListItem(
                    title = "Bible Bowl",
                    icon = { Icon(Icons.Default.Book, contentDescription = null) },
                    onClick = onNavigateToBibleBowl,
                )
                NavListItem(
                    title = "FAQ",
                    icon = { Icon(Icons.Default.HelpOutline, contentDescription = null) },
                    onClick = onNavigateToFaq,
                )
                NavListItem(
                    title = "About Rendezvous",
                    icon = { Icon(Icons.Default.Info, contentDescription = null) },
                    onClick = onNavigateToAbout,
                )
            }

            if (canViewDashboard) {
                item {
                    HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))
                    SectionHeader("Admin")
                }
                item {
                    NavListItem(
                        title = "Admin dashboard",
                        icon = { Icon(Icons.Default.Analytics, contentDescription = null) },
                        onClick = onNavigateToAdminDashboard,
                    )
                    if (canManageUsers) {
                        NavListItem(
                            title = "User management",
                            icon = { Icon(Icons.Default.ManageAccounts, contentDescription = null) },
                            onClick = onNavigateToAdminUsers,
                        )
                    }
                    if (canCheckIn) {
                        NavListItem(
                            title = "Staff check-in",
                            icon = { Icon(Icons.Default.Badge, contentDescription = null) },
                            onClick = onNavigateToCheckIn,
                        )
                    }
                }
            }

            item {
                HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))
                SectionHeader("Account")
            }
            item {
                NavListItem(
                    title = "Family account",
                    icon = { Icon(Icons.Default.Person, contentDescription = null) },
                    onClick = onNavigateToAccount,
                )
                NavListItem(
                    title = "Family directory",
                    icon = { Icon(Icons.Default.People, contentDescription = null) },
                    onClick = onNavigateToDirectory,
                )
                NavListItem(
                    title = "Directory photo",
                    icon = { Icon(Icons.Default.CameraAlt, contentDescription = null) },
                    onClick = onNavigateToDirectoryManage,
                )
                NavListItem(
                    title = "Your volunteering",
                    icon = { Icon(Icons.Default.VolunteerActivism, contentDescription = null) },
                    onClick = onNavigateToVolunteering,
                )
                NavListItem(
                    title = "Notifications & widgets",
                    icon = { Icon(Icons.Default.Notifications, contentDescription = null) },
                    onClick = onNavigateToNotifications,
                )
            }

            item {
                HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))
                SectionHeader("Links")
            }
            item {
                NavListItem(
                    title = "Download schedule PDF",
                    icon = { Icon(Icons.Default.Description, contentDescription = null) },
                    onClick = {
                        context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(BundledContent.SCHEDULE_PDF_URL)))
                    },
                )
                NavListItem(
                    title = "Facebook group",
                    icon = { Icon(Icons.Default.Groups, contentDescription = null) },
                    onClick = {
                        context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(BundledContent.FACEBOOK_GROUP_URL)))
                    },
                )
                NavListItem(
                    title = "rendezvousil.com",
                    icon = { Icon(Icons.Default.Language, contentDescription = null) },
                    trailing = { Icon(Icons.AutoMirrored.Filled.OpenInNew, contentDescription = null) },
                    onClick = {
                        context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(BundledContent.WEBSITE_URL)))
                    },
                )
            }
        }
    }
}

@Composable
private fun SectionHeader(title: String) {
    Text(
        text = title,
        modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp),
        style = MaterialTheme.typography.labelLarge,
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
        headlineContent = { Text(title) },
        leadingContent = icon,
        trailingContent = trailing,
        modifier = Modifier.clickable(onClick = onClick),
    )
}
