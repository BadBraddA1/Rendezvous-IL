import Clerk
import SwiftUI

/// Login gate — attendees only. Main app unlocks after Clerk sign-in.
struct RootView: View {
    @Environment(AppSession.self) private var session
    @Environment(RendezvousRepository.self) private var repository
    @State private var splashFinished = false
    @State private var bootstrapFailed = false

    var body: some View {
        ZStack {
            mainContent
                .opacity(splashFinished ? 1 : 0)

            if !splashFinished {
                launchSplash
                    .transition(.opacity)
                    .zIndex(1)
            }
        }
        .animation(.easeOut(duration: 0.3), value: splashFinished)
        .task {
            await runBootstrap()
        }
        .onChange(of: Clerk.shared.session?.id) { _, sessionId in
            if sessionId != nil {
                Task { await session.refreshAuth() }
            }
        }
    }

    @ViewBuilder
    private var mainContent: some View {
        if bootstrapFailed {
            bootstrapErrorView
        } else if session.isSignedIn {
            MainTabView()
        } else if session.isLoading {
            connectingView
        } else {
            WelcomeHubView()
        }
    }

    private var bootstrapErrorView: some View {
        VStack(spacing: 16) {
            Image(systemName: "exclamationmark.triangle")
                .font(.largeTitle)
                .foregroundStyle(.orange)
            Text("Could not start the app")
                .font(.headline)
            Text(session.clerkSetupError ?? "Something went wrong during startup.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
            Button("Try again") {
                bootstrapFailed = false
                Task { await runBootstrap() }
            }
            .buttonStyle(.borderedProminent)
            .tint(BrandColors.lake)
        }
        .padding(24)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color(.systemGroupedBackground))
    }

    private func runBootstrap() async {
        async let bootstrap: Void = session.bootstrapAuthIfNeeded()
        async let minimumSplash: Void = {
            try? await Task.sleep(for: .milliseconds(900))
        }()
        _ = await (bootstrap, minimumSplash)

        if session.clerkSetupError != nil, !AppConfig.hasValidClerkKey {
            bootstrapFailed = true
        }

        splashFinished = true

        Task(priority: .utility) {
            await repository.loadScheduleBundle()
            await repository.loadScheduleExtras()
        }
    }

    private var launchSplash: some View {
        VStack(spacing: 16) {
            Image(systemName: "leaf.fill")
                .font(.system(size: 44))
                .foregroundStyle(BrandColors.lake)
            Text("Rendezvous")
                .font(.system(.title, design: .serif))
                .fontWeight(.semibold)
            ProgressView()
                .tint(BrandColors.lake)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color(.systemGroupedBackground))
    }

    private var connectingView: some View {
        VStack(spacing: 14) {
            ProgressView()
                .controlSize(.large)
                .tint(BrandColors.lake)
            Text("Connecting…")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color(.systemGroupedBackground))
    }
}
