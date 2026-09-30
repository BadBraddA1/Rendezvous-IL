package com.braddcorp.auth

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import com.clerk.api.Clerk
import com.clerk.api.network.model.error.ClerkErrorResponse
import com.clerk.api.network.model.error.firstMessage
import com.clerk.api.network.serialization.ClerkResult
import com.clerk.api.signin.SignIn
import com.clerk.api.signin.attemptFirstFactor
import com.clerk.api.signin.attemptSecondFactor
import com.clerk.api.signin.sendEmailCode
import com.clerk.api.signin.sendMfaEmailCode
import com.clerk.api.signin.verifyWithPassword
import com.clerk.api.signup.SignUp
import com.clerk.api.signup.attemptVerification
import com.clerk.api.signup.prepareVerification
import kotlinx.coroutines.launch

/** Fully native Clerk email / password / email-code — no `AuthView` chrome. */
@Composable
fun NativeAuthFlow(
    config: BrandAuthConfig,
    onAuthenticated: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val scope = rememberCoroutineScope()
    var step by remember { mutableStateOf(AuthStep.Identifier) }
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var code by remember { mutableStateOf("") }
    var isWorking by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var activeSignIn by remember { mutableStateOf<SignIn?>(null) }
    var activeSignUp by remember { mutableStateOf<SignUp?>(null) }
    var isSignUp by remember { mutableStateOf(false) }

    val fieldColors = OutlinedTextFieldDefaults.colors(
        focusedBorderColor = config.primary,
        cursorColor = config.primary,
        focusedLabelColor = config.primary,
    )

    fun run(block: suspend () -> Unit) {
        scope.launch {
            isWorking = true
            errorMessage = null
            try {
                block()
            } catch (t: Throwable) {
                errorMessage = t.message ?: "Something went wrong."
            } finally {
                isWorking = false
            }
        }
    }

    suspend fun finishWithSession(sessionId: String?) {
        val id = sessionId
        if (id != null) {
            when (val result = Clerk.auth.setActive(sessionId = id)) {
                is ClerkResult.Success -> {
                    onAuthenticated()
                    return
                }
                is ClerkResult.Failure -> {
                    errorMessage = clerkFailureMessage(result)
                    return
                }
            }
        }
        if (Clerk.session != null) onAuthenticated()
    }

    suspend fun advanceSignIn(signIn: SignIn) {
        activeSignIn = signIn
        activeSignUp = null
        when (signIn.status) {
            SignIn.Status.COMPLETE -> finishWithSession(signIn.createdSessionId)
            SignIn.Status.NEEDS_FIRST_FACTOR -> {
                val factors = signIn.supportedFirstFactors.orEmpty()
                when {
                    factors.any { it.strategy == "password" } -> {
                        step = AuthStep.Password
                        password = ""
                    }
                    factors.any { it.strategy == "email_code" } -> {
                        when (val prepared = signIn.sendEmailCode()) {
                            is ClerkResult.Success -> {
                                activeSignIn = prepared.value
                                step = AuthStep.EmailCode
                                code = ""
                            }
                            is ClerkResult.Failure -> errorMessage = clerkFailureMessage(prepared)
                        }
                    }
                    else -> errorMessage = "No supported sign-in method for this account."
                }
            }
            SignIn.Status.NEEDS_SECOND_FACTOR, SignIn.Status.NEEDS_CLIENT_TRUST -> {
                val factors = signIn.supportedSecondFactors.orEmpty()
                when {
                    factors.any { it.strategy == "email_code" } -> {
                        when (val prepared = signIn.sendMfaEmailCode()) {
                            is ClerkResult.Success -> {
                                activeSignIn = prepared.value
                                step = AuthStep.EmailCodeSecond
                                code = ""
                            }
                            is ClerkResult.Failure -> errorMessage = clerkFailureMessage(prepared)
                        }
                    }
                    factors.any { it.strategy == "totp" } -> {
                        step = AuthStep.Totp
                        code = ""
                    }
                    else -> errorMessage = "Two-step verification required — finish on the website."
                }
            }
            else -> errorMessage = "Could not continue sign-in. Try again."
        }
    }

    suspend fun advanceSignUp(signUp: SignUp) {
        activeSignUp = signUp
        activeSignIn = null
        when (signUp.status) {
            SignUp.Status.COMPLETE -> finishWithSession(signUp.createdSessionId)
            SignUp.Status.MISSING_REQUIREMENTS -> {
                if (signUp.unverifiedFields.contains("email_address")) {
                    when (
                        val prepared = signUp.prepareVerification(
                            SignUp.PrepareVerificationParams.Strategy.EmailCode(),
                        )
                    ) {
                        is ClerkResult.Success -> {
                            activeSignUp = prepared.value
                            step = AuthStep.EmailCode
                            code = ""
                        }
                        is ClerkResult.Failure -> errorMessage = clerkFailureMessage(prepared)
                    }
                } else {
                    errorMessage = "More details required — finish setup on the website."
                }
            }
            else -> errorMessage = "Sign-up could not continue. Try again."
        }
    }

    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 20.dp, vertical = 12.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Text(
            text = stepTitle(step, isSignUp),
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.SemiBold,
            color = config.ink,
        )
        Text(
            text = stepSubtitle(step, email),
            style = MaterialTheme.typography.bodyMedium,
            color = config.muted,
        )

        when (step) {
            AuthStep.Identifier -> OutlinedTextField(
                value = email,
                onValueChange = { email = it },
                modifier = Modifier.fillMaxWidth(),
                label = { Text("Email") },
                singleLine = true,
                keyboardOptions = KeyboardOptions(
                    keyboardType = KeyboardType.Email,
                    imeAction = ImeAction.Go,
                ),
                keyboardActions = KeyboardActions(onGo = {
                    run {
                        submitIdentifier(
                            email = email,
                            allowSignUp = config.allowSignUp,
                            onSignIn = { advanceSignIn(it) },
                            onBeginSignUp = {
                                isSignUp = true
                                step = AuthStep.CreatePassword
                                password = ""
                            },
                            onError = { errorMessage = it },
                        )
                    }
                }),
                colors = fieldColors,
            )
            AuthStep.Password, AuthStep.CreatePassword -> OutlinedTextField(
                value = password,
                onValueChange = { password = it },
                modifier = Modifier.fillMaxWidth(),
                label = { Text(if (step == AuthStep.CreatePassword) "Create password" else "Password") },
                singleLine = true,
                visualTransformation = PasswordVisualTransformation(),
                keyboardOptions = KeyboardOptions(
                    keyboardType = KeyboardType.Password,
                    imeAction = ImeAction.Go,
                ),
                colors = fieldColors,
            )
            AuthStep.EmailCode, AuthStep.EmailCodeSecond, AuthStep.Totp -> OutlinedTextField(
                value = code,
                onValueChange = { code = it },
                modifier = Modifier.fillMaxWidth(),
                label = { Text(if (step == AuthStep.Totp) "Authenticator code" else "Email code") },
                singleLine = true,
                keyboardOptions = KeyboardOptions(
                    keyboardType = KeyboardType.Number,
                    imeAction = ImeAction.Go,
                ),
                colors = fieldColors,
            )
        }

        errorMessage?.let {
            Text(it, color = config.danger, style = MaterialTheme.typography.bodySmall)
        }

        Button(
            onClick = {
                run {
                    when (step) {
                        AuthStep.Identifier -> submitIdentifier(
                            email = email,
                            allowSignUp = config.allowSignUp,
                            onSignIn = { advanceSignIn(it) },
                            onBeginSignUp = {
                                isSignUp = true
                                step = AuthStep.CreatePassword
                                password = ""
                            },
                            onError = { errorMessage = it },
                        )
                        AuthStep.Password -> {
                            val signIn = activeSignIn ?: return@run
                            when (val result = signIn.verifyWithPassword(password)) {
                                is ClerkResult.Success -> advanceSignIn(result.value)
                                is ClerkResult.Failure -> errorMessage = clerkFailureMessage(result)
                            }
                        }
                        AuthStep.CreatePassword -> {
                            if (password.length < 8) {
                                errorMessage = "Password must be at least 8 characters."
                                return@run
                            }
                            when (
                                val result = Clerk.auth.signUp {
                                    this.email = email.trim().lowercase()
                                    this.password = password
                                }
                            ) {
                                is ClerkResult.Success -> advanceSignUp(result.value)
                                is ClerkResult.Failure -> errorMessage = clerkFailureMessage(result)
                            }
                        }
                        AuthStep.EmailCode -> {
                            val signUp = activeSignUp
                            val signIn = activeSignIn
                            when {
                                signUp != null -> when (
                                    val result = signUp.attemptVerification(
                                        SignUp.AttemptVerificationParams.EmailCode(code = code),
                                    )
                                ) {
                                    is ClerkResult.Success -> advanceSignUp(result.value)
                                    is ClerkResult.Failure -> errorMessage = clerkFailureMessage(result)
                                }
                                signIn != null -> when (
                                    val result = signIn.attemptFirstFactor(
                                        SignIn.AttemptFirstFactorParams.EmailCode(code = code),
                                    )
                                ) {
                                    is ClerkResult.Success -> advanceSignIn(result.value)
                                    is ClerkResult.Failure -> errorMessage = clerkFailureMessage(result)
                                }
                            }
                        }
                        AuthStep.EmailCodeSecond -> {
                            val signIn = activeSignIn ?: return@run
                            when (
                                val result = signIn.attemptSecondFactor(
                                    SignIn.AttemptSecondFactorParams.EmailCode(code = code),
                                )
                            ) {
                                is ClerkResult.Success -> advanceSignIn(result.value)
                                is ClerkResult.Failure -> errorMessage = clerkFailureMessage(result)
                            }
                        }
                        AuthStep.Totp -> {
                            val signIn = activeSignIn ?: return@run
                            when (
                                val result = signIn.attemptSecondFactor(
                                    SignIn.AttemptSecondFactorParams.TOTP(code = code),
                                )
                            ) {
                                is ClerkResult.Success -> advanceSignIn(result.value)
                                is ClerkResult.Failure -> errorMessage = clerkFailureMessage(result)
                            }
                        }
                    }
                }
            },
            enabled = !isWorking,
            modifier = Modifier.fillMaxWidth(),
            colors = ButtonDefaults.buttonColors(
                containerColor = config.primary,
                contentColor = config.onPrimary,
            ),
        ) {
            if (isWorking) {
                CircularProgressIndicator(
                    modifier = Modifier.height(20.dp),
                    color = config.onPrimary,
                    strokeWidth = 2.dp,
                )
            } else {
                Text(primaryActionLabel(step))
            }
        }

        if (step == AuthStep.Identifier && config.allowSignUp) {
            TextButton(onClick = {
                val trimmed = email.trim().lowercase()
                if (!trimmed.contains("@")) {
                    errorMessage = "Enter your email address first."
                    return@TextButton
                }
                email = trimmed
                isSignUp = true
                step = AuthStep.CreatePassword
                password = ""
                errorMessage = null
            }) {
                Text("Create an account", color = config.primary)
            }
        }

        if (step != AuthStep.Identifier) {
            TextButton(onClick = {
                step = AuthStep.Identifier
                password = ""
                code = ""
                errorMessage = null
                activeSignIn = null
                activeSignUp = null
                isSignUp = false
            }) {
                Text("Back", color = config.muted)
            }
        }

        Spacer(Modifier.height(12.dp))
    }
}

