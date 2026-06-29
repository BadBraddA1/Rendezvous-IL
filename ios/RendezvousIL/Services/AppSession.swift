import Foundation
import Clerk

@MainActor
@Observable
final class AppSession {
    var isSignedIn = false
    var isAdmin = false
    var canCheckIn = false
    var adminRole: String?
    var adminName: String?
    var isLoading = false
    var authError: String?
    var clerkSetupError: String?

    private(set) var apiClient: APIClient?

  var publicClient: APIClient { apiClient ?? APIClient.shared }

    func bootstrapAuthIfNeeded() async {
        guard AppConfig.hasValidClerkKey else {
            clerkSetupError = "Add CLERK_PUBLISHABLE_KEY to ios/Config.xcconfig (copy from .env.local), then xcodegen generate."
            return
        }

        if Clerk.shared.session != nil {
            isLoading = true
        }
        defer { isLoading = false }

        do {
            try await Clerk.shared.load()
        } catch {
            clerkSetupError = error.localizedDescription
            return
        }

        await refreshAuth(suppressLoadingUI: true)
    }

    func refreshAuth(suppressLoadingUI: Bool = false) async {
        if !suppressLoadingUI { isLoading = true }
        defer { if !suppressLoadingUI { isLoading = false } }

        guard Clerk.shared.session != nil else {
            clearSession()
            return
        }

        apiClient = APIClient(tokenProvider: { try await Self.sessionToken(forceRefresh: false) })
        isSignedIn = true
        authError = nil
        await refreshAdminStatus()
    }

    func refreshAdminStatus() async {
        guard let client = apiClient else {
            isAdmin = false
            canCheckIn = false
            adminRole = nil
            adminName = nil
            return
        }

        do {
            let response = try await client.getAdminMe()
            if let admin = response.admin {
                isAdmin = true
                adminRole = admin.role
                adminName = admin.fullName.isEmpty ? admin.email : admin.fullName
                canCheckIn = response.permissions?.canCheckIn ?? (admin.role == "admin" || admin.role == "editor" || admin.role == "checkin")
            } else {
                isAdmin = false
                canCheckIn = false
                adminRole = nil
                adminName = nil
            }
        } catch {
            isAdmin = false
            canCheckIn = false
            adminRole = nil
            adminName = nil
        }
    }

    func signOut() async {
        try? await Clerk.shared.signOut()
        clearSession()
    }

    private func clearSession() {
        apiClient = nil
        isSignedIn = false
        isAdmin = false
        canCheckIn = false
        adminRole = nil
        adminName = nil
    }

    private static func sessionToken(forceRefresh: Bool) async throws -> String {
        guard let session = Clerk.shared.session else {
            throw APIError.unauthorized
        }
        let options = Session.GetTokenOptions(skipCache: forceRefresh)
        guard let jwt = try await session.getToken(options)?.jwt else {
            throw APIError.unauthorized
        }
        return jwt
    }
}
