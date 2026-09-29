import Foundation
import UIKit
import UserNotifications

@MainActor
final class AppDelegate: NSObject, UIApplicationDelegate, UNUserNotificationCenterDelegate {
    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        UNUserNotificationCenter.current().delegate = self
        if let remote = launchOptions?[.remoteNotification] as? [AnyHashable: Any] {
            requestChatPrefetch(userInfo: remote)
            routeNotification(userInfo: remote)
        }
        return true
    }

    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        Task {
            await PushRegistrationService.shared.register(deviceToken: deviceToken)
        }
    }

    func application(
        _ application: UIApplication,
        didFailToRegisterForRemoteNotificationsWithError error: Error
    ) {
        print("[APNs] registration failed: \(error.localizedDescription)")
        Task { @MainActor in
            PushRegistrationService.shared.recordRegistrationFailure(error)
        }
    }

    /// Background / quiet-period wake — pull chat onto disk before the user opens the tab.
    func application(
        _ application: UIApplication,
        didReceiveRemoteNotification userInfo: [AnyHashable: Any],
        fetchCompletionHandler completionHandler: @escaping (UIBackgroundFetchResult) -> Void
    ) {
        requestChatPrefetch(userInfo: userInfo)
        // Prefetch runs async via NotificationCenter; report newData optimistically for chat pushes.
        let isChat = ChatCachePrefetcher.channelId(fromUserInfo: userInfo) != nil
            || (userInfo["url"] as? String)?.contains("chat") == true
        completionHandler(isChat ? .newData : .noData)
    }

    nonisolated func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification
    ) async -> UNNotificationPresentationOptions {
        let userInfo = notification.request.content.userInfo
        await MainActor.run {
            requestChatPrefetch(userInfo: userInfo)
        }
        return [.banner, .sound, .badge]
    }

    nonisolated func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse
    ) async {
        let userInfo = response.notification.request.content.userInfo
        await MainActor.run {
            requestChatPrefetch(userInfo: userInfo)
            routeNotification(userInfo: userInfo)
        }
    }

    private func requestChatPrefetch(userInfo: [AnyHashable: Any]) {
        var info: [String: Any] = [:]
        if let channelId = ChatCachePrefetcher.channelId(fromUserInfo: userInfo) {
            info["channelId"] = channelId
        }
        // Always try a channels refresh on chat-looking pushes (url or thread-id).
        let looksLikeChat = info["channelId"] != nil
            || (userInfo["url"] as? String)?.contains("chat") == true
        guard looksLikeChat else { return }
        NotificationCenter.default.post(
            name: .rendezvousChatPushPrefetch,
            object: nil,
            userInfo: info
        )
    }

    private func routeNotification(userInfo: [AnyHashable: Any]) {
        guard let urlString = userInfo["url"] as? String,
              let url = URL(string: urlString)
        else { return }
        DeepLinkRouter.storePending(url)
        DeepLinkRouter.flushPending()
    }
}
