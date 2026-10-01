package com.rendezvousil.app.theme

import android.app.Activity
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.ReadOnlyComposable
import androidx.compose.runtime.SideEffect
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp
import androidx.core.view.WindowCompat

/**
 * Lake-teal + coral palette — adaptive for light/dark, mirrored from
 * `ios/RendezvousIL/Components/BrandColors.swift`.
 *
 * Adaptive tokens are `@Composable` so screens that hard-code
 * [GroupedBackground] / [SecondaryGroupedBackground] stay readable when
 * the phone is in dark mode (Material `onSurface` alone used to go light
 * while these surfaces stayed white → invisible text).
 */
private data class BrandPalette(
    val lakeLight: Color,
    val coralInk: Color,
    val warmSurface: Color,
    val cardBorder: Color,
    val groupedBackground: Color,
    val secondaryGroupedBackground: Color,
)

private val LightPalette = BrandPalette(
    lakeLight = Color(0.88f, 0.95f, 0.94f),
    coralInk = Color(0.55f, 0.28f, 0.18f),
    warmSurface = Color(0.98f, 0.96f, 0.93f),
    cardBorder = Color(0.88f, 0.90f, 0.91f),
    // iOS systemGroupedBackground (light)
    groupedBackground = Color(0.95f, 0.95f, 0.97f),
    secondaryGroupedBackground = Color(1f, 1f, 1f),
)

private val DarkPalette = BrandPalette(
    // Match iOS BrandColors dark trait values
    lakeLight = Color(0.12f, 0.28f, 0.27f),
    coralInk = Color(0.95f, 0.72f, 0.62f),
    warmSurface = Color(0.16f, 0.15f, 0.14f),
    cardBorder = Color.White.copy(alpha = 0.12f),
    // Warm charcoal (not pure Material black) — closer to iOS Ren dark
    groupedBackground = Color(0.11f, 0.10f, 0.09f),
    secondaryGroupedBackground = Color(0.18f, 0.17f, 0.16f),
)

private val LocalBrandPalette = staticCompositionLocalOf { LightPalette }

object BrandColors {
    val Lake = Color(0.22f, 0.55f, 0.52f)
    val Coral = Color(0.78f, 0.45f, 0.32f)

    val LakeLight: Color
        @Composable
        @ReadOnlyComposable
        get() = LocalBrandPalette.current.lakeLight

    val CoralInk: Color
        @Composable
        @ReadOnlyComposable
        get() = LocalBrandPalette.current.coralInk

    val WarmSurface: Color
        @Composable
        @ReadOnlyComposable
        get() = LocalBrandPalette.current.warmSurface

    val CardBorder: Color
        @Composable
        @ReadOnlyComposable
        get() = LocalBrandPalette.current.cardBorder

    val GroupedBackground: Color
        @Composable
        @ReadOnlyComposable
        get() = LocalBrandPalette.current.groupedBackground

    val SecondaryGroupedBackground: Color
        @Composable
        @ReadOnlyComposable
        get() = LocalBrandPalette.current.secondaryGroupedBackground
}

private fun lightScheme(p: BrandPalette) = lightColorScheme(
    primary = BrandColors.Lake,
    onPrimary = Color.White,
    primaryContainer = p.lakeLight,
    onPrimaryContainer = Color(0.08f, 0.28f, 0.26f),
    secondary = BrandColors.Coral,
    onSecondary = Color.White,
    secondaryContainer = Color(0.98f, 0.90f, 0.86f),
    onSecondaryContainer = p.coralInk,
    tertiary = p.coralInk,
    onTertiary = Color.White,
    tertiaryContainer = Color(0.96f, 0.88f, 0.82f),
    onTertiaryContainer = p.coralInk,
    background = p.groupedBackground,
    onBackground = Color(0.1f, 0.1f, 0.12f),
    surface = p.secondaryGroupedBackground,
    onSurface = Color(0.1f, 0.1f, 0.12f),
    surfaceVariant = p.warmSurface,
    onSurfaceVariant = Color(0.35f, 0.36f, 0.38f),
    surfaceContainerLowest = p.secondaryGroupedBackground,
    surfaceContainerLow = p.warmSurface,
    surfaceContainer = p.groupedBackground,
    surfaceContainerHigh = p.warmSurface,
    surfaceContainerHighest = Color(0.93f, 0.93f, 0.94f),
    outline = p.cardBorder,
    outlineVariant = Color(0.88f, 0.90f, 0.91f),
    inverseSurface = Color(0.18f, 0.18f, 0.20f),
    inverseOnSurface = Color(0.95f, 0.95f, 0.96f),
    inversePrimary = p.lakeLight,
)

