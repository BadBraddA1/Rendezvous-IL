package com.braddcorp.auth

import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme

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
        Text(
            text = config.sheetTitle,
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.SemiBold,
            color = config.ink,
            modifier = Modifier.padding(horizontal = 20.dp, vertical = 4.dp),
        )
        NativeAuthFlow(
            config = config,
            onAuthenticated = {
                onAuthenticated()
                onDismiss()
            },
            modifier = Modifier
                .fillMaxWidth()
                .heightIn(min = 320.dp)
                .verticalScroll(rememberScrollState()),
        )
    }
}
