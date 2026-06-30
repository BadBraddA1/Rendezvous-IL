import Foundation

@MainActor
final class PushRegistrationService {
    static let shared = PushRegistrationService()

    private var lastRegisteredHex: String?

    func register(deviceToken: Data) async {
        let token = deviceToken.map { String(format: "%02x", $0) }.joined()
        guard token != lastRegisteredHex else { return }
        lastRegisteredHex = token

        #if DEBUG
        let environment = "sandbox"
        #else
        let environment = "production"
        #endif

        struct Body: Encodable {
            let token: String
            let bundleId: String
            let environment: String
        }

        guard let url = URL(string: "\(AppConfig.baseURL.absoluteString)/api/push/register") else { return }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try? JSONEncoder().encode(
            Body(token: token, bundleId: "com.rendezvousil.app", environment: environment)
        )

        _ = try? await URLSession.shared.data(for: request)
    }

    func unregister(deviceToken: Data) async {
        let token = deviceToken.map { String(format: "%02x", $0) }.joined()
        let url = AppConfig.url(for: "/api/push/register")

        var request = URLRequest(url: url)
        request.httpMethod = "DELETE"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try? JSONEncoder().encode(["token": token])
        _ = try? await URLSession.shared.data(for: request)
        lastRegisteredHex = nil
    }
}
