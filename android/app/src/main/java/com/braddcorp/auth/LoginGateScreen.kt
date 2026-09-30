package com.braddcorp.auth

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
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
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
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

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(config.surface)
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 20.dp, vertical = 28.dp),
        verticalArrangement = Arrangement.spacedBy(28.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(10.dp),
            modifier = Modifier.fillMaxWidth(),
        ) {
            config.logoResId?.let { resId ->
                Surface(
                    shape = RoundedCornerShape(20.dp),
                    color = config.card,
                    shadowElevation = 2.dp,
                ) {
                    Image(
                        painter = painterResource(resId),
                        contentDescription = config.appName,
                        modifier = Modifier
                            .padding(horizontal = 20.dp, vertical = 16.dp)
                            .widthIn(max = 220.dp)
                            .heightIn(max = 110.dp),
                        contentScale = ContentScale.Fit,
                    )
                }
            }
            Text(
                text = config.heroTitle,
                style = MaterialTheme.typography.headlineLarge,
                fontWeight = FontWeight.SemiBold,
                color = config.primary,
                textAlign = TextAlign.Center,
            )
            config.heroSubtitle?.let {
                Text(
                    text = it,
                    style = MaterialTheme.typography.titleMedium,
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
                    color = config.card,
                ) {
                    Text(
                        text = badge,
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = FontWeight.Medium,
                        color = config.primary,
                    )
                }
            }
        }

        Surface(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(22.dp),
            color = config.card,
            tonalElevation = 0.dp,
            shadowElevation = 0.dp,
        ) {
            Column(
                modifier = Modifier.padding(22.dp),
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
                                modifier = Modifier.height(22.dp),
                                color = config.primary,
                                strokeWidth = 2.dp,
                            )
                            Text("Loading sign-in…", color = config.muted)
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
                            modifier = Modifier.fillMaxWidth(),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = config.primary,
                                contentColor = config.onPrimary,
                            ),
                        ) {
                            Text(config.gateButton)
                        }
                    }
                }
            }
        }

        if (config.features.isNotEmpty()) {
            Surface(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(14.dp),
                color = config.card,
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    config.features.forEach { line ->
                        Text("•  $line", style = MaterialTheme.typography.bodyMedium, color = config.muted)
                    }
                }
            }
        }

        config.contactEmail?.let { email ->
            Column(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                Text("Need help signing in?", style = MaterialTheme.typography.titleSmall, color = config.ink)
                Text(
                    text = email,
                    color = config.primary,
                    style = MaterialTheme.typography.bodyMedium,
                    modifier = Modifier
                        .clickable { uriHandler.openUri("mailto:$email") }
                        .padding(vertical = 2.dp),
                )
                Spacer(Modifier.height(4.dp))
            }
        }
    }
}
