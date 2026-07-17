package com.rendezvousil.app.ui.home

import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Chat
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.Groups
import androidx.compose.material.icons.filled.HelpOutline
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.AttachMoney
import androidx.compose.material.icons.filled.Place
import androidx.compose.material.icons.filled.Restaurant
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.rendezvousil.app.theme.BrandColors
import com.rendezvousil.app.ui.components.PlanningRow
import com.rendezvousil.app.ui.components.QuickActionButton
import com.rendezvousil.core.network.AppConfig

private data class FactItem(
    val title: String,
    val detail: String,
    val icon: @Composable () -> Unit,
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(
    onNavigateToSchedule: () -> Unit,
    onNavigateToUpdates: () -> Unit,
    onNavigateToChat: () -> Unit = {},
    onNavigateToDirectory: () -> Unit = {},
    onNavigateToFaq: () -> Unit,
    onNavigateToCalculator: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val facts = listOf(
        FactItem("5 days / 4 nights", "Fellowship, worship, recreation, and encouragement.") {
            Icon(Icons.Default.CalendarMonth, null, tint = BrandColors.Lake)
        },
        FactItem("Lake Williamson", "Lodging, dining, and recreation on site.") {
            Icon(Icons.Default.Place, null, tint = BrandColors.Lake)
        },
        FactItem("All ages welcome", "A family retreat with activities for every age.") {
            Icon(Icons.Default.Groups, null, tint = BrandColors.Lake)
        },
        FactItem("Meals included", "Buffet-style dining — no cooking or cleanup.") {
            Icon(Icons.Default.Restaurant, null, tint = BrandColors.Lake)
        },
    )

    Scaffold(
        modifier = modifier,
        topBar = {
            TopAppBar(title = { Text("Rendezvous") })
        },
        containerColor = BrandColors.GroupedBackground,
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp, vertical = 16.dp),
            verticalArrangement = Arrangement.spacedBy(24.dp),
        ) {
            HeroCard()
            CountdownCard()
            QuickActionsSection(
                onNavigateToSchedule = onNavigateToSchedule,
                onNavigateToChat = onNavigateToChat,
                onNavigateToDirectory = onNavigateToDirectory,
                onNavigateToUpdates = onNavigateToUpdates,
                onNavigateToFaq = onNavigateToFaq,
                onNavigateToCalculator = onNavigateToCalculator,
            )
            FactsSection(facts = facts)
            PlanningSection()
        }
    }
}

