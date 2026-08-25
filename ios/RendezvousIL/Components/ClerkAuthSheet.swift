import Clerk
import SwiftUI

/// Pew Packers–style copy + button. **No sheet** — parent presents `ClerkAuthSheet` at root only.
/// Does not read `@Environment(Clerk.self)` so the welcome screen cannot crash if Clerk env is missing.
struct SignInPromptCard: View {
    @Environment(AppSession.self) private var session

    var sectionTitle: String = "Sign in"
    var helperText: String = "Use the same email as rendezvousil.com."
    var buttonTitle: String = "Sign in"
    var onSignIn: () -> Void

    private var clerkIsReady: Bool {
        session.isClerkReady && session.clerkSetupError == nil && AppConfig.hasValidClerkKey
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
            } else if !session.isClerkReady {
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

/// Custom native auth sheet (Church Relay pattern) — attach **only** from `RootView`.
/// Uses `NativeAuthFlow` instead of Clerk's embedded `AuthView` chrome.
struct ClerkAuthSheet: View {
    @Environment(AppSession.self) private var session
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ScrollView {
                Group {
                    if session.isClerkReady {
                        NativeAuthFlow {
                            dismiss()
                            Task { await session.refreshAuth() }
                        }
                        .environment(Clerk.shared)
                    } else {
                        ProgressView("Loading sign-in…")
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 48)
                    }
                }
                .padding(20)
            }
            .background(Color(.systemGroupedBackground))
            .navigationTitle("Sign in")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") { dismiss() }
                }
            }
        }
        .onChange(of: session.clerkSessionId) { _, sessionId in
            guard sessionId != nil else { return }
            dismiss()
            Task { await session.refreshAuth() }
        }
        .task {
            while !Task.isCancelled {
                if session.isClerkReady {
                    let id = Clerk.shared.session?.id
                    if id != session.clerkSessionId {
                        session.clerkSessionId = id
                    }
                }
                try? await Task.sleep(for: .milliseconds(400))
            }
        }
    }
}
