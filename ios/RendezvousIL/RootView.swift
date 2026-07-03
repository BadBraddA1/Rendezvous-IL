import Clerk
import SwiftUI

/// Login gate — attendees only. Main app unlocks after Clerk sign-in.
struct RootView: View {
    @Environment(AppSession.self) private var session
    @Environment(RendezvousRepository.self) private var repository
    @Environment(\.scenePhase) private var scenePhase
    @State private var splashFinished = false
    @State private var showAuthSheet = false

    private var bootstrapState: AppBootstrapState {
        AppBootstrapState.resolve(session: session, splashFinished: splashFinished)
    }

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
        // Observe our mirror of the session id — never read Clerk.shared in the view graph
        // before load completes (that path crashed after sign-out).
        .onChange(of: session.clerkSessionId) { _, sessionId in
            guard session.isClerkReady else { return }
            if sessionId != nil, !session.isSignedIn {
                Task { await session.refreshAuth(suppressLoadingUI: true) }
            } else if sessionId == nil, session.isSignedIn {
                session.handleExternalSignOut()
            }
        }
        .onChange(of: session.isSignedIn) { _, signedIn in
            if signedIn {
                DeepLinkRouter.flushPending()
            }
        }
        .onOpenURL { url in
            DeepLinkRouter.storePending(url)
            if session.isSignedIn {
                DeepLinkRouter.flushPending()
            }
        }
        .onChange(of: scenePhase) { _, phase in
            guard phase == .active else { return }
            Task {
                if session.isClerkReady {
                    await session.handleClerkSessionChange()
                }
                await session.recordActivityIfSignedIn()
                await NotificationService.shared.registerForRemoteIfAuthorized()
            }
        }
        .sheet(isPresented: $showAuthSheet) {
            ClerkAuthSheet(mode: .signIn)
                .withAppEnvironments(session: session)
                .presentationDetents([.large])
                .presentationDragIndicator(.visible)
        }
    }

    @ViewBuilder
    private var mainContent: some View {
        switch bootstrapState {
        case .splash:
            launchSplash
        case .connecting:
            connectingView
        case .signedIn:
            MainTabView()
        case .welcome:
            WelcomeHubView {
                showAuthSheet = true
            }
        case .misconfigured(let message):
            bootstrapErrorView(message: message)
        }
    }

    private func bootstrapErrorView(message: String) -> some View {
        VStack(spacing: 16) {
            Image(systemName: "exclamationmark.triangle")
                .font(.largeTitle)
                .foregroundStyle(.orange)
            Text("Could not start the app")
                .font(.headline)
            Text(message)
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
            Button("Try again") {
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
        AppLog.bootstrap("start")
        async let bootstrap: Void = session.bootstrapAuthIfNeeded()
        async let minimumSplash: Void = {
            try? await Task.sleep(for: .milliseconds(900))
        }()
        _ = await (bootstrap, minimumSplash)
        splashFinished = true
        AppLog.bootstrap("splash done signedIn=\(session.isSignedIn) clerkReady=\(session.isClerkReady)")
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
