import Clerk
import SwiftUI

/// Fully native Clerk sign-in / sign-up — Church Relay pattern, no embedded `AuthView`.
/// Email + password / email code / TOTP only (no social / Sign in with Apple).
struct NativeAuthFlow: View {
    @Environment(Clerk.self) private var clerk
    var onAuthenticated: () -> Void = {}

    @State private var step: Step = .identifier
    @State private var authMode: AuthMode = .signIn
    @State private var identifier = ""
    @State private var password = ""
    @State private var code = ""
    @State private var isWorking = false
    @State private var errorMessage: String?
    @State private var activeFactor: Factor?
    @FocusState private var focusedField: Field?

    private enum AuthMode {
        case signIn
        case signUp
    }

    private enum Step: Equatable {
        case identifier
        case password
        case createPassword
        case emailCode(isSecondFactor: Bool)
        case totp
        case resetEmailCode
        case newPassword
    }

    private enum Field: Hashable {
        case identifier, password, code
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            stepHeader

            switch step {
            case .identifier:
                identifierStep
            case .password:
                passwordStep(isCreate: false)
            case .createPassword:
                passwordStep(isCreate: true)
            case .emailCode(let isSecondFactor):
                emailCodeStep(isSecondFactor: isSecondFactor)
            case .totp:
                totpStep
            case .resetEmailCode:
                resetEmailCodeStep
            case .newPassword:
                newPasswordStep
            }

