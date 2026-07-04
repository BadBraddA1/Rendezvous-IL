import Foundation
import UIKit
import UserNotifications

@MainActor
@Observable
final class NotificationService {
    static let shared = NotificationService()

    private(set) var authorizationStatus: UNAuthorizationStatus = .notDetermined
    /// Set when the post-sign-in explanation alert should be shown.
    var shouldShowPostSignInPrompt = false

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
        static let didPromptAfterSignIn = "notifications.didPromptAfterSignIn"
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

    /// After sign-in: show a one-time explanation, then the system permission dialog.
    /// If permission was already decided, just re-register for APNs when allowed.
    func preparePostSignInPromptIfNeeded() async {
        await refreshAuthorizationStatus()

        switch authorizationStatus {
        case .notDetermined:
            guard !UserDefaults.standard.bool(forKey: Keys.didPromptAfterSignIn) else { return }
            shouldShowPostSignInPrompt = true
        case .authorized, .provisional, .ephemeral:
            broadcastAlertsEnabled = true
            await registerForRemoteIfAuthorized()
        case .denied:
            break
        @unknown default:
            break
        }
    }

    func acceptPostSignInPrompt() async {
        UserDefaults.standard.set(true, forKey: Keys.didPromptAfterSignIn)
        shouldShowPostSignInPrompt = false
        broadcastAlertsEnabled = true
        _ = await requestPermissions()
    }

    func declinePostSignInPrompt() {
        UserDefaults.standard.set(true, forKey: Keys.didPromptAfterSignIn)
        shouldShowPostSignInPrompt = false
    }
}
