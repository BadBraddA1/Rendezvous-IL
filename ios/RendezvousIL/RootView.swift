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
            // Headless simctl screenshots never run the opacity animation, so the
            // main UI would stay at opacity 0 (blank white) after splash dismisses.
            if AppStoreScreenshotMode.isEnabled {
                if splashFinished {
                    mainContent
                } else {
                    launchSplash
                }
            } else {
                mainContent
                    .opacity(splashFinished ? 1 : 0)

                if !splashFinished {
                    launchSplash
                        .transition(.opacity)
                        .zIndex(1)
                }
            }
        }
        .animation(AppStoreScreenshotMode.isEnabled ? nil : .easeOut(duration: 0.3), value: splashFinished)
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
            guard !AppStoreScreenshotMode.isEnabled else { return }
            if signedIn {
                DeepLinkRouter.flushPending()
                Task {
                    // Let the home UI settle, then offer notifications once.
                    try? await Task.sleep(for: .milliseconds(600))
                    await NotificationService.shared.preparePostSignInPromptIfNeeded()
                }
            }
        }
        .alert(
            "Stay in the loop",
            isPresented: Binding(
                get: {
                    !AppStoreScreenshotMode.isEnabled
                        && NotificationService.shared.shouldShowPostSignInPrompt
                },
                set: { if !$0 { NotificationService.shared.declinePostSignInPrompt() } }
            )
        ) {
            Button("Enable notifications") {
                Task { await NotificationService.shared.acceptPostSignInPrompt() }
            }
            Button("Not now", role: .cancel) {
                NotificationService.shared.declinePostSignInPrompt()
            }
        } message: {
            Text("Get organizer announcements and event reminders during Rendezvous. You can change this anytime in More → Notifications & widgets.")
        }
        .onOpenURL { url in
            if DeepLinkRouter.isAppReviewDemoURL(url) {
                session.enableAppReviewDemoMode()
                return
            }
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
            // Full-height sheet (no detent) so Clerk can push forgot-password / alternate methods.
            ClerkAuthSheet(mode: .signInOrUp)
                .withAppEnvironments(session: session)
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
            } onAppReviewDemo: {
                session.enableAppReviewDemoMode()
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
        if AppStoreScreenshotMode.isEnabled {
            await session.bootstrapAuthIfNeeded()
            // Short splash so logo frame is capturable, then main UI.
            try? await Task.sleep(for: .milliseconds(400))
            splashFinished = true
            AppLog.bootstrap("screenshot mode tab=\(AppStoreScreenshotMode.tabName)")
            return
        }
        async let bootstrap: Void = session.bootstrapAuthIfNeeded()
        async let minimumSplash: Void = {
            try? await Task.sleep(for: .milliseconds(900))
        }()
        _ = await (bootstrap, minimumSplash)
        splashFinished = true
        AppLog.bootstrap("splash done signedIn=\(session.isSignedIn) clerkReady=\(session.isClerkReady)")
    }

    private var launchSplash: some View {
        VStack(spacing: 20) {
            Spacer()

            Image("RendezvousLogo")
                .resizable()
                .scaledToFit()
                .frame(maxWidth: 200, maxHeight: 100)
                .padding(.horizontal, 20)
                .padding(.vertical, 16)
                // Logo art is dark; keep a light plate so it stays visible in dark mode.
                .background(Color.white, in: RoundedRectangle(cornerRadius: 20, style: .continuous))
                .shadow(color: .black.opacity(0.12), radius: 12, y: 4)

            ProgressView()
                .tint(BrandColors.lake)

            Spacer()

            Text("Powered by BraddCorp")
                .font(.footnote.weight(.medium))
                .foregroundStyle(.secondary)
                .padding(.bottom, 28)
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
