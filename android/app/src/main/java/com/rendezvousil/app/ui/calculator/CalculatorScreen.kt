package com.rendezvousil.app.ui.calculator

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.selection.selectableGroup
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.IconButton
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.rendezvousil.app.di.RendezvousViewModelFactory
import com.rendezvousil.app.theme.BrandColors
import com.rendezvousil.core.network.AppConfig
import com.rendezvousil.core.schedule.model.LodgingType
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CalculatorScreen(
    viewModelFactory: RendezvousViewModelFactory,
    onBack: (() -> Unit)? = null,
) {
    val viewModel: CalculatorViewModel = viewModel(factory = viewModelFactory)
    val rates by viewModel.rates.collectAsState()
    val adults by viewModel.adults.collectAsState()
    val youth by viewModel.youth.collectAsState()
    val children by viewModel.children.collectAsState()
    val lodging by viewModel.lodging.collectAsState()
    val breakdown = viewModel.calculation()
    val registrationFee = viewModel.registrationFee()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Cost calculator") },
                navigationIcon = {
                    if (onBack != null) {
                        IconButton(onClick = onBack) {
                            Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                        }
                    }
                },
            )
        },
        containerColor = BrandColors.GroupedBackground,
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            if (rates == null) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    CircularProgressIndicator(modifier = Modifier.padding(4.dp), color = BrandColors.Lake)
                    Text("Loading rates…", color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }

            FormSection(title = "Family") {
                StepperRow(
                    label = "Adults: $adults",
                    onDecrement = { viewModel.setAdults(adults - 1) },
                    onIncrement = { viewModel.setAdults(adults + 1) },
                    canDecrement = adults > 1,
                    canIncrement = adults < 12,
                )
                StepperRow(
                    label = "Youth (12–17): $youth",
                    onDecrement = { viewModel.setYouth(youth - 1) },
                    onIncrement = { viewModel.setYouth(youth + 1) },
                    canDecrement = youth > 0,
                    canIncrement = youth < 12,
                )
                StepperRow(
                    label = "Children (3–11): $children",
                    onDecrement = { viewModel.setChildren(children - 1) },
                    onIncrement = { viewModel.setChildren(children + 1) },
                    canDecrement = children > 0,
                    canIncrement = children < 12,
                )
            }

            FormSection(title = "Lodging") {
                SingleChoiceSegmentedButtonRow(modifier = Modifier.fillMaxWidth().selectableGroup()) {
                    LodgingType.allCases.forEachIndexed { index, type ->
                        SegmentedButton(
                            selected = lodging == type,
                            onClick = { viewModel.setLodging(type) },
                            shape = SegmentedButtonDefaults.itemShape(
                                index = index,
                                count = LodgingType.allCases.size,
                            ),
                        ) {
                            Text(type.label, style = MaterialTheme.typography.labelSmall)
                        }
                    }
                }
            }

            FormSection(title = "Estimated total") {
                if (breakdown != null) {
                    if (adults > 0) {
                        TotalRow(
                            label = "${adults} × ${formatMoney(breakdown.adultUnit)} per person",
                            value = formatMoney(breakdown.adults),
                        )
                    }
                    if (youth > 0) {
                        TotalRow(
                            label = "${youth} × ${formatMoney(breakdown.youthUnit)} per person",
                            value = formatMoney(breakdown.youth),
                        )
                    }
                    if (children > 0) {
                        TotalRow(
                            label = "${children} × ${formatMoney(breakdown.childUnit)} per person",
                            value = formatMoney(breakdown.children),
                        )
                    }
                    if (breakdown.siteFee > 0) {
                        val nightLabel = if (viewModel.nights == 1) "night" else "nights"
                        TotalRow(
                            label = "${formatMoney(breakdown.siteNightRate)}/night × ${viewModel.nights} $nightLabel (per site)",
                            value = formatMoney(breakdown.siteFee),
                        )
                    }
                    if (registrationFee > 0) {
                        TotalRow(label = "Registration", value = formatMoney(registrationFee))
                    }
                    HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))
                    TotalRow(
                        label = "Total",
                        value = formatMoney(breakdown.total + registrationFee),
                        emphasized = true,
                    )
                } else {
                    Text(
                        "Rates unavailable — check connection and try again.",
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }

            Text(
                text = "Estimate only. Final pricing may vary. Registration opens ${AppConfig.REGISTRATION_OPENS}.",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

@Composable
private fun FormSection(
    title: String,
    content: @Composable () -> Unit,
) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = MaterialTheme.shapes.medium,
        color = BrandColors.SecondaryGroupedBackground,
    ) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text(title, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
            content()
        }
    }
}

@Composable
private fun StepperRow(
    label: String,
    onDecrement: () -> Unit,
    onIncrement: () -> Unit,
    canDecrement: Boolean,
    canIncrement: Boolean,
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(label, style = MaterialTheme.typography.bodyLarge)
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            IconButton(onClick = onDecrement, enabled = canDecrement) {
                Text("−", style = MaterialTheme.typography.titleLarge)
            }
            IconButton(onClick = onIncrement, enabled = canIncrement) {
                Text("+", style = MaterialTheme.typography.titleLarge)
            }
        }
    }
}

@Composable
private fun TotalRow(
    label: String,
    value: String,
    emphasized: Boolean = false,
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        Text(
            text = label,
            modifier = Modifier.weight(1f).padding(end = 8.dp),
            style = if (emphasized) MaterialTheme.typography.titleSmall else MaterialTheme.typography.bodyMedium,
            fontWeight = if (emphasized) FontWeight.Bold else FontWeight.Normal,
            color = if (emphasized) BrandColors.Lake else MaterialTheme.colorScheme.onSurface,
        )
        Text(
            text = value,
            style = if (emphasized) MaterialTheme.typography.titleSmall else MaterialTheme.typography.bodyMedium,
            fontWeight = if (emphasized) FontWeight.Bold else FontWeight.Normal,
            color = if (emphasized) BrandColors.Lake else MaterialTheme.colorScheme.onSurface,
        )
    }
}

private fun formatMoney(value: Double): String =
    String.format(Locale.US, "$%.2f", value)
