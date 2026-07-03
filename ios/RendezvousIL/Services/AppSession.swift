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

    /// Display name from Clerk (family account holder). Nil until Clerk has finished loading.
    var userDisplayName: String? {
        guard Clerk.shared.isLoaded else { return nil }
        guard let user = Clerk.shared.user else { return nil }
        let name = [user.firstName, user.lastName]
            .compactMap { $0?.trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { !$0.isEmpty }
            .joined(separator: " ")
        if !name.isEmpty { return name }
        return user.primaryEmailAddress?.emailAddress
    }

    /// Primary email for account screen. Nil until Clerk has finished loading.
    var userEmail: String? {
        guard Clerk.shared.isLoaded else { return nil }
        return Clerk.shared.user?.primaryEmailAddress?.emailAddress
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
            try await loadClerkIfNeeded()
        } catch is ClerkLoadTimeout {
            clerkSetupError = "Sign-in timed out. Check your connection and try again."
            return
        } catch {
            clerkSetupError = error.localizedDescription
            return
        }

        await refreshAuth(suppressLoadingUI: true)
    }

    /// `Clerk.shared.load()` can hang without Associated Domains / network — cap wait time.
    private func loadClerkIfNeeded() async throws {
        try await withThrowingTaskGroup(of: Void.self) { group in
            group.addTask { try await Clerk.shared.load() }
            group.addTask {
                try await Task.sleep(for: .seconds(20))
                throw ClerkLoadTimeout()
            }
            _ = try await group.next()
            group.cancelAll()
        }
    }

    private struct ClerkLoadTimeout: Error {}

    func refreshAuth(suppressLoadingUI: Bool = false) async {
        if !suppressLoadingUI { isLoading = true }
        defer { if !suppressLoadingUI { isLoading = false } }

        guard Clerk.shared.session != nil else {
            clearSession()
            return
        }

        // Always mint a fresh session JWT — cached tokens are a common cause of
        // "signed in" UI with 401/empty chat & directory on the API.
        apiClient = APIClient(tokenProvider: { try await Self.sessionToken(forceRefresh: true) })
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

    /// Clerk session cleared outside our sign-out button (e.g. token expiry).
    func handleExternalSignOut() {
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
