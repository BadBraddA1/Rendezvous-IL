package com.rendezvousil.app.ui.account

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Book
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.Key
import androidx.compose.material.icons.filled.Language
import androidx.compose.material.icons.filled.Logout
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.People
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
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.clerk.api.Clerk
import com.clerk.ui.auth.AuthView
import com.rendezvousil.app.BuildConfig
import com.rendezvousil.app.auth.AppSession
import com.rendezvousil.app.auth.WebLinks
import com.rendezvousil.app.data.BundledContent
import com.rendezvousil.app.theme.BrandColors
import com.rendezvousil.core.network.AppConfig
import kotlinx.coroutines.launch
import androidx.compose.runtime.rememberCoroutineScope

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AccountScreen(
    appSession: AppSession,
    onBack: () -> Unit,
    onNavigateToDirectory: () -> Unit,
    onNavigateToDirectoryManage: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val isSignedIn by appSession.isSignedInFlow.collectAsStateWithLifecycle()
    val isLoading by appSession.isLoadingFlow.collectAsStateWithLifecycle()
    val clerkUser by Clerk.userFlow.collectAsStateWithLifecycle()
    val clerkInitialized by Clerk.isInitialized.collectAsStateWithLifecycle()
    val adminName by appSession.adminNameFlow.collectAsStateWithLifecycle()
    val clerkSetupError by appSession.clerkSetupErrorFlow.collectAsStateWithLifecycle()

    LaunchedEffect(Unit) {
        appSession.refreshAuth()
    }

    val displayName = adminName ?: clerkUser?.let { user ->
        listOfNotNull(user.firstName, user.lastName)
            .joinToString(" ")
            .ifBlank { null }
    }

    Scaffold(
        modifier = modifier,
        topBar = {
            TopAppBar(
                title = { Text("Account") },
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
            isLoading && !isSignedIn && clerkInitialized -> {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding),
                    contentAlignment = Alignment.Center,
                ) {
                    CircularProgressIndicator()
                }
            }
            isSignedIn -> {
                SignedInAccountContent(
                    displayName = displayName,
                    onOpenWebLink = { path ->
                        WebLinks.open(context, WebLinks.url(BuildConfig.BASE_URL, path))
                    },
                    onNavigateToDirectoryManage = onNavigateToDirectoryManage,
                    onNavigateToDirectory = onNavigateToDirectory,
                    onSignOut = { scope.launch { appSession.signOut() } },
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding)
                        .verticalScroll(rememberScrollState())
                        .padding(16.dp),
                )
            }
            else -> {
                SignedOutAccountContent(
                    clerkInitialized = clerkInitialized,
                    clerkSetupError = clerkSetupError,
                    onForgotPassword = {
                        WebLinks.open(
                            context,
                            WebLinks.url(BuildConfig.BASE_URL, "/sign-in/forgot-password"),
                        )
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
private fun SignedOutAccountContent(
    clerkInitialized: Boolean,
    clerkSetupError: String?,
    onForgotPassword: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier,
        verticalArrangement = Arrangement.spacedBy(20.dp),
    ) {
        Icon(
            Icons.Default.People,
            contentDescription = null,
            tint = BrandColors.Lake,
        )

        Text(
            text = "Family account",
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.SemiBold,
        )

        Text(
            text = "Sign in with the same account you use on rendezvousil.com to manage your family profile, directory photo, and registration.",
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
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(360.dp),
                    contentAlignment = Alignment.Center,
                ) {
                    CircularProgressIndicator()
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

        TextButton(onClick = onForgotPassword) {
            Icon(Icons.Default.Key, contentDescription = null, tint = BrandColors.Lake)
            Text(
                text = "Forgot password?",
                modifier = Modifier.padding(start = 8.dp),
                color = BrandColors.Lake,
            )
        }

        ContactBlock()
    }
}

@Composable
private fun SignedInAccountContent(
    displayName: String?,
    onOpenWebLink: (String) -> Unit,
    onNavigateToDirectoryManage: () -> Unit,
    onNavigateToDirectory: () -> Unit,
    onSignOut: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier,
        verticalArrangement = Arrangement.spacedBy(20.dp),
    ) {
        displayName?.let { name ->
            Text(
                text = "Signed in as $name",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
            )
        }

        Surface(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(12.dp),
            color = BrandColors.SecondaryGroupedBackground,
        ) {
            Column(
                modifier = Modifier.padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
        EventInfoRow(
                    icon = {
                        Icon(
                            Icons.Default.CalendarMonth,
                            contentDescription = null,
                            tint = BrandColors.Coral,
                        )
                    },
                    title = "Event dates",
                    value = AppConfig.EVENT_DATES,
                )
                EventInfoRow(
                    icon = {
                        Icon(
                            Icons.Default.Notifications,
                            contentDescription = null,
                            tint = BrandColors.Coral,
                        )
                    },
                    title = "Registration opens",
                    value = AppConfig.REGISTRATION_OPENS,
                )
                EventInfoRow(
                    icon = {
                        Icon(
                            Icons.Default.Book,
                            contentDescription = null,
                            tint = BrandColors.Coral,
                        )
                    },
                    title = "Bible Bowl",
                    value = AppConfig.THEME,
                )
            }
        }

        AccountActionButton(
            label = "Family dashboard on web",
            icon = { Icon(Icons.Default.Language, contentDescription = null) },
            filled = true,
            onClick = { onOpenWebLink("/account") },
        )

        AccountActionButton(
            label = "Change password on web",
            icon = { Icon(Icons.Default.Key, contentDescription = null) },
            onClick = { onOpenWebLink("/account/settings") },
        )

        AccountActionButton(
            label = "Reset password (email code)",
            icon = { Icon(Icons.Default.Email, contentDescription = null) },
            onClick = { onOpenWebLink("/sign-in/forgot-password") },
        )

        AccountActionButton(
            label = "Upload directory photo",
            icon = { Icon(Icons.Default.CameraAlt, contentDescription = null) },
            onClick = onNavigateToDirectoryManage,
        )

        AccountActionButton(
            label = "Browse family directory",
            icon = { Icon(Icons.Default.People, contentDescription = null) },
            onClick = onNavigateToDirectory,
        )

        OutlinedButton(
            onClick = onSignOut,
            modifier = Modifier.fillMaxWidth(),
            colors = ButtonDefaults.outlinedButtonColors(
                contentColor = MaterialTheme.colorScheme.error,
            ),
        ) {
            Icon(Icons.Default.Logout, contentDescription = null)
            Text(
                text = "Sign out",
                modifier = Modifier.padding(start = 8.dp),
            )
        }

        ContactBlock()
    }
}

@Composable
private fun EventInfoRow(
    icon: @Composable () -> Unit,
    title: String,
    value: String,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalAlignment = Alignment.Top,
    ) {
        icon()
        Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Text(
                text = title,
                style = MaterialTheme.typography.labelMedium,
                fontWeight = FontWeight.SemiBold,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Text(
                text = value,
                style = MaterialTheme.typography.bodyMedium,
            )
        }
    }
}

@Composable
private fun AccountActionButton(
    label: String,
    icon: @Composable () -> Unit,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    filled: Boolean = false,
) {
    if (filled) {
        Button(
            onClick = onClick,
            modifier = modifier.fillMaxWidth(),
            colors = ButtonDefaults.buttonColors(
                containerColor = BrandColors.Lake,
                contentColor = Color.White,
            ),
            shape = RoundedCornerShape(12.dp),
        ) {
            icon()
            Text(text = label, modifier = Modifier.padding(start = 8.dp))
        }
    } else {
        Surface(
            onClick = onClick,
            modifier = modifier.fillMaxWidth(),
            shape = RoundedCornerShape(12.dp),
            color = BrandColors.SecondaryGroupedBackground,
        ) {
            Row(
                modifier = Modifier.padding(16.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                icon()
                Text(
                    text = label,
                    modifier = Modifier.padding(start = 8.dp),
                    color = BrandColors.Lake,
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.Medium,
                )
            }
        }
    }
}

@Composable
private fun ContactBlock(modifier: Modifier = Modifier) {
    val context = LocalContext.current

    Column(
        modifier = modifier,
        verticalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        Text(
            text = "Questions?",
            style = MaterialTheme.typography.titleSmall,
            fontWeight = FontWeight.SemiBold,
        )
        TextButton(
            onClick = {
                context.startActivity(
                    Intent(Intent.ACTION_SENDTO, Uri.parse("mailto:${BundledContent.CONTACT_EMAIL}")),
                )
            },
            contentPadding = androidx.compose.foundation.layout.PaddingValues(0.dp),
        ) {
            Text(BundledContent.CONTACT_EMAIL)
        }
        TextButton(
            onClick = {
                context.startActivity(Intent(Intent.ACTION_DIAL, Uri.parse("tel:+12179355058")))
            },
            contentPadding = androidx.compose.foundation.layout.PaddingValues(0.dp),
        ) {
            Text(BundledContent.CONTACT_PHONE)
        }
    }
}
