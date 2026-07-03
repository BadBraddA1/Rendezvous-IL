import Clerk
import SwiftUI

@main
struct RendezvousILApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate
    @Environment(\.scenePhase) private var scenePhase
    @State private var session = AppSession()
    @State private var repository = RendezvousRepository()

    init() {
        guard let key = AppConfig.clerkPublishableKey else { return }
        Clerk.shared.configure(publishableKey: key)
    }

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(session)
                .environment(repository)
                .environment(\.clerk, Clerk.shared)
                .tint(BrandColors.lake)
                .task {
                    await NotificationService.shared.refreshAuthorizationStatus()
                    await NotificationService.shared.registerForRemoteIfAuthorized()
                }
                .onChange(of: scenePhase) { _, phase in
                    guard phase == .active else { return }
                    Task { await session.recordActivityIfSignedIn() }
                }
                .onOpenURL { url in
                    if let tab = DeepLinkRouter.tab(for: url) {
                        NotificationCenter.default.post(
                            name: .rendezvousDeepLink,
                            object: nil,
                            userInfo: ["tab": tab]
                        )
                    }
                }
        }
    }
}
