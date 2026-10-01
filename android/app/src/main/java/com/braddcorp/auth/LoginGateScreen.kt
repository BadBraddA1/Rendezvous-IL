package com.braddcorp.auth

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CenterAlignedTopAppBar
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp

/**
 * Welcome / locked gate — mirrors Ren iOS `WelcomeHubView` + `SignInPromptCard`.
 * Parent presents auth via [onSignIn] (typically opens [AuthBottomSheet]).
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LoginGateScreen(
    config: BrandAuthConfig,
    clerkReady: Boolean,
    clerkSetupError: String?,
    authError: String? = null,
    onSignIn: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val uriHandler = LocalUriHandler.current
    val cardShape = RoundedCornerShape(22.dp)
    val featureShape = RoundedCornerShape(14.dp)

    Scaffold(
        modifier = modifier.fillMaxSize(),
        containerColor = config.surface,
        topBar = {
            if (config.showNavTitle) {
                CenterAlignedTopAppBar(
                    title = {
                        Text(
                            text = config.appName,
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.SemiBold,
                            color = config.ink,
                        )
                    },
                    colors = TopAppBarDefaults.centerAlignedTopAppBarColors(
                        containerColor = config.surface,
                    ),
                )
            }
        },
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp, vertical = 28.dp),
            verticalArrangement = Arrangement.spacedBy(28.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(12.dp),
                modifier = Modifier.fillMaxWidth(),
            ) {
                config.logoResId?.let { resId ->
                    Image(
                        painter = painterResource(resId),
                        contentDescription = config.appName,
                        modifier = Modifier
                            .widthIn(max = 200.dp)
                            .heightIn(max = 96.dp)
                            .padding(bottom = 4.dp),
                        contentScale = ContentScale.Fit,
                    )
                }
                Text(
                    text = config.heroTitle,
                    style = MaterialTheme.typography.displayLarge,
                    fontWeight = FontWeight.SemiBold,
                    color = config.primary,
                    textAlign = TextAlign.Center,
                )
                config.heroSubtitle?.let {
                    Text(
                        text = it,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Normal,
                        color = config.muted,
                        textAlign = TextAlign.Center,
                    )
                }
                config.heroMeta?.let {
                    Text(
                        text = it,
                        style = MaterialTheme.typography.bodyMedium,
                        color = config.muted,
                        textAlign = TextAlign.Center,
                    )
                }
                config.heroBadge?.let { badge ->
                    Surface(
                        shape = RoundedCornerShape(50),
                        color = config.warmSurface,
                    ) {
                        Text(
                            text = badge,
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                            style = MaterialTheme.typography.labelMedium,
                            fontWeight = FontWeight.Medium,
                            color = config.badgeInk,
                        )
                    }
                }
            }

            // SignInPromptCard → glassCard(cornerRadius: 22, padding: 22)
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .border(0.5.dp, config.cardBorder, cardShape)
                    .background(config.card, cardShape)
                    .padding(22.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                Text(
                    text = config.gateSectionTitle,
                    style = MaterialTheme.typography.titleMedium,
                    color = config.muted,
                )

                when {
                    clerkSetupError != null -> {
                        Text(clerkSetupError, color = config.danger, style = MaterialTheme.typography.bodyMedium)
                        Text(
                            "Enable Clerk Native API for this Android package in the Clerk dashboard.",
                            color = config.muted,
                            style = MaterialTheme.typography.bodySmall,
                        )
                    }
                    !clerkReady -> {
                        Row(
                            horizontalArrangement = Arrangement.spacedBy(12.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(22.dp),
                                color = config.primary,
                                strokeWidth = 2.dp,
                            )
                            Text("Loading sign-in…", color = config.muted, style = MaterialTheme.typography.bodyMedium)
                        }
                    }
                    else -> {
                        Text(
                            text = config.gateHelper,
                            style = MaterialTheme.typography.bodySmall,
                            color = config.muted,
                        )
                        authError?.let {
                            Text(it, color = config.danger, style = MaterialTheme.typography.bodySmall)
                        }
                        Button(
                            onClick = onSignIn,
                            modifier = Modifier
                                .fillMaxWidth()
                                .heightIn(min = 48.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = config.primary,
                                contentColor = config.onPrimary,
                            ),
                            shape = RoundedCornerShape(12.dp),
                        ) {
                            Text(
                                config.gateButton,
                                style = MaterialTheme.typography.titleSmall,
                                fontWeight = FontWeight.SemiBold,
                            )
                        }
                    }
                }
            }

            if (config.features.isNotEmpty()) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(config.card, featureShape)
                        .padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                    horizontalAlignment = Alignment.Start,
                ) {
                    config.features.forEach { feature ->
                        Row(
                            horizontalArrangement = Arrangement.spacedBy(12.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            feature.icon?.let { icon ->
                                Icon(
                                    imageVector = icon,
                                    contentDescription = null,
                                    tint = config.muted,
                                    modifier = Modifier.size(20.dp),
                                )
                            }
                            Text(
                                text = feature.label,
                                style = MaterialTheme.typography.bodyMedium,
                                color = config.muted,
                            )
                        }
                    }
                }
            }

            config.contactEmail?.let { email ->
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                    horizontalAlignment = Alignment.Start,
                ) {
                    Text(
                        "Need help signing in?",
                        style = MaterialTheme.typography.titleMedium,
                        color = config.ink,
                    )
                    Text(
                        text = email,
                        color = config.primary,
                        style = MaterialTheme.typography.bodyMedium,
                        modifier = Modifier
                            .clickable { uriHandler.openUri("mailto:$email") }
                            .padding(vertical = 2.dp),
                    )
                    config.passwordResetUrl?.let { resetUrl ->
                        Text(
                            text = "Reset password on web",
                            color = config.primary,
                            style = MaterialTheme.typography.bodyMedium,
                            modifier = Modifier
                                .clickable { uriHandler.openUri(resetUrl) }
                                .padding(vertical = 2.dp),
                        )
                    }
                    Spacer(Modifier.height(4.dp))
                }
            }
        }
    }
}
