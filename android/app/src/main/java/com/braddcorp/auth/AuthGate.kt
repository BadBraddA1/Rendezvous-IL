package com.braddcorp.auth

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier

/**
 * Root gate: loading → welcome/[LoginGateScreen] → [content] when signed in.
 * Matches Ren iOS `RootView` login-required behavior.
 */
@Composable
fun AuthGate(
    isSignedIn: Boolean,
    isLoading: Boolean,
    clerkReady: Boolean,
    clerkSetupError: String?,
    config: BrandAuthConfig,
    authError: String? = null,
    onAuthenticated: () -> Unit,
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit,
) {
    var showAuth by remember { mutableStateOf(false) }

    when {
        isSignedIn -> content()
        isLoading -> {
            Box(modifier = modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = config.primary)
            }
        }
        else -> {
            LoginGateScreen(
                config = config,
                clerkReady = clerkReady,
                clerkSetupError = clerkSetupError,
                authError = authError,
                onSignIn = { showAuth = true },
                modifier = modifier,
            )
            if (showAuth && clerkReady && clerkSetupError == null) {
                AuthBottomSheet(
                    config = config,
                    onDismiss = { showAuth = false },
                    onAuthenticated = onAuthenticated,
                )
            }
        }
    }
}
