import Clerk
import SwiftUI

extension ClerkTheme {
    /// Lake-teal Clerk UI that follows system light/dark mode.
    @MainActor
    static var rendezvous: ClerkTheme {
        ClerkTheme(
            colors: .init(primary: BrandColors.lake),
            design: .init(borderRadius: 12)
        )
    }
}

/// Pew Packers–style copy + button. **No sheet** — parent presents `ClerkAuthSheet` at root only.
struct SignInPromptCard: View {
    @Environment(AppSession.self) private var session
    @Environment(Clerk.self) private var clerk

    var sectionTitle: String = "Sign in"
    var helperText: String = "Use the same email as rendezvousil.com."
    var buttonTitle: String = "Sign in"
    var onSignIn: () -> Void

    private var clerkIsReady: Bool {
        clerk.isLoaded && session.clerkSetupError == nil && AppConfig.hasValidClerkKey
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text(sectionTitle)
                .font(.headline)
                .foregroundStyle(.secondary)

            if let setupError = session.clerkSetupError {
                clerkSetupHelp(message: setupError)
            } else if !AppConfig.hasValidClerkKey {
                missingConfigHelp
            } else if !clerk.isLoaded {
                HStack(spacing: 12) {
                    ProgressView()
                    Text("Loading sign-in…")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
            } else {
                Text(helperText)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .fixedSize(horizontal: false, vertical: true)

                if let authError = session.authError {
                    Text(authError)
                        .font(.caption)
                        .foregroundStyle(.red)
                }

                Button(buttonTitle) {
                    guard clerkIsReady else { return }
                    onSignIn()
                }
                .buttonStyle(.borderedProminent)
                .tint(BrandColors.lake)
                .controlSize(.large)
                .frame(maxWidth: .infinity)
            }
        }
        .glassCard(cornerRadius: 22, padding: 22)
    }

    @ViewBuilder
    private func clerkSetupHelp(message: String) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(message)
                .font(.subheadline)
                .foregroundStyle(.red)
            Text("Enable Clerk Native API for this app in the Clerk dashboard.")
                .font(.caption)
                .foregroundStyle(.secondary)
            Link("Open Clerk Native applications", destination: URL(string: "https://dashboard.clerk.com/last-active?path=native-applications")!)
                .font(.caption.weight(.semibold))
        }
    }

    private var missingConfigHelp: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Sign-in unavailable")
                .font(.subheadline.weight(.semibold))
            Text("Install the latest TestFlight update.")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
    }
}

/// Clerk `AuthView` sheet — attach **only** from `RootView`.
struct ClerkAuthSheet: View {
    @Environment(AppSession.self) private var session
    @Environment(Clerk.self) private var clerk
    @Environment(\.dismiss) private var dismiss

    var mode: AuthView.Mode = .signInOrUp

    var body: some View {
        NavigationStack {
            AuthView(mode: mode, isDismissable: true)
                .environment(\.clerkTheme, .rendezvous)
                .navigationTitle(mode == .signIn ? "Sign in" : "Account")
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) {
                        Button("Close") { dismiss() }
                    }
                }
        }
        .onChange(of: clerk.session?.id) { _, sessionId in
            guard sessionId != nil else { return }
            dismiss()
            Task { await session.refreshAuth() }
        }
    }
}
