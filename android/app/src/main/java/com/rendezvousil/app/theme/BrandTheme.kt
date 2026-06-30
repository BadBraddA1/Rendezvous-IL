package com.rendezvousil.app.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

object BrandColors {
    val Lake = Color(0.22f, 0.55f, 0.52f)
    val LakeLight = Color(0.88f, 0.95f, 0.94f)
    val Coral = Color(0.78f, 0.45f, 0.32f)
    val CoralInk = Color(0.55f, 0.28f, 0.18f)
    val WarmSurface = Color(0.98f, 0.96f, 0.93f)
    val CardBorder = Color(0.88f, 0.90f, 0.91f)
    val GroupedBackground = Color(0.95f, 0.95f, 0.97f)
    val SecondaryGroupedBackground = Color(0.99f, 0.99f, 0.99f)
}

private val LightColorScheme = lightColorScheme(
    primary = BrandColors.Lake,
    onPrimary = Color.White,
    secondary = BrandColors.Coral,
    onSecondary = Color.White,
    tertiary = BrandColors.CoralInk,
    background = BrandColors.GroupedBackground,
    surface = BrandColors.SecondaryGroupedBackground,
    onBackground = Color(0.1f, 0.1f, 0.1f),
    onSurface = Color(0.1f, 0.1f, 0.1f),
)

private val DarkColorScheme = darkColorScheme(
    primary = BrandColors.Lake,
    secondary = BrandColors.Coral,
)

@Composable
fun RendezvousTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit,
) {
    MaterialTheme(
        colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme,
        content = content,
    )
}
