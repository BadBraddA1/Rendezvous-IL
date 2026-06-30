import Clerk
import SwiftUI

@main
struct RendezvousILApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate
    @Environment(\.scenePhase) private var scenePhase
    @State private var session = AppSession()

    init() {
        guard let key = AppConfig.clerkPublishableKey else { return }
        Clerk.shared.configure(publishableKey: key)
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environment(session)
                .environment(\.clerk, Clerk.shared)
                .tint(BrandColors.lake)
                .task {
                    await session.bootstrapAuthIfNeeded()
                    await NotificationService.shared.refreshAuthorizationStatus()
                    await NotificationService.shared.registerForRemoteIfAuthorized()
                }
                .onChange(of: scenePhase) { _, phase in
                    guard phase == .active else { return }
                    Task { await session.recordActivityIfSignedIn() }
                }
        }
    }
}