private enum class AuthStep {
    Identifier, Password, CreatePassword, EmailCode, EmailCodeSecond, Totp,
}

private fun stepTitle(step: AuthStep, isSignUp: Boolean): String = when (step) {
    AuthStep.Identifier -> if (isSignUp) "Create account" else "Welcome"
    AuthStep.Password -> "Enter password"
    AuthStep.CreatePassword -> "Create password"
    AuthStep.EmailCode, AuthStep.EmailCodeSecond -> "Check your email"
    AuthStep.Totp -> "Authenticator"
}

private fun stepSubtitle(step: AuthStep, email: String): String = when (step) {
    AuthStep.Identifier -> "Enter the email you use on the website."
    AuthStep.Password -> "Password for $email"
    AuthStep.CreatePassword -> "Choose a password (8+ characters)."
    AuthStep.EmailCode, AuthStep.EmailCodeSecond -> "Enter the code we sent to $email"
    AuthStep.Totp -> "Enter the code from your authenticator app."
}

private fun primaryActionLabel(step: AuthStep): String = when (step) {
    AuthStep.Identifier -> "Continue"
    AuthStep.Password -> "Sign in"
    AuthStep.CreatePassword -> "Create account"
    AuthStep.EmailCode, AuthStep.EmailCodeSecond, AuthStep.Totp -> "Verify"
}

private suspend fun submitIdentifier(
    email: String,
    allowSignUp: Boolean,
    onSignIn: suspend (SignIn) -> Unit,
    onBeginSignUp: () -> Unit,
    onError: (String) -> Unit,
) {
    val trimmed = email.trim().lowercase()
    if (!trimmed.contains("@")) {
        onError("Enter a valid email address.")
        return
    }
    when (val result = SignIn.create(SignIn.CreateParams.Strategy.Identifier(identifier = trimmed))) {
        is ClerkResult.Success -> onSignIn(result.value)
        is ClerkResult.Failure -> {
            val code = result.error?.errors?.firstOrNull()?.code.orEmpty()
            if (allowSignUp && code in setOf("form_identifier_not_found", "invitation_account_not_exists")) {
                onBeginSignUp()
            } else {
                onError(clerkFailureMessage(result))
            }
        }
    }
}

private fun clerkFailureMessage(failure: ClerkResult.Failure<*>): String {
    val err = failure.error
    if (err is ClerkErrorResponse) {
        return err.firstMessage() ?: err.errors.firstOrNull()?.longMessage
            ?: err.errors.firstOrNull()?.message
            ?: "Sign-in failed."
    }
    return failure.throwable?.message ?: "Sign-in failed."
}
