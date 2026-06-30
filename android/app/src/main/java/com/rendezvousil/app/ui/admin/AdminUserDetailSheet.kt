package com.rendezvousil.app.ui.admin

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import com.rendezvousil.app.BuildConfig
import com.rendezvousil.app.auth.WebLinks
import com.rendezvousil.core.network.dto.AdminUserRecord

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AdminUserDetailSheet(
    user: AdminUserRecord,
    viewModel: AdminUsersViewModel,
    onDismiss: () -> Unit,
    onDeleted: () -> Unit,
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    var currentUser by remember(user.id) { mutableStateOf(user) }
    var role by remember(user.id) { mutableStateOf(AdminUserRole.from(user.role)) }
    var firstName by remember(user.id) { mutableStateOf(user.firstName.orEmpty()) }
    var lastName by remember(user.id) { mutableStateOf(user.lastName.orEmpty()) }
    var tempPassword by remember { mutableStateOf("") }
    var signInLink by remember { mutableStateOf("") }
    var isSaving by remember { mutableStateOf(false) }
    var message by remember { mutableStateOf<String?>(null) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var showDeleteConfirm by remember { mutableStateOf(false) }
    val context = LocalContext.current

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp)
                .padding(bottom = 32.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Text(
                text = currentUser.displayName,
                style = MaterialTheme.typography.titleLarge,
            )

            SectionLabel("Account")
            OutlinedTextField(
                value = currentUser.email,
                onValueChange = {},
                readOnly = true,
                label = { Text("Email") },
                modifier = Modifier.fillMaxWidth(),
            )
            OutlinedTextField(
                value = firstName,
                onValueChange = { firstName = it },
                label = { Text("First name") },
                modifier = Modifier.fillMaxWidth(),
                enabled = !isSaving,
            )
            OutlinedTextField(
                value = lastName,
                onValueChange = { lastName = it },
                label = { Text("Last name") },
                modifier = Modifier.fillMaxWidth(),
                enabled = !isSaving,
            )
            RolePicker(
                selected = role,
                onSelected = { role = it },
                enabled = !isSaving,
            )

            SectionLabel("Activity")
            DetailRow("Last seen", currentUser.bestLastSeenLabel() ?: "Never")
            DetailRow("Platform", UserPlatformLabel.text(currentUser.lastPlatform))
            DetailRow("Visits", currentUser.visitCount.toString())
            currentUser.lastAppVersion?.takeIf { it.isNotEmpty() }?.let { version ->
                DetailRow("App version", version)
            }

            SectionLabel("Password")
            OutlinedTextField(
                value = tempPassword,
                onValueChange = { tempPassword = it },
                label = { Text("New temporary password") },
                visualTransformation = PasswordVisualTransformation(),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                modifier = Modifier.fillMaxWidth(),
                enabled = !isSaving,
            )
            OutlinedButton(
                onClick = {
                    isSaving = true
                    message = null
                    errorMessage = null
                    viewModel.resetAdminUserPassword(
                        userId = currentUser.id,
                        mode = "set",
                        password = tempPassword,
                        onSuccess = {
                            isSaving = false
                            tempPassword = ""
                            message = "Password updated."
                        },
                        onError = {
                            isSaving = false
                            errorMessage = it
                        },
                    )
                },
                enabled = !isSaving && tempPassword.length >= 8,
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text("Set password")
            }
            OutlinedButton(
                onClick = {
                    isSaving = true
                    message = null
                    errorMessage = null
                    viewModel.resetAdminUserPassword(
                        userId = currentUser.id,
                        mode = "link",
                        password = null,
                        onSuccess = { url ->
                            isSaving = false
                            if (url != null) {
                                signInLink = url
                                copyToClipboard(context, url)
                                message = "Sign-in link copied."
                            }
                        },
                        onError = {
                            isSaving = false
                            errorMessage = it
                        },
                    )
                },
                enabled = !isSaving,
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text("Copy sign-in link")
            }
            TextButton(
                onClick = {
                    WebLinks.open(
                        context,
                        WebLinks.url(BuildConfig.BASE_URL, "/sign-in/forgot-password"),
                    )
                },
            ) {
                Text("Forgot password on web")
            }

            OutlinedButton(
                onClick = {
                    isSaving = true
                    message = null
                    errorMessage = null
                    viewModel.updateAdminUserBan(
                        user = currentUser,
                        onSuccess = { updated ->
                            isSaving = false
                            currentUser = updated
                            message = if (updated.banned) "User banned." else "User unbanned."
                        },
                        onError = {
                            isSaving = false
                            errorMessage = it
                        },
                    )
                },
                enabled = !isSaving,
                modifier = Modifier.fillMaxWidth(),
                colors = if (!currentUser.banned) {
                    ButtonDefaults.outlinedButtonColors(contentColor = MaterialTheme.colorScheme.error)
                } else {
                    ButtonDefaults.outlinedButtonColors()
                },
            ) {
                Text(if (currentUser.banned) "Unban user" else "Ban user")
            }
            OutlinedButton(
                onClick = { showDeleteConfirm = true },
                enabled = !isSaving,
                modifier = Modifier.fillMaxWidth(),
                colors = ButtonDefaults.outlinedButtonColors(contentColor = MaterialTheme.colorScheme.error),
            ) {
                Text("Delete user")
            }

            message?.let {
                Text(text = it, color = MaterialTheme.colorScheme.primary, style = MaterialTheme.typography.bodySmall)
            }
            errorMessage?.let {
                Text(text = it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
            }
            if (signInLink.isNotEmpty()) {
                SectionLabel("Sign-in link")
                Text(text = signInLink, style = MaterialTheme.typography.bodySmall)
            }

            Button(
                onClick = {
                    isSaving = true
                    message = null
                    errorMessage = null
                    viewModel.updateAdminUserRole(
                        userId = currentUser.id,
                        role = role,
                        firstName = firstName,
                        lastName = lastName,
                        onSuccess = { updated ->
                            isSaving = false
                            currentUser = updated
                            message = "User updated."
                        },
                        onError = {
                            isSaving = false
                            errorMessage = it
                        },
                    )
                },
                enabled = !isSaving,
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text("Save")
            }
            TextButton(onClick = onDismiss, modifier = Modifier.fillMaxWidth()) {
                Text("Close")
            }
        }
    }

    if (showDeleteConfirm) {
        AlertDialog(
            onDismissRequest = { showDeleteConfirm = false },
            title = { Text("Delete ${currentUser.email}?") },
            text = { Text("This permanently removes the Clerk account.") },
            confirmButton = {
                TextButton(
                    onClick = {
                        showDeleteConfirm = false
                        isSaving = true
                        viewModel.deleteAdminUser(
                            userId = currentUser.id,
                            onSuccess = {
                                isSaving = false
                                onDeleted()
                            },
                            onError = {
                                isSaving = false
                                errorMessage = it
                            },
                        )
                    },
                ) {
                    Text("Delete", color = MaterialTheme.colorScheme.error)
                }
            },
            dismissButton = {
                TextButton(onClick = { showDeleteConfirm = false }) {
                    Text("Cancel")
                }
            },
        )
    }
}

