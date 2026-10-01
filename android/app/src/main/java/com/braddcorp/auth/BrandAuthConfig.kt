package com.braddcorp.auth

import androidx.annotation.DrawableRes
import androidx.compose.runtime.Immutable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector

/**
 * Per-app branding + copy for [LoginGateScreen] / [NativeAuthFlow].
 * Create one object per app — do not fork the flow composables.
 */
@Immutable
data class BrandAuthConfig(
    val appName: String,
    val primary: Color,
    val onPrimary: Color = Color.White,
    val surface: Color,
    val card: Color = Color.White,
    val ink: Color,
    val muted: Color,
    val danger: Color = Color(0xFFDC2626),
    /** Hairline card border (iOS BrandColors.cardBorder). */
    val cardBorder: Color = Color(0xFFE0E4E6),
    /** Warm capsule surface for hero badge (iOS BrandColors.warmSurface). */
    val warmSurface: Color = Color(0xFFFAF5ED),
    /** Coral-ink for badge text (iOS BrandColors.coralInk). */
    val badgeInk: Color = Color(0xFF8C472E),
    /** Optional brand wordmark above the hero. Prefer null for Ren — iOS welcome is text-only. */
    @DrawableRes val logoResId: Int? = null,
    val heroTitle: String,
    val heroSubtitle: String? = null,
    val heroMeta: String? = null,
    val heroBadge: String? = null,
    val gateSectionTitle: String = "Sign in",
    val gateHelper: String = "Use the same email and password as the website.",
    val gateButton: String = "Sign in",
    val features: List<BrandFeature> = emptyList(),
    val contactEmail: String? = null,
    /** Opens in browser — iOS WelcomeHub “Reset password on web”. */
    val passwordResetUrl: String? = null,
    val allowSignUp: Boolean = true,
    val sheetTitle: String = "Sign in",
    /** When true, shows inline top bar with [appName] (iOS WelcomeHub navigationTitle). */
    val showNavTitle: Boolean = true,
)

@Immutable
data class BrandFeature(
    val label: String,
    val icon: ImageVector? = null,
)
