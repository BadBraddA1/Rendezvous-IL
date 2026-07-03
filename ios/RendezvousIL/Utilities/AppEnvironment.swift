import Clerk
import SwiftUI

/// Root-level environment injection — single place for session, repository, Clerk.
struct AppShell<Content: View>: View {
    @State private var session = AppSession()
    @State private var repository = RendezvousRepository()

    @ViewBuilder var content: () -> Content

    init(@ViewBuilder content: @escaping () -> Content) {
        self.content = content
    }

    var body: some View {
        content()
            .environment(session)
            .environment(repository)
            // Both forms are required: `\.clerk` for AuthView, `Clerk.self` for @Environment(Clerk.self).
            .environment(\.clerk, Clerk.shared)
            .environment(Clerk.shared)
            .tint(BrandColors.lake)
    }
}

extension View {
    /// Re-apply session + Clerk when presenting sheets so nested auth never crashes.
    func withAppEnvironments(session: AppSession) -> some View {
        environment(session)
            .environment(\.clerk, Clerk.shared)
            .environment(Clerk.shared)
    }
}

enum AppBootstrapState: Equatable {
    case splash
    case connecting
    case welcome
    case signedIn
    case misconfigured(String)

    @MainActor
    static func resolve(session: AppSession, splashFinished: Bool) -> AppBootstrapState {
        guard splashFinished else { return .splash }
        // Prefer a usable welcome screen over a hard failure when Clerk is misconfigured.
        if let error = session.clerkSetupError, !AppConfig.hasValidClerkKey {
            return .misconfigured(error)
        }
        if session.isSignedIn { return .signedIn }
        if session.isLoading { return .connecting }
        return .welcome
    }
}

#if DEBUG
enum AppLog {
    static func bootstrap(_ message: String) {
        print("[Rendezvous/bootstrap] \(message)")
    }
}
#else
enum AppLog {
    static func bootstrap(_ message: String) {}
}
#endif
