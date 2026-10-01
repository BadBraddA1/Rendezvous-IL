package com.braddcorp.auth

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AuthBottomSheet(
    config: BrandAuthConfig,
    onDismiss: () -> Unit,
    onAuthenticated: () -> Unit,
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        containerColor = config.surface,
    ) {
        // iOS ClerkAuthSheet: Close (leading) + centered "Sign in" title
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 12.dp, vertical = 4.dp),
        ) {
            OutlinedButton(
                onClick = onDismiss,
                modifier = Modifier.align(Alignment.CenterStart),
                shape = RoundedCornerShape(percent = 50),
                // iOS: hairline gray stroke, teal label (not a filled/primary outline)
                border = BorderStroke(1.dp, config.cardBorder),
                colors = androidx.compose.material3.ButtonDefaults.outlinedButtonColors(
                    contentColor = config.primary,
                ),
            ) {
                Text("Close", color = config.primary)
            }
            Text(
                text = config.sheetTitle,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
                color = config.ink,
                modifier = Modifier.align(Alignment.Center),
            )
        }
        NativeAuthFlow(
            config = config,
            onAuthenticated = {
                onAuthenticated()
                onDismiss()
            },
            modifier = Modifier
                .fillMaxWidth()
                .heightIn(min = 320.dp)
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp)
                .padding(bottom = 28.dp),
        )
    }
}
