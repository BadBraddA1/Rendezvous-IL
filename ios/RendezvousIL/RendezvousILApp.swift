import Clerk
import SwiftUI

@main
struct RendezvousILApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate
    @Environment(\.scenePhase) private var scenePhase

    init() {
        guard let key = AppConfig.clerkPublishableKey else { return }
        Clerk.shared.configure(publishableKey: key)
    }

    var body: some Scene {
        WindowGroup {
            AppShell {
                RootView()
            }
            .task {
                await NotificationService.shared.refreshAuthorizationStatus()
                await NotificationService.shared.registerForRemoteIfAuthorized()
            }
            .onChange(of: scenePhase) { _, phase in
                guard phase == .active else { return }
                Task {
                    // AppSession lives inside AppShell; activity ping is triggered from RootView after auth.
                }
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