private fun darkScheme(p: BrandPalette) = darkColorScheme(
    primary = BrandColors.Lake,
    onPrimary = Color.White,
    primaryContainer = p.lakeLight,
    onPrimaryContainer = Color(0.88f, 0.95f, 0.94f),
    secondary = BrandColors.Coral,
    onSecondary = Color.White,
    secondaryContainer = Color(0.32f, 0.18f, 0.12f),
    onSecondaryContainer = p.coralInk,
    tertiary = p.coralInk,
    onTertiary = Color(0.2f, 0.1f, 0.06f),
    tertiaryContainer = Color(0.32f, 0.18f, 0.12f),
    onTertiaryContainer = p.coralInk,
    background = p.groupedBackground,
    onBackground = Color(0.95f, 0.95f, 0.96f),
    surface = p.secondaryGroupedBackground,
    onSurface = Color(0.95f, 0.95f, 0.96f),
    surfaceVariant = p.warmSurface,
    onSurfaceVariant = Color(0.72f, 0.72f, 0.74f),
    surfaceContainerLowest = Color(0.05f, 0.05f, 0.05f),
    surfaceContainerLow = p.secondaryGroupedBackground,
    surfaceContainer = p.warmSurface,
    surfaceContainerHigh = Color(0.20f, 0.19f, 0.18f),
    surfaceContainerHighest = Color(0.24f, 0.23f, 0.22f),
    outline = p.cardBorder,
    outlineVariant = Color.White.copy(alpha = 0.18f),
    inverseSurface = Color(0.95f, 0.95f, 0.96f),
    inverseOnSurface = Color(0.18f, 0.18f, 0.20f),
    inversePrimary = BrandColors.Lake,
)

@Composable
fun RendezvousTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit,
) {
    val palette = if (darkTheme) DarkPalette else LightPalette
    val colorScheme = if (darkTheme) darkScheme(palette) else lightScheme(palette)

    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            WindowCompat.getInsetsController(window, view).apply {
                isAppearanceLightStatusBars = !darkTheme
                isAppearanceLightNavigationBars = !darkTheme
            }
        }
    }

    CompositionLocalProvider(LocalBrandPalette provides palette) {
        MaterialTheme(
            colorScheme = colorScheme,
            typography = RenTypography,
            content = content,
        )
    }
}

/**
 * iOS Ren uses system serif (New York) for large hero titles.
 * Android mirrors with [FontFamily.Serif] on display / large headlines.
 */
private val RenTypography = Typography(
    displayLarge = TextStyle(
        fontFamily = FontFamily.Serif,
        fontWeight = FontWeight.SemiBold,
        fontSize = 34.sp,
        lineHeight = 40.sp,
        letterSpacing = 0.sp,
    ),
    displayMedium = TextStyle(
        fontFamily = FontFamily.Serif,
        fontWeight = FontWeight.SemiBold,
        fontSize = 28.sp,
        lineHeight = 34.sp,
        letterSpacing = 0.sp,
    ),
    displaySmall = TextStyle(
        fontFamily = FontFamily.Serif,
        fontWeight = FontWeight.SemiBold,
        fontSize = 24.sp,
        lineHeight = 30.sp,
        letterSpacing = 0.sp,
    ),
    headlineLarge = TextStyle(
        fontFamily = FontFamily.Serif,
        fontWeight = FontWeight.SemiBold,
        fontSize = 28.sp,
        lineHeight = 34.sp,
        letterSpacing = 0.sp,
    ),
    headlineMedium = TextStyle(
        fontFamily = FontFamily.Serif,
        fontWeight = FontWeight.SemiBold,
        fontSize = 24.sp,
        lineHeight = 30.sp,
        letterSpacing = 0.sp,
    ),
    headlineSmall = TextStyle(
        fontFamily = FontFamily.Default,
        fontWeight = FontWeight.SemiBold,
        fontSize = 22.sp,
        lineHeight = 28.sp,
        letterSpacing = 0.sp,
    ),
    titleLarge = TextStyle(
        fontFamily = FontFamily.Default,
        fontWeight = FontWeight.SemiBold,
        fontSize = 20.sp,
        lineHeight = 26.sp,
        letterSpacing = 0.sp,
    ),
    titleMedium = TextStyle(
        fontFamily = FontFamily.Default,
        fontWeight = FontWeight.SemiBold,
        fontSize = 16.sp,
        lineHeight = 22.sp,
        letterSpacing = 0.1.sp,
    ),
    titleSmall = TextStyle(
        fontFamily = FontFamily.Default,
        fontWeight = FontWeight.Medium,
        fontSize = 14.sp,
        lineHeight = 20.sp,
        letterSpacing = 0.1.sp,
    ),
    bodyLarge = TextStyle(
        fontFamily = FontFamily.Default,
        fontWeight = FontWeight.Normal,
        fontSize = 16.sp,
        lineHeight = 24.sp,
        letterSpacing = 0.15.sp,
    ),
    bodyMedium = TextStyle(
        fontFamily = FontFamily.Default,
        fontWeight = FontWeight.Normal,
        fontSize = 14.sp,
        lineHeight = 20.sp,
        letterSpacing = 0.15.sp,
    ),
    bodySmall = TextStyle(
        fontFamily = FontFamily.Default,
        fontWeight = FontWeight.Normal,
        fontSize = 12.sp,
        lineHeight = 16.sp,
        letterSpacing = 0.2.sp,
    ),
    labelLarge = TextStyle(
        fontFamily = FontFamily.Default,
        fontWeight = FontWeight.Medium,
        fontSize = 14.sp,
        lineHeight = 20.sp,
        letterSpacing = 0.1.sp,
    ),
    labelMedium = TextStyle(
        fontFamily = FontFamily.Default,
        fontWeight = FontWeight.Medium,
        fontSize = 12.sp,
        lineHeight = 16.sp,
        letterSpacing = 0.3.sp,
    ),
    labelSmall = TextStyle(
        fontFamily = FontFamily.Default,
        fontWeight = FontWeight.Medium,
        fontSize = 11.sp,
        lineHeight = 16.sp,
        letterSpacing = 0.3.sp,
    ),
)
