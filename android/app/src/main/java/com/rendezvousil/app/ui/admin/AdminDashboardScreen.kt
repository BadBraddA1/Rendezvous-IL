package com.rendezvousil.app.ui.admin

import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.OpenInNew
import androidx.compose.material.icons.filled.AttachMoney
import androidx.compose.material.icons.filled.Bed
import androidx.compose.material.icons.filled.Campaign
import androidx.compose.material.icons.filled.CarRental
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.EditNote
import androidx.compose.material.icons.filled.FamilyRestroom
import androidx.compose.material.icons.filled.Groups
import androidx.compose.material.icons.filled.Key
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.OpenInBrowser
import androidx.compose.material.icons.filled.People
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.RvHookup
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.Flag
import androidx.compose.material.icons.filled.Park
import androidx.compose.material.icons.filled.VpnKey
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
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
import com.rendezvousil.core.network.dto.AdminDashboardResponse
import com.rendezvousil.core.network.dto.AdminDashboardSummary
import com.rendezvousil.core.network.dto.AdminLodgingBreakdown
import java.text.NumberFormat
import java.time.Instant
import java.time.format.DateTimeFormatter
import java.time.temporal.ChronoUnit
import java.util.Locale
import kotlin.math.min

private data class StatTile(
    val title: String,
    val value: String,
    val icon: ImageVector,
    val tint: Color,
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AdminDashboardScreen(
    appSession: AppSession,
    viewModelFactory: RendezvousViewModelFactory,
    onBack: () -> Unit,
    onNavigateToUsers: (() -> Unit)? = null,
    modifier: Modifier = Modifier,
) {
    val viewModel: AdminDashboardViewModel = viewModel(factory = viewModelFactory)
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val isSignedIn by appSession.isSignedInFlow.collectAsStateWithLifecycle()
    val canViewDashboard by appSession.canViewDashboardFlow.collectAsStateWithLifecycle()
    val adminName by appSession.adminNameFlow.collectAsStateWithLifecycle()
    val clerkInitialized by Clerk.isInitialized.collectAsStateWithLifecycle()
    val clerkSetupError by appSession.clerkSetupErrorFlow.collectAsStateWithLifecycle()

    LaunchedEffect(Unit) {
        appSession.refreshAuth()
    }

    Scaffold(
        modifier = modifier,
        topBar = {
            TopAppBar(
                title = { Text("Admin") },
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
                AdminSignInContent(
                    clerkInitialized = clerkInitialized,
                    clerkSetupError = clerkSetupError,
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding)
                        .verticalScroll(rememberScrollState())
                        .padding(20.dp),
                )
            }
            !canViewDashboard -> {
                AccessDeniedContent(
                    title = "Admin access required",
                    message = "Your account is signed in but does not have dashboard permissions. Ask a full admin to assign a role in Admin → Users on the website.",
                    adminName = adminName,
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding)
                        .padding(20.dp),
                )
            }
            uiState.dashboard != null -> {
                PullToRefreshBox(
                    isRefreshing = uiState.isRefreshing,
                    onRefresh = { viewModel.loadDashboard(force = true) },
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding),
                ) {
                    DashboardContent(
                        payload = uiState.dashboard!!,
                        canCheckIn = appSession.canCheckIn,
                        canManageUsers = appSession.canManageUsers,
                        onNavigateToUsers = onNavigateToUsers,
                        modifier = Modifier
                            .fillMaxSize()
                            .verticalScroll(rememberScrollState())
                            .padding(horizontal = 20.dp, vertical = 8.dp),
                    )
                }
            }
            uiState.isLoading -> {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding),
                    contentAlignment = Alignment.Center,
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        CircularProgressIndicator(color = BrandColors.Lake)
                        Spacer(modifier = Modifier.height(12.dp))
                        Text("Loading dashboard…")
                    }
                }
            }
            else -> {
                EmptyDashboardContent(
                    errorMessage = uiState.errorMessage,
                    onRetry = { viewModel.loadDashboard(force = true) },
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding)
                        .padding(20.dp),
                )
            }
        }
    }
}

@Composable
private fun AdminSignInContent(
    clerkInitialized: Boolean,
    clerkSetupError: String?,
    modifier: Modifier = Modifier,
) {
    val context = LocalContext.current

    Column(
        modifier = modifier,
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        AdminHeaderCard(
            title = "Admin sign-in",
            subtitle = "Sign in with your Rendezvous admin account. Your Clerk user needs an admin role (admin, editor, viewer, or check-in).",
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
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(360.dp),
                    contentAlignment = Alignment.Center,
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
                WebLinks.open(context, WebLinks.url(BuildConfig.BASE_URL, "/admin"))
            },
        ) {
            Icon(Icons.Default.OpenInBrowser, contentDescription = null, tint = BrandColors.Lake)
            Text(
                text = "Open full admin on web",
                modifier = Modifier.padding(start = 8.dp),
                color = BrandColors.Lake,
            )
        }
    }
}