            if let errorMessage {
                Text(errorMessage)
                    .font(.footnote)
                    .foregroundStyle(.red)
                    .fixedSize(horizontal: false, vertical: true)
                    .accessibilityLabel("Sign-in error: \(errorMessage)")
            }
        }
        .animation(.easeOut(duration: 0.22), value: step)
        .onChange(of: clerk.session?.id) { _, sessionId in
            guard sessionId != nil else { return }
            onAuthenticated()
        }
    }

    private var stepHeader: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(stepTitle)
                .font(.title3.weight(.semibold))
            Text(stepSubtitle)
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .fixedSize(horizontal: false, vertical: true)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .accessibilityElement(children: .combine)
    }

    private var stepTitle: String {
        switch step {
        case .identifier:
            return authMode == .signUp ? "Create account" : "Welcome back"
        case .password:
            return "Enter password"
        case .createPassword:
            return "Choose a password"
        case .emailCode:
            return "Check your email"
        case .totp:
            return "Two-step verification"
        case .resetEmailCode:
            return "Reset your password"
        case .newPassword:
            return "Choose a new password"
        }
    }

    private var stepSubtitle: String {
        switch step {
        case .identifier:
            return "Use the same email as rendezvousil.com."
        case .password:
            return "Password for \(identifier)."
        case .createPassword:
            return "At least 8 characters. You’ll verify this email next."
        case .emailCode:
            return "We sent a one-time code to \(identifier)."
        case .totp:
            return "Enter the code from your authenticator app."
        case .resetEmailCode:
            return "We sent a reset code to \(identifier)."
        case .newPassword:
            return "At least 8 characters. You’ll be signed in after saving."
        }
    }

    private var identifierStep: some View {
        VStack(alignment: .leading, spacing: 14) {
            TextField("Email address", text: $identifier)
                .textContentType(.username)
                .keyboardType(.emailAddress)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
                .focused($focusedField, equals: .identifier)
                .submitLabel(.continue)
                .onSubmit { Task { await submitIdentifier() } }
                .renAuthField()

            Button {
                Task { await submitIdentifier() }
            } label: {
                authButtonLabel(isWorking ? "Please wait…" : "Continue")
            }
            .buttonStyle(.borderedProminent)
            .tint(BrandColors.lake)
            .controlSize(.large)
            .disabled(!canSubmitIdentifier || isWorking)

            Button {
                Task { await beginSignUpExplicit() }
            } label: {
                Text("New here? Create an account")
                    .font(.subheadline.weight(.medium))
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderless)
            .disabled(isWorking)
        }
        .task { focusedField = .identifier }
    }

    private func passwordStep(isCreate: Bool) -> some View {
        VStack(alignment: .leading, spacing: 14) {
            SecureField(isCreate ? "New password" : "Password", text: $password)
                .textContentType(isCreate ? .newPassword : .password)
                .focused($focusedField, equals: .password)
                .submitLabel(.go)
                .onSubmit {
                    Task {
                        if isCreate {
                            await submitCreatePassword()
                        } else {
                            await submitPassword()
                        }
                    }
                }
                .renAuthField()

            Button {
                Task {
                    if isCreate {
                        await submitCreatePassword()
                    } else {
                        await submitPassword()
                    }
                }
            } label: {
                authButtonLabel(isWorking ? "Please wait…" : "Continue")
            }
            .buttonStyle(.borderedProminent)
            .tint(BrandColors.lake)
            .controlSize(.large)
            .disabled(password.count < (isCreate ? 8 : 1) || isWorking)

            if !isCreate {
                Button("Forgot password?") {
                    Task { await beginPasswordReset() }
                }
                .font(.subheadline.weight(.medium))
                .disabled(isWorking)
            }

            Button("Back") {
                step = .identifier
                password = ""
                errorMessage = nil
                focusedField = .identifier
            }
            .font(.subheadline)
            .disabled(isWorking)
        }
        .task { focusedField = .password }
    }

    private var resetEmailCodeStep: some View {
        VStack(alignment: .leading, spacing: 14) {
            TextField("6-digit code", text: $code)
                .textContentType(.oneTimeCode)
                .keyboardType(.numberPad)
                .focused($focusedField, equals: .code)
                .renAuthField()

            Button {
                Task { await submitResetEmailCode() }
            } label: {
                authButtonLabel(isWorking ? "Verifying…" : "Verify")
            }
            .buttonStyle(.borderedProminent)
            .tint(BrandColors.lake)
            .controlSize(.large)
            .disabled(code.trimmingCharacters(in: .whitespacesAndNewlines).count < 6 || isWorking)

            Button("Resend code") {
                Task { await resendResetEmailCode() }
            }
            .font(.subheadline.weight(.medium))
            .disabled(isWorking)

            Button("Back") {
                step = .password
                code = ""
                errorMessage = nil
            }
            .font(.subheadline)
            .disabled(isWorking)
        }
        .task { focusedField = .code }
    }

    private var newPasswordStep: some View {
        VStack(alignment: .leading, spacing: 14) {
            SecureField("New password", text: $password)
                .textContentType(.newPassword)
                .focused($focusedField, equals: .password)
                .submitLabel(.go)
                .onSubmit { Task { await submitNewPassword() } }
                .renAuthField()

            Button {
                Task { await submitNewPassword() }
            } label: {
                authButtonLabel(isWorking ? "Saving…" : "Save password & sign in")
            }
            .buttonStyle(.borderedProminent)
            .tint(BrandColors.lake)
            .controlSize(.large)
            .disabled(password.count < 8 || isWorking)

            Button("Back") {
                step = .identifier
                password = ""
                code = ""
                errorMessage = nil
            }
            .font(.subheadline)
            .disabled(isWorking)
        }
        .task { focusedField = .password }
    }

    private func emailCodeStep(isSecondFactor: Bool) -> some View {
        VStack(alignment: .leading, spacing: 14) {
            TextField("6-digit code", text: $code)
                .textContentType(.oneTimeCode)
                .keyboardType(.numberPad)
                .focused($focusedField, equals: .code)
                .renAuthField()

            Button {
                Task { await submitEmailCode(isSecondFactor: isSecondFactor) }
            } label: {
                authButtonLabel(isWorking ? "Verifying…" : "Verify")
            }
            .buttonStyle(.borderedProminent)
            .tint(BrandColors.lake)
            .controlSize(.large)
            .disabled(code.trimmingCharacters(in: .whitespacesAndNewlines).count < 6 || isWorking)

            Button("Resend code") {
                Task { await resendEmailCode(isSecondFactor: isSecondFactor) }
            }
            .font(.subheadline.weight(.medium))
            .disabled(isWorking)

            Button("Back") {
                step = .identifier
                code = ""
                errorMessage = nil
            }
            .font(.subheadline)
            .disabled(isWorking)
        }
        .task {
            focusedField = .code
            if authMode == .signIn {
                await resendEmailCode(isSecondFactor: isSecondFactor)
            }
        }
    }

    private var totpStep: some View {
        VStack(alignment: .leading, spacing: 14) {
            TextField("Authenticator code", text: $code)
                .keyboardType(.numberPad)
                .textContentType(.oneTimeCode)
                .focused($focusedField, equals: .code)
                .renAuthField()

            Button {
                Task { await submitTOTP() }
            } label: {
                authButtonLabel(isWorking ? "Verifying…" : "Verify")
            }
            .buttonStyle(.borderedProminent)
            .tint(BrandColors.lake)
            .controlSize(.large)
            .disabled(code.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || isWorking)
        }
        .task { focusedField = .code }
    }

    private var canSubmitIdentifier: Bool {
        identifier.contains("@") && identifier.contains(".")
    }

    private func authButtonLabel(_ title: String) -> some View {
        Group {
            if isWorking {
                ProgressView()
                    .controlSize(.small)
                    .frame(maxWidth: .infinity)
            } else {
                Text(title)
                    .font(.headline)
                    .frame(maxWidth: .infinity)
            }
        }
        .frame(minHeight: 22)
    }

    // MARK: - Actions

    @MainActor
    private func submitIdentifier() async {
        let email = identifier.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        guard !email.isEmpty else { return }

        isWorking = true
        errorMessage = nil
        defer { isWorking = false }

        authMode = .signIn
        identifier = email

        do {
            let signIn = try await SignIn.create(strategy: .identifier(email))
            try await advanceSignIn(signIn)
        } catch let error as ClerkAPIError
            where ["form_identifier_not_found", "invitation_account_not_exists"].contains(error.code) {
            await beginSignUp(email: email)
        } catch {
            errorMessage = clerkErrorMessage(error)
        }
    }

    @MainActor
    private func beginSignUpExplicit() async {
        let email = identifier.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        guard email.contains("@") else {
            errorMessage = "Enter your email address first."
            focusedField = .identifier
            return
        }
        identifier = email
        await beginSignUp(email: email)
    }

    @MainActor
    private func beginSignUp(email: String) async {
        isWorking = true
        errorMessage = nil
        defer { isWorking = false }

        authMode = .signUp
        password = ""
        step = .createPassword
        focusedField = .password
    }

    @MainActor
    private func submitCreatePassword() async {
        let email = identifier.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        guard password.count >= 8 else {
            errorMessage = "Password must be at least 8 characters."
            return
        }

        isWorking = true
        errorMessage = nil
        defer { isWorking = false }

        do {
            let signUp = try await SignUp.create(
                strategy: .standard(emailAddress: email, password: password)
            )
            try await advanceSignUp(signUp)
        } catch {
            errorMessage = clerkErrorMessage(error)
        }
    }

    @MainActor
    private func submitPassword() async {
        isWorking = true
        errorMessage = nil
        defer { isWorking = false }

        do {
            guard var signIn = clerk.client?.signIn else {
                step = .identifier
                return
            }
            signIn = try await signIn.attemptFirstFactor(strategy: .password(password: password))
            try await advanceSignIn(signIn)
        } catch {
            errorMessage = clerkErrorMessage(error)
        }
    }

    @MainActor
    private func beginPasswordReset() async {
        isWorking = true
        errorMessage = nil
        defer { isWorking = false }

        do {
            guard var signIn = clerk.client?.signIn else {
                step = .identifier
                return
            }
            guard let resetFactor = signIn.renResetPasswordEmailFactor else {
                errorMessage = "Password reset isn’t available for this account. Try again from rendezvousil.com/forgot-password."
                return
            }
            activeFactor = resetFactor
            signIn = try await signIn.prepareFirstFactor(
                strategy: .resetPasswordEmailCode(emailAddressId: resetFactor.emailAddressId)
            )
            code = ""
            password = ""
            step = .resetEmailCode
            focusedField = .code
            _ = signIn
        } catch {
            errorMessage = clerkErrorMessage(error)
        }
    }

    @MainActor
    private func resendResetEmailCode() async {
        isWorking = true
        defer { isWorking = false }

        do {
            guard let signIn = clerk.client?.signIn else { return }
            let factor = activeFactor ?? signIn.renResetPasswordEmailFactor
            _ = try await signIn.prepareFirstFactor(
                strategy: .resetPasswordEmailCode(emailAddressId: factor?.emailAddressId)
            )
        } catch {
            errorMessage = clerkErrorMessage(error)
        }
    }

    @MainActor
    private func submitResetEmailCode() async {
        isWorking = true
        errorMessage = nil
        defer { isWorking = false }

        let trimmed = code.trimmingCharacters(in: .whitespacesAndNewlines)
        do {
            guard var signIn = clerk.client?.signIn else {
                step = .identifier
                return
            }
            signIn = try await signIn.attemptFirstFactor(
                strategy: .resetPasswordEmailCode(code: trimmed)
            )
            try await advanceSignIn(signIn)
        } catch {
            errorMessage = clerkErrorMessage(error)
        }
    }

    @MainActor
    private func submitNewPassword() async {
        guard password.count >= 8 else {
            errorMessage = "Password must be at least 8 characters."
            return
        }

        isWorking = true
        errorMessage = nil
        defer { isWorking = false }

        do {
            guard var signIn = clerk.client?.signIn else {
                step = .identifier
                return
            }
            signIn = try await signIn.resetPassword(
                .init(password: password, signOutOfOtherSessions: true)
            )
            try await advanceSignIn(signIn)
        } catch {
            errorMessage = clerkErrorMessage(error)
        }
    }

    @MainActor
    private func resendEmailCode(isSecondFactor: Bool) async {
        isWorking = true
        defer { isWorking = false }

        do {
            if authMode == .signUp {
                guard let signUp = clerk.client?.signUp else { return }
                _ = try await signUp.prepareVerification(strategy: .emailCode)
                return
            }

            guard let signIn = clerk.client?.signIn else { return }
            if isSecondFactor {
                _ = try await signIn.prepareSecondFactor(
                    strategy: .emailCode(emailAddressId: activeFactor?.emailAddressId)
                )
            } else {
                _ = try await signIn.prepareFirstFactor(
                    strategy: .emailCode(emailAddressId: activeFactor?.emailAddressId)
                )
            }
        } catch {
            errorMessage = clerkErrorMessage(error)
        }
    }

    @MainActor
    private func submitEmailCode(isSecondFactor: Bool) async {
        isWorking = true
        errorMessage = nil
        defer { isWorking = false }

        let trimmed = code.trimmingCharacters(in: .whitespacesAndNewlines)

        do {
            if authMode == .signUp {
                guard var signUp = clerk.client?.signUp else {
                    step = .identifier
                    return
                }
                signUp = try await signUp.attemptVerification(strategy: .emailCode(code: trimmed))
                try await advanceSignUp(signUp)
                return
            }

            guard var signIn = clerk.client?.signIn else {
                step = .identifier
                return
            }

            if isSecondFactor {
                signIn = try await signIn.attemptSecondFactor(strategy: .emailCode(code: trimmed))
            } else {
                signIn = try await signIn.attemptFirstFactor(strategy: .emailCode(code: trimmed))
            }
            try await advanceSignIn(signIn)
        } catch {
            errorMessage = clerkErrorMessage(error)
        }
    }

    @MainActor
    private func submitTOTP() async {
        isWorking = true
        errorMessage = nil
        defer { isWorking = false }

        do {
            guard var signIn = clerk.client?.signIn else {
                step = .identifier
                return
            }
            signIn = try await signIn.attemptSecondFactor(
                strategy: .totp(code: code.trimmingCharacters(in: .whitespacesAndNewlines))
            )
            try await advanceSignIn(signIn)
        } catch {
            errorMessage = clerkErrorMessage(error)
        }
    }

    @MainActor
    private func advanceSignIn(_ signIn: SignIn) async throws {
        switch signIn.status {
        case .complete:
            onAuthenticated()
        case .needsFirstFactor:
            guard let factor = signIn.renPreferredFirstFactor else {
                throw ClerkClientError(message: "No supported sign-in method for this account.")
            }
            activeFactor = factor
            switch factor.strategy {
            case "password":
                step = .password
                password = ""
            case "email_code":
                step = .emailCode(isSecondFactor: false)
                code = ""
            default:
                throw ClerkClientError(
                    message: "Sign-in method “\(factor.strategy)” isn’t supported in the app yet."
                )
            }
        case .needsSecondFactor:
            guard let factor = signIn.renPreferredSecondFactor else {
                throw ClerkClientError(message: "Two-step verification is required.")
            }
            activeFactor = factor
            code = ""
            switch factor.strategy {
            case "email_code":
                step = .emailCode(isSecondFactor: true)
            case "totp":
                step = .totp
            default:
                throw ClerkClientError(
                    message: "Two-step method “\(factor.strategy)” isn’t supported in the app yet."
                )
            }
        case .needsNewPassword:
            password = ""
            code = ""
            step = .newPassword
            focusedField = .password
        case .needsClientTrust, .needsIdentifier, .unknown:
            throw ClerkClientError(message: "Could not continue sign-in. Try again.")
        }
    }

    @MainActor
    private func advanceSignUp(_ signUp: SignUp) async throws {
        switch signUp.status {
        case .complete:
            onAuthenticated()
        case .missingRequirements:
            if signUp.missingFields.contains("password") {
                step = .createPassword
                return
            }
            if signUp.unverifiedFields.contains("email_address") {
                _ = try await signUp.prepareVerification(strategy: .emailCode)
                step = .emailCode(isSecondFactor: false)
                code = ""
                return
            }
            throw ClerkClientError(
                message: "More account details are required. Finish setup at rendezvousil.com."
            )
        case .abandoned, .unknown:
            throw ClerkClientError(message: "Sign-up could not continue. Try again.")
        }
    }

    private func clerkErrorMessage(_ error: Error) -> String {
        if let apiError = error as? ClerkAPIError {
            return apiError.longMessage ?? apiError.message ?? apiError.code
        }
        if let clientError = error as? ClerkClientError {
            return clientError.errorDescription ?? "Sign-in failed."
        }
        return error.localizedDescription
    }
}

