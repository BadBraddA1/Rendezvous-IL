package com.rendezvousil.app.auth

import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.graphics.Color
import com.braddcorp.auth.BrandAuthConfig
import com.rendezvousil.app.R
import com.rendezvousil.app.theme.BrandColors
import com.rendezvousil.core.network.AppConfig

/** Rendezvous branding for the BraddCorp Android auth kit. */
@Composable
fun rememberRenBrandAuth(): BrandAuthConfig {
    val surface = BrandColors.GroupedBackground
    val card = BrandColors.SecondaryGroupedBackground
    val ink = MaterialTheme.colorScheme.onBackground
    val muted = MaterialTheme.colorScheme.onSurfaceVariant
    val year = AppConfig.eventYearLabel
    return remember(surface, card, ink, muted, year) {
        BrandAuthConfig(
            appName = "Rendezvous",
            primary = BrandColors.Lake,
            onPrimary = Color.White,
            surface = surface,
            card = card,
            ink = ink,
            muted = muted,
            logoResId = R.drawable.rendezvous_logo,
            heroTitle = "Rendezvous $year",
            heroSubtitle = "Your retreat community",
            heroMeta = "${AppConfig.EVENT_DATES} · ${AppConfig.LOCATION}",
            heroBadge = "Bible Bowl: ${AppConfig.THEME}",
            gateSectionTitle = "Sign in",
            gateHelper = "Use the same email and password as rendezvousil.com. This app is for families registered for Rendezvous.",
            gateButton = "Sign in",
            features = listOf(
                "Schedule & updates during retreat week",
                "Year group chat with other families",
                "Family directory & your profile",
            ),
            contactEmail = "info@rendezvousil.com",
            allowSignUp = true,
            sheetTitle = "Sign in",
        )
    }
}