@Composable
private fun AccessDeniedContent(
    title: String,
    message: String,
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
            text = title,
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.SemiBold,
        )
        Text(
            text = message,
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
private fun EmptyDashboardContent(
    errorMessage: String?,
    onRetry: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier.fillMaxSize(),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        errorMessage?.let { message ->
            Text(
                text = message,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Spacer(modifier = Modifier.height(16.dp))
        }
        Button(
            onClick = onRetry,
            colors = ButtonDefaults.buttonColors(
                containerColor = BrandColors.Lake,
                contentColor = Color.White,
            ),
        ) {
            Text("Try again")
        }
    }
}

@Composable
private fun DashboardContent(
    payload: AdminDashboardResponse,
    canCheckIn: Boolean,
    canManageUsers: Boolean,
    onNavigateToUsers: (() -> Unit)?,
    modifier: Modifier = Modifier,
) {
    val context = LocalContext.current
    val openWeb: (String) -> Unit = { path ->
        WebLinks.open(context, WebLinks.url(BuildConfig.BASE_URL, path))
    }

    Column(
        modifier = modifier.padding(bottom = 32.dp),
        verticalArrangement = Arrangement.spacedBy(20.dp),
    ) {
        HeroSection(payload)
        RegistrationProgressCard(payload)
        StatsGrid(payload.summary)
        ActionItemsCard(payload.summary, openWeb)
        LodgingCard(payload.summary.lodgingBreakdown)
        QuickLinksCard(canCheckIn, canManageUsers, onNavigateToUsers, openWeb)
        FooterCard(payload)
    }
}

@Composable
private fun HeroSection(payload: AdminDashboardResponse) {
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .border(1.dp, BrandColors.Lake.copy(alpha = 0.2f), RoundedCornerShape(16.dp)),
        shape = RoundedCornerShape(16.dp),
        color = BrandColors.LakeLight,
    ) {
        Column(
            modifier = Modifier.padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    text = "Rendezvous ${payload.summary.eventYear}",
                    style = MaterialTheme.typography.headlineMedium,
                    fontWeight = FontWeight.SemiBold,
                    color = BrandColors.Lake,
                )
                RoleBadge(payload.admin.role)
            }
            Text(
                text = "Planning overview for staff and organizers.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            if (payload.admin.fullName.isNotBlank()) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        Icons.Default.Person,
                        contentDescription = null,
                        tint = BrandColors.CoralInk,
                        modifier = Modifier.size(18.dp),
                    )
                    Text(
                        text = payload.admin.fullName,
                        modifier = Modifier.padding(start = 6.dp),
                        style = MaterialTheme.typography.bodySmall,
                        color = BrandColors.CoralInk,
                    )
                }
            }
        }
    }
}

@Composable
private fun RoleBadge(role: String) {
    Surface(
        shape = RoundedCornerShape(50),
        color = BrandColors.Coral.copy(alpha = 0.15f),
    ) {
        Text(
            text = role.uppercase(Locale.US),
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
            style = MaterialTheme.typography.labelSmall,
            fontWeight = FontWeight.Bold,
            color = BrandColors.CoralInk,
        )
    }
}

@Composable
private fun RegistrationProgressCard(payload: AdminDashboardResponse) {
    AdminCard {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Default.Flag, contentDescription = null, tint = BrandColors.Lake)
                Text(
                    text = "Registration goal",
                    modifier = Modifier.padding(start = 8.dp),
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold,
                    color = BrandColors.Lake,
                )
            }
            Text(
                text = "${payload.summary.registrations} / ${payload.summary.registrationGoal}",
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = FontWeight.SemiBold,
            )
        }
        Spacer(modifier = Modifier.height(12.dp))
        LinearProgressIndicator(
            progress = { min(payload.registrationProgress.toFloat(), 100f) / 100f },
            modifier = Modifier.fillMaxWidth(),
            color = BrandColors.Coral,
            trackColor = BrandColors.Coral.copy(alpha = 0.15f),
        )
        Spacer(modifier = Modifier.height(12.dp))
        Row(modifier = Modifier.fillMaxWidth()) {
            MiniStat("Returning", payload.summary.returningFamilies, Modifier.weight(1f))
            MiniStat("New", payload.summary.newFamilies, Modifier.weight(1f))
            MiniStat("Express", payload.summary.expressRegistrations, Modifier.weight(1f))
        }
    }
}

