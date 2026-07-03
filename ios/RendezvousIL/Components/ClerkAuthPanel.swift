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

/// Pew Packers–style sign-in: short copy + button, Clerk `AuthView` in a sheet (not embedded inline).
struct ClerkAuthPanel: View {
    @Environment(AppSession.self) private var session
    @Environment(Clerk.self) private var clerk

    var mode: AuthView.Mode = .signInOrUp
    var sectionTitle: String = "Get started"
    var helperText: String = "Use the same email as rendezvousil.com — new here? Enter your email in the next step to create a free account."
    var buttonTitle: String = "Sign in or create account"

    @State private var authIsPresented = false

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
                .frame(maxWidth: .infinity, alignment: .leading)
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
                    authIsPresented = true
                }
                .buttonStyle(.borderedProminent)
                .tint(BrandColors.lake)
                .controlSize(.large)
                .frame(maxWidth: .infinity)
            }
        }
        .glassCard(cornerRadius: 22, padding: 22)
        .sheet(isPresented: $authIsPresented) {
            if clerkIsReady {
                NavigationStack {
                    AuthView(mode: mode, isDismissable: true)
                        .environment(\.clerkTheme, .rendezvous)
                        .navigationTitle(mode == .signIn ? "Sign in" : "Account")
                        .navigationBarTitleDisplayMode(.inline)
                        .toolbar {
                            ToolbarItem(placement: .cancellationAction) {
                                Button("Close") { authIsPresented = false }
                            }
                        }
                }
                .presentationDetents([.large])
                .presentationDragIndicator(.visible)
            }
        }
        .onChange(of: clerk.session?.id) { _, sessionId in
            guard sessionId != nil else { return }
            authIsPresented = false
            Task { await session.refreshAuth() }
        }
    }

    @ViewBuilder
    private func clerkSetupHelp(message: String) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(message)
                .font(.subheadline)
                .foregroundStyle(.red)

            Text("Sign-in works once Clerk Native API is enabled for this app in the Clerk dashboard.")
                .font(.caption)
                .foregroundStyle(.secondary)

            Link("Open Clerk Native applications", destination: URL(string: "https://dashboard.clerk.com/last-active?path=native-applications")!)
                .font(.caption.weight(.semibold))
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var missingConfigHelp: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Sign-in unavailable")
                .font(.subheadline.weight(.semibold))
            Text("This build is missing the Clerk key. Install the latest TestFlight update.")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}