@Composable
private fun HeroCard() {
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .border(1.dp, BrandColors.Lake.copy(alpha = 0.2f), RoundedCornerShape(16.dp)),
        shape = RoundedCornerShape(16.dp),
        color = BrandColors.LakeLight,
    ) {
        Column(
            modifier = Modifier.padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Text(
                text = "Rendezvous ${AppConfig.EVENT_YEAR}",
                style = MaterialTheme.typography.headlineLarge,
                fontFamily = FontFamily.Serif,
                fontWeight = FontWeight.SemiBold,
                color = BrandColors.Lake,
            )
            Text(
                text = "Christian Homeschool Family Retreat",
                style = MaterialTheme.typography.titleMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Text(
                text = AppConfig.EVENT_DATES,
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.Bold,
                color = BrandColors.CoralInk,
            )
            Text(
                text = AppConfig.LOCATION,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

@Composable
private fun CountdownCard() {
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .border(1.dp, BrandColors.Coral.copy(alpha = 0.25f), RoundedCornerShape(12.dp)),
        shape = RoundedCornerShape(12.dp),
        color = BrandColors.WarmSurface,
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Icon(Icons.Default.Notifications, null, tint = BrandColors.Lake)
                Text(
                    text = "Registration opens ${AppConfig.REGISTRATION_OPENS}",
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold,
                    color = BrandColors.Lake,
                )
            }
            Text(
                text = "Plan ahead for ${AppConfig.EVENT_YEAR}. Theme: ${AppConfig.THEME} (Bible Bowl).",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

@Composable
private fun QuickActionsSection(
    onNavigateToSchedule: () -> Unit,
    onNavigateToChat: () -> Unit,
    onNavigateToDirectory: () -> Unit,
    onNavigateToUpdates: () -> Unit,
    onNavigateToFaq: () -> Unit,
    onNavigateToCalculator: () -> Unit,
) {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text("Quick links", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            QuickActionButton(
                title = "Schedule",
                icon = { Icon(Icons.Default.CalendarMonth, null, tint = BrandColors.Lake, modifier = Modifier.size(28.dp)) },
                color = BrandColors.Lake,
                onClick = onNavigateToSchedule,
                modifier = Modifier.weight(1f),
            )
            QuickActionButton(
                title = "Chat",
                icon = { Icon(Icons.AutoMirrored.Filled.Chat, null, tint = BrandColors.Coral, modifier = Modifier.size(28.dp)) },
                color = BrandColors.Coral,
                onClick = onNavigateToChat,
                modifier = Modifier.weight(1f),
            )
        }
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            QuickActionButton(
                title = "Directory",
                icon = { Icon(Icons.Default.Groups, null, tint = BrandColors.Lake, modifier = Modifier.size(28.dp)) },
                color = BrandColors.Lake,
                onClick = onNavigateToDirectory,
                modifier = Modifier.weight(1f),
            )
            QuickActionButton(
                title = "Updates",
                icon = { Icon(Icons.Default.Notifications, null, tint = BrandColors.Coral, modifier = Modifier.size(28.dp)) },
                color = BrandColors.Coral,
                onClick = onNavigateToUpdates,
                modifier = Modifier.weight(1f),
            )
        }
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            QuickActionButton(
                title = "FAQ",
                icon = { Icon(Icons.Default.HelpOutline, null, tint = BrandColors.Lake, modifier = Modifier.size(28.dp)) },
                color = BrandColors.Lake,
                onClick = onNavigateToFaq,
                modifier = Modifier.weight(1f),
            )
            QuickActionButton(
                title = "Calculator",
                icon = { Icon(Icons.Default.AttachMoney, null, tint = BrandColors.Coral, modifier = Modifier.size(28.dp)) },
                color = BrandColors.Coral,
                onClick = onNavigateToCalculator,
                modifier = Modifier.weight(1f),
            )
        }
    }
}

@Composable
private fun FactsSection(facts: List<FactItem>) {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text("What to expect", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
        facts.forEach { fact ->
            Surface(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp),
                color = BrandColors.SecondaryGroupedBackground,
            ) {
                Row(
                    modifier = Modifier.padding(14.dp),
                    horizontalArrangement = Arrangement.spacedBy(14.dp),
                    verticalAlignment = Alignment.Top,
                ) {
                    fact.icon()
                    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text(
                            text = fact.title,
                            style = MaterialTheme.typography.bodyMedium,
                            fontWeight = FontWeight.SemiBold,
                        )
                        Text(
                            text = fact.detail,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun PlanningSection() {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text("2027 at a glance", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
        Surface(
            modifier = Modifier
                .fillMaxWidth()
                .border(1.dp, BrandColors.CardBorder, RoundedCornerShape(12.dp)),
            shape = RoundedCornerShape(12.dp),
            color = BrandColors.SecondaryGroupedBackground,
        ) {
            Column {
                PlanningRow(label = "Dates", value = AppConfig.EVENT_DATES)
                HorizontalDivider(modifier = Modifier.padding(start = 16.dp))
                PlanningRow(label = "Registration", value = AppConfig.REGISTRATION_OPENS)
                HorizontalDivider(modifier = Modifier.padding(start = 16.dp))
                PlanningRow(label = "Bible Bowl", value = AppConfig.THEME)
                HorizontalDivider(modifier = Modifier.padding(start = 16.dp))
                PlanningRow(label = "Location", value = "Lake Williamson, Carlinville, IL")
            }
        }
    }
}
