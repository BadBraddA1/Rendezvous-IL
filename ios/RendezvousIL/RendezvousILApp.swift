import SwiftUI

@main
struct RendezvousILApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate
    @State private var session = AppSession()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environment(session)
                .tint(BrandColors.lake)
                .task {
                    await session.bootstrapAuthIfNeeded()
                    await NotificationService.shared.refreshAuthorizationStatus()
                    await NotificationService.shared.registerForRemoteIfAuthorized()
                }
        }
    }
}
