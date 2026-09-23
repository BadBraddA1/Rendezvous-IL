import Foundation
import UIKit

/// Opens a website path already signed in via Clerk sign-in token handoff.
enum WebHandoff {
    private struct RequestBody: Encodable {
        let redirect_url: String
    }

    private struct ResponseBody: Decodable {
        let url: String
    }

    /// Mint a short-lived ticket and open Safari. Falls back to a plain URL if unsigned-in or mint fails.
    @MainActor
    static func open(path: String, session: AppSession) async {
        let fallback = AppConfig.url(for: path)

        guard let client = session.apiClient else {
            await UIApplication.shared.open(fallback)
            return
        }

        do {
            let response = try await client.post(
                "/api/auth/web-handoff",
                body: RequestBody(redirect_url: path),
                as: ResponseBody.self
            )
            guard let url = URL(string: response.url) else {
                await UIApplication.shared.open(fallback)
                return
            }
            await UIApplication.shared.open(url)
        } catch {
            await UIApplication.shared.open(fallback)
        }
    }
}