private extension View {
    func renAuthField() -> some View {
        padding(.horizontal, 14)
            .padding(.vertical, 14)
            .background(
                Color(.secondarySystemBackground),
                in: RoundedRectangle(cornerRadius: 14, style: .continuous)
            )
            .overlay {
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .strokeBorder(BrandColors.cardBorder, lineWidth: 1)
            }
    }
}

private extension SignIn {
    var renPreferredFirstFactor: Factor? {
        let available = supportedFirstFactors?.filter { factor in
            !factor.strategy.hasPrefix("oauth_")
                && !factor.strategy.hasPrefix("reset_password_")
                && factor.strategy != "enterprise_sso"
                && factor.strategy != "saml"
                && factor.strategy != "passkey"
                && factor.strategy != "email_link"
        }

        if let password = available?.first(where: { $0.strategy == "password" }) {
            return password
        }
        if let emailCode = available?.first(where: { $0.strategy == "email_code" }) {
            return emailCode
        }
        return available?.first
    }

    var renResetPasswordEmailFactor: Factor? {
        // Prefer supportedFirstFactors — `identifyingFirstFactor` is internal in clerk-ios.
        supportedFirstFactors?.first(where: { $0.strategy == "reset_password_email_code" })
    }

    var renPreferredSecondFactor: Factor? {
        if let totp = supportedSecondFactors?.first(where: { $0.strategy == "totp" }) {
            return totp
        }
        if let emailCode = supportedSecondFactors?.first(where: { $0.strategy == "email_code" }) {
            return emailCode
        }
        return supportedSecondFactors?.first
    }
}
