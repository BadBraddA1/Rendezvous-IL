import Foundation
import UIKit

@MainActor
final class PushRegistrationService {
    static let shared = PushRegistrationService()

    private(set) var lastRegisteredHex: String?
    private(set) var lastRegistrationError: String?

    func register(deviceToken: Data) async {
        let token = deviceToken.map { String(format: "%02x", $0) }.joined()
        guard token != lastRegisteredHex else { return }

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

        guard let url = URL(string: "\(AppConfig.baseURL.absoluteString)/api/push/register") else { return }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try? JSONEncoder().encode(
            Body(
                token: token,
                bundleId: AppConfig.bundleIdentifier,
                environment: environment,
                platform: "ios"
            )
        )

        do {
            let (_, response) = try await URLSession.shared.data(for: request)
            if let http = response as? HTTPURLResponse, (200 ... 299).contains(http.statusCode) {
                lastRegisteredHex = token
                lastRegistrationError = nil
            } else {
                lastRegistrationError = "Server rejected device token"
            }
        } catch {
            lastRegistrationError = error.localizedDescription
        }
    }

    func unregister(deviceToken: Data) async {
        let token = deviceToken.map { String(format: "%02x", $0) }.joined()
        let url = AppConfig.url(for: "/api/push/register")

        struct Body: Encodable {
            let token: String
            let platform: String
        }

        var request = URLRequest(url: url)
        request.httpMethod = "DELETE"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try? JSONEncoder().encode(Body(token: token, platform: "ios"))
        _ = try? await URLSession.shared.data(for: request)
        lastRegisteredHex = nil
    }
}
