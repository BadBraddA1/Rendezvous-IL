import Foundation
import Clerk

@MainActor
@Observable
final class AppSession {
    var isSignedIn = false
    var isAdmin = false
    var canViewDashboard = false
    var canCheckIn = false
    var canManageUsers = false
    var adminRole: String?
    var adminName: String?
    var isLoading = false
    var authError: String?
    var clerkSetupError: String?

    /// Display name from Clerk (family account holder).
    var userDisplayName: String? {
        guard let user = Clerk.shared.user else { return nil }
        let name = [user.firstName, user.lastName]
            .compactMap { $0?.trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { !$0.isEmpty }
            .joined(separator: " ")
        if !name.isEmpty { return name }
        return user.primaryEmailAddress?.emailAddress
    }

    private(set) var apiClient: APIClient?
    private var activityPingTask: Task<Void, Never>?

    private static let activityPingIntervalSeconds: UInt64 = 300

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
        await recordActivityIfSignedIn()
        startActivityPingLoop()
    }

    func recordActivityIfSignedIn() async {
        guard let client = apiClient else { return }
        try? await client.recordUserActivity()
    }

    func refreshAdminStatus() async {
        guard let client = apiClient else {
            isAdmin = false
            canViewDashboard = false
            canCheckIn = false
            canManageUsers = false
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
                canViewDashboard = response.permissions?.canViewDashboard ?? true
                canCheckIn = response.permissions?.canCheckIn ?? (admin.role == "admin" || admin.role == "editor" || admin.role == "checkin")
                canManageUsers = response.permissions?.canManageUsers ?? (admin.role == "admin")
            } else {
                isAdmin = false
                canViewDashboard = false
                canCheckIn = false
                canManageUsers = false
                adminRole = nil
                adminName = nil
            }
        } catch {
            isAdmin = false
            canViewDashboard = false
            canCheckIn = false
            canManageUsers = false
            adminRole = nil
            adminName = nil
        }
    }

    func signOut() async {
        try? await Clerk.shared.signOut()
        clearSession()
    }

    private func startActivityPingLoop() {
        activityPingTask?.cancel()
        guard isSignedIn, apiClient != nil else { return }

        activityPingTask = Task {
            while !Task.isCancelled {
                try? await Task.sleep(nanoseconds: Self.activityPingIntervalSeconds * 1_000_000_000)
                guard !Task.isCancelled else { return }
                await recordActivityIfSignedIn()
            }
        }
    }

    private func clearSession() {
        activityPingTask?.cancel()
        activityPingTask = nil
        apiClient = nil
        isSignedIn = false
        isAdmin = false
        canViewDashboard = false
        canCheckIn = false
        canManageUsers = false
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
