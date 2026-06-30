import Foundation
import UIKit
import UserNotifications

@MainActor
@Observable
final class NotificationService {
    static let shared = NotificationService()

    private(set) var authorizationStatus: UNAuthorizationStatus = .notDetermined
    var broadcastAlertsEnabled: Bool {
        didSet { UserDefaults.standard.set(broadcastAlertsEnabled, forKey: Keys.broadcastAlerts) }
    }
    var liveActivityEnabled: Bool {
        didSet {
            UserDefaults.standard.set(liveActivityEnabled, forKey: Keys.liveActivity)
            Task { await LiveActivityManager.shared.refresh() }
        }
    }

    private enum Keys {
        static let broadcastAlerts = "notifications.broadcast"
        static let liveActivity = "notifications.liveActivity"
    }

    private init() {
        broadcastAlertsEnabled = UserDefaults.standard.object(forKey: Keys.broadcastAlerts) as? Bool ?? true
        liveActivityEnabled = UserDefaults.standard.object(forKey: Keys.liveActivity) as? Bool ?? true
    }

    func refreshAuthorizationStatus() async {
        let settings = await UNUserNotificationCenter.current().notificationSettings()
        authorizationStatus = settings.authorizationStatus
    }

    func requestPermissions() async -> Bool {
        let center = UNUserNotificationCenter.current()
        do {
            let granted = try await center.requestAuthorization(options: [.alert, .sound, .badge])
            await refreshAuthorizationStatus()
            if granted, broadcastAlertsEnabled {
                UIApplication.shared.registerForRemoteNotifications()
            }
            return granted
        } catch {
            return false
        }
    }

    func registerForRemoteIfAuthorized() async {
        await refreshAuthorizationStatus()
        guard broadcastAlertsEnabled else { return }
        guard authorizationStatus == .authorized || authorizationStatus == .provisional else { return }
        UIApplication.shared.registerForRemoteNotifications()
    }
}
