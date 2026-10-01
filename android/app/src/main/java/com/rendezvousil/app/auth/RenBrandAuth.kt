package com.rendezvousil.app.auth

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.Chat
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material.icons.outlined.People
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.graphics.Color
import com.braddcorp.auth.BrandAuthConfig
import com.braddcorp.auth.BrandFeature
import com.rendezvousil.app.BuildConfig
import com.rendezvousil.app.theme.BrandColors
import com.rendezvousil.core.network.AppConfig

/** Rendezvous branding for the BraddCorp Android auth kit — mirrors iOS WelcomeHubView. */
@Composable
fun rememberRenBrandAuth(): BrandAuthConfig {
    val surface = BrandColors.GroupedBackground
    val card = BrandColors.SecondaryGroupedBackground
    val ink = MaterialTheme.colorScheme.onBackground
    val muted = MaterialTheme.colorScheme.onSurfaceVariant
    val cardBorder = BrandColors.CardBorder
    val warmSurface = BrandColors.WarmSurface
    val badgeInk = BrandColors.CoralInk
    val year = AppConfig.eventYearLabel
    val resetUrl = "${BuildConfig.BASE_URL.trimEnd('/')}/sign-in/forgot-password"
    return remember(surface, card, ink, muted, cardBorder, warmSurface, badgeInk, year, resetUrl) {
        BrandAuthConfig(
            appName = "Rendezvous",
            primary = BrandColors.Lake,
            onPrimary = Color.White,
            surface = surface,
            card = card,
            ink = ink,
            muted = muted,
            cardBorder = cardBorder,
            warmSurface = warmSurface,
            badgeInk = badgeInk,
            logoResId = null,
            heroTitle = "Rendezvous $year",
            heroSubtitle = "Your retreat community",
            heroMeta = "${AppConfig.EVENT_DATES} · ${AppConfig.LOCATION}",
            heroBadge = "Bible Bowl: ${AppConfig.THEME}",
            gateSectionTitle = "Sign in",
            gateHelper = "Use the same email and password as rendezvousil.com. This app is for families registered for Rendezvous.",
            gateButton = "Sign in",
            features = listOf(
                // Outline icons match iOS SF Symbols style on WelcomeHub
                BrandFeature("Schedule & updates during retreat week", Icons.Outlined.CalendarMonth),
                BrandFeature("Year group chat with other families", Icons.AutoMirrored.Outlined.Chat),
                BrandFeature("Family directory & your profile", Icons.Outlined.People),
            ),
            contactEmail = "Stephen@Bradd.us",
            passwordResetUrl = resetUrl,
            allowSignUp = true,
            sheetTitle = "Sign in",
            showNavTitle = true,
        )
    }
}