@Composable
private fun MiniStat(title: String, value: Int, modifier: Modifier = Modifier) {
    Column(modifier = modifier) {
        Text(
            text = title,
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Text(
            text = "$value",
            style = MaterialTheme.typography.bodyMedium,
            fontWeight = FontWeight.SemiBold,
        )
    }
}

@Composable
private fun StatsGrid(summary: AdminDashboardSummary) {
    val tiles = listOf(
        StatTile("Families", "${summary.totalFamilies}", Icons.Default.Groups, BrandColors.Lake),
        StatTile("Members", "${summary.totalMembers}", Icons.Default.People, BrandColors.Lake),
        StatTile("Registered", "${summary.registrations}", Icons.Default.CheckCircle, BrandColors.Coral),
        StatTile("Attendees", "${summary.registeredAttendees}", Icons.Default.FamilyRestroom, BrandColors.Coral),
        StatTile("Checked in", "${summary.checkedIn}", Icons.Default.VpnKey, BrandColors.CoralInk),
        StatTile("Fully paid", "${summary.fullyPaid}", Icons.Default.AttachMoney, BrandColors.CoralInk),
    )

    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text(
            text = "At a glance",
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.SemiBold,
            color = BrandColors.Lake,
        )
        LazyVerticalGrid(
            columns = GridCells.Fixed(2),
            modifier = Modifier.height(320.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
            userScrollEnabled = false,
        ) {
            items(tiles) { tile ->
                StatTileCard(tile)
            }
        }
    }
}

@Composable
private fun StatTileCard(tile: StatTile) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        color = BrandColors.SecondaryGroupedBackground,
    ) {
        Column(
            modifier = Modifier.padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Icon(tile.icon, contentDescription = null, tint = tile.tint)
            Text(
                text = tile.value,
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Bold,
            )
            Text(
                text = tile.title,
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

@Composable
private fun ActionItemsCard(
    summary: AdminDashboardSummary,
    openWeb: (String) -> Unit,
) {
    AdminCard {
        Text(
            text = "Needs attention",
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.SemiBold,
            color = BrandColors.Lake,
        )
        Spacer(modifier = Modifier.height(12.dp))
        ActionRow(
            title = "Pending family changes",
            value = summary.pendingChanges,
            icon = Icons.Default.EditNote,
            highlight = summary.pendingChanges > 0,
            onClick = { openWeb("/admin/pending-changes") },
        )
        ActionRow(
            title = "Active announcements",
            value = summary.activeAnnouncements,
            icon = Icons.Default.Campaign,
            onClick = { openWeb("/admin/announcements") },
        )
        ActionRow(
            title = "Feedback responses",
            value = summary.feedbackCount,
            icon = Icons.Default.Star,
            detail = if (summary.feedbackCount > 0) {
                String.format(Locale.US, "%.1f avg rating", summary.avgRating)
            } else {
                null
            },
            onClick = { openWeb("/admin/feedback") },
        )
    }
}

@Composable
private fun ActionRow(
    title: String,
    value: Int,
    icon: ImageVector,
    onClick: () -> Unit,
    highlight: Boolean = false,
    detail: String? = null,
) {
    Surface(
        onClick = onClick,
        modifier = Modifier.fillMaxWidth(),
        color = Color.Transparent,
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(
                icon,
                contentDescription = null,
                tint = if (highlight) BrandColors.Coral else BrandColors.Lake,
                modifier = Modifier.width(24.dp),
            )
            Column(
                modifier = Modifier
                    .weight(1f)
                    .padding(horizontal = 12.dp),
            ) {
                Text(
                    text = title,
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.Medium,
                )
                detail?.let {
                    Text(
                        text = it,
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
            Text(
                text = "$value",
                style = MaterialTheme.typography.titleMedium,
                color = if (highlight) BrandColors.Coral else MaterialTheme.colorScheme.onSurface,
            )
            Icon(
                Icons.AutoMirrored.Filled.OpenInNew,
                contentDescription = null,
                modifier = Modifier
                    .padding(start = 4.dp)
                    .size(16.dp),
                tint = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

@Composable
private fun LodgingCard(lodging: AdminLodgingBreakdown) {
    AdminCard {
        Text(
            text = "Lodging mix",
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.SemiBold,
            color = BrandColors.Lake,
        )
        Spacer(modifier = Modifier.height(12.dp))
        LodgingRow("Motel", lodging.motel, Icons.Default.Bed)
        LodgingRow("RV", lodging.rv, Icons.Default.RvHookup)
        LodgingRow("Tent", lodging.tent, Icons.Default.Park)
        LodgingRow("Drive-in", lodging.drivein, Icons.Default.CarRental)
    }
}

@Composable
private fun LodgingRow(label: String, count: Int, icon: ImageVector) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(icon, contentDescription = null, modifier = Modifier.size(20.dp))
            Text(
                text = label,
                modifier = Modifier.padding(start = 8.dp),
                style = MaterialTheme.typography.bodyMedium,
            )
        }
        Text(
            text = "$count",
            style = MaterialTheme.typography.bodyMedium,
            fontWeight = FontWeight.SemiBold,
        )
    }
}

@Composable
private fun QuickLinksCard(
    canCheckIn: Boolean,
    canManageUsers: Boolean,
    onNavigateToUsers: (() -> Unit)?,
    openWeb: (String) -> Unit,
) {
    AdminCard {
        Text(
            text = "Open on web",
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.SemiBold,
            color = BrandColors.Lake,
        )
        Spacer(modifier = Modifier.height(8.dp))
        WebLinkRow("Full admin dashboard", Icons.Default.OpenInBrowser) {
            openWeb("/admin")
        }
        WebLinkRow("Registrations", Icons.Default.EditNote) {
            openWeb("/admin/registrations")
        }
        if (canManageUsers) {
            val userManagementClick = onNavigateToUsers ?: { openWeb("/admin/users") }
            WebLinkRow("User management", Icons.Default.People, userManagementClick)
        }
        if (canCheckIn) {
            WebLinkRow("Check-in station", Icons.Default.Key) {
                openWeb("/admin/checkin")
            }
        }
    }
}

@Composable
private fun WebLinkRow(
    title: String,
    icon: ImageVector,
    onClick: () -> Unit,
) {
    Surface(
        onClick = onClick,
        modifier = Modifier.fillMaxWidth(),
        color = Color.Transparent,
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(icon, contentDescription = null, tint = BrandColors.Lake)
            Text(
                text = title,
                modifier = Modifier
                    .weight(1f)
                    .padding(horizontal = 12.dp),
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = FontWeight.Medium,
            )
            Icon(
                Icons.AutoMirrored.Filled.OpenInNew,
                contentDescription = null,
                modifier = Modifier.size(16.dp),
                tint = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

@Composable
private fun FooterCard(payload: AdminDashboardResponse) {
    val currency = NumberFormat.getCurrencyInstance(Locale.US).apply {
        maximumFractionDigits = 0
    }

    AdminCard {
        RevenueRow("Revenue", currency.format(payload.summary.totalRevenue), emphasized = true)
        RevenueRow(
            "Deposits collected",
            currency.format(payload.summary.depositsPaid),
            emphasized = false,
        )
        RevenueRow(
            "Balance due",
            currency.format(payload.summary.balanceDue),
            emphasized = false,
        )
        Text(
            text = "Updated ${formatRelativeUpdatedAt(payload.updatedAt)}",
            modifier = Modifier.padding(top = 8.dp),
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@Composable
private fun RevenueRow(label: String, value: String, emphasized: Boolean) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        Text(
            text = label,
            style = if (emphasized) {
                MaterialTheme.typography.bodyMedium
            } else {
                MaterialTheme.typography.bodySmall
            },
            fontWeight = if (emphasized) FontWeight.SemiBold else FontWeight.Normal,
            color = if (emphasized) {
                MaterialTheme.colorScheme.onSurface
            } else {
                MaterialTheme.colorScheme.onSurfaceVariant
            },
        )
        Text(
            text = value,
            style = if (emphasized) {
                MaterialTheme.typography.bodyMedium
            } else {
                MaterialTheme.typography.bodySmall
            },
            fontWeight = FontWeight.SemiBold,
            color = if (emphasized) {
                MaterialTheme.colorScheme.onSurface
            } else {
                MaterialTheme.colorScheme.onSurfaceVariant
            },
        )
    }
}

@Composable
private fun AdminHeaderCard(title: String, subtitle: String) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text(
            text = title,
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.SemiBold,
        )
        Text(
            text = subtitle,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@Composable
private fun AdminCard(content: @Composable () -> Unit) {
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .border(1.dp, BrandColors.CardBorder, RoundedCornerShape(16.dp)),
        shape = RoundedCornerShape(16.dp),
        color = BrandColors.SecondaryGroupedBackground,
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            content()
        }
    }
}

private fun formatRelativeUpdatedAt(iso: String): String {
    val instant = runCatching {
        Instant.from(DateTimeFormatter.ISO_INSTANT.parse(iso))
    }.getOrElse {
        runCatching {
            Instant.parse(iso)
        }.getOrNull()
    } ?: return iso

    val minutes = ChronoUnit.MINUTES.between(instant, Instant.now())
    return when {
        minutes < 1 -> "just now"
        minutes < 60 -> "${minutes}m ago"
        minutes < 60 * 24 -> "${minutes / 60}h ago"
        else -> "${minutes / (60 * 24)}d ago"
    }
}