@Composable
private fun SectionLabel(text: String) {
    Text(
        text = text,
        style = MaterialTheme.typography.labelLarge,
        modifier = Modifier.padding(top = 8.dp),
    )
}

@Composable
private fun DetailRow(label: String, value: String) {
    Column(modifier = Modifier.fillMaxWidth()) {
        Text(text = label, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(text = value, style = MaterialTheme.typography.bodyMedium)
    }
}

@Composable
internal fun RolePicker(
    selected: AdminUserRole,
    onSelected: (AdminUserRole) -> Unit,
    enabled: Boolean,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier, verticalArrangement = Arrangement.spacedBy(4.dp)) {
        Text(text = "Role", style = MaterialTheme.typography.labelMedium)
        AdminUserRole.selectableRoles.forEach { option ->
            OutlinedButton(
                onClick = { onSelected(option) },
                enabled = enabled,
                modifier = Modifier.fillMaxWidth(),
                colors = if (option == selected) {
                    ButtonDefaults.outlinedButtonColors(containerColor = MaterialTheme.colorScheme.primaryContainer)
                } else {
                    ButtonDefaults.outlinedButtonColors()
                },
            ) {
                Text(option.label)
            }
        }
    }
}

private fun copyToClipboard(context: Context, text: String) {
    val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
    clipboard.setPrimaryClip(ClipData.newPlainText("Sign-in link", text))
}
