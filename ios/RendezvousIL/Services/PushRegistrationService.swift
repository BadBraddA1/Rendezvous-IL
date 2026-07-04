import Foundation
import UIKit

@MainActor
final class PushRegistrationService {
    static let shared = PushRegistrationService()

    private(set) var lastRegisteredHex: String?
    private(set) var lastRegistrationError: String?
    private var pendingToken: Data?

    /// Set after sign-in so device tokens are linked to the Clerk user (chat push targeting).
    var authTokenProvider: (() async -> String?)?

    var statusSummary: String {
        #if targetEnvironment(simulator)
        return "Simulator (push unavailable)"
        #else
        if lastRegisteredHex != nil { return "Registered" }
        if let error = lastRegistrationError { return "Failed — \(error)" }
        if NotificationService.shared.broadcastAlertsEnabled { return "Pending" }
        return "Off"
        #endif
    }

    func register(deviceToken: Data) async {
        pendingToken = deviceToken
        let token = deviceToken.map { String(format: "%02x", $0) }.joined()

        #if DEBUG
        let environment = "sandbox"
        #else
        let environment = "production"
        #endif

        struct Body: Encodable {
            let token: String
            let bundleId: String
            let environment: String
            let platform: String
        }

        var request = URLRequest(url: AppConfig.url(for: "/api/push/register"))
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if let jwt = await authTokenProvider?() {
            request.setValue("Bearer \(jwt)", forHTTPHeaderField: "Authorization")
        }
        request.httpBody = try? JSONEncoder().encode(
            Body(
                token: token,
                bundleId: AppConfig.bundleIdentifier,
                environment: environment,
                platform: "ios"
            )
        )

        do {
            let (data, response) = try await URLSession.shared.data(for: request)
            guard let http = response as? HTTPURLResponse else {
                lastRegistrationError = "No response from server"
                return
            }
            if (200 ... 299).contains(http.statusCode) {
                lastRegisteredHex = token
                lastRegistrationError = nil
            } else {
                let message = (try? JSONSerialization.jsonObject(with: data) as? [String: Any])?["error"] as? String
                lastRegistrationError = message ?? "Server returned \(http.statusCode)"
            }
        } catch {
            lastRegistrationError = error.localizedDescription
        }
    }

    func recordRegistrationFailure(_ error: Error) {
        lastRegistrationError = error.localizedDescription
    }

    /// Retry last token (e.g. after sign-in so clerk_user_id is linked).
    func retryPendingRegistration() async {
        lastRegisteredHex = nil
        if let pendingToken {
            await register(deviceToken: pendingToken)
        } else {
            await NotificationService.shared.registerForRemoteIfAuthorized()
        }
    }

    func unregister(deviceToken: Data) async {
        let token = deviceToken.map { String(format: "%02x", $0) }.joined()

        struct Body: Encodable {
            let token: String
            let platform: String
        }

        var request = URLRequest(url: AppConfig.url(for: "/api/push/register"))
        request.httpMethod = "DELETE"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try? JSONEncoder().encode(Body(token: token, platform: "ios"))
        _ = try? await URLSession.shared.data(for: request)
        lastRegisteredHex = nil
        pendingToken = nil
    }
}
