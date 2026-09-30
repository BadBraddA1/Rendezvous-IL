package com.braddcorp.auth

import androidx.compose.runtime.Immutable
import androidx.compose.ui.graphics.Color

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
    val heroTitle: String,
    val heroSubtitle: String? = null,
    val heroMeta: String? = null,
    val heroBadge: String? = null,
    val gateSectionTitle: String = "Sign in",
    val gateHelper: String = "Use the same email and password as the website.",
    val gateButton: String = "Sign in",
    val features: List<String> = emptyList(),
    val contactEmail: String? = null,
    val allowSignUp: Boolean = true,
    val sheetTitle: String = "Sign in",
)
