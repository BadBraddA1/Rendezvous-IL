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
    /// True only after `Clerk.shared.load()` succeeds. Never touch Clerk.session/user before this.
    var isClerkReady = false
    /// Mirrors Clerk session id for safe SwiftUI observation (avoid reading Clerk in view bodies).
    var clerkSessionId: String?

    /// Display name from Clerk (family account holder). Nil until Clerk has finished loading.
    var userDisplayName: String? {
        guard isClerkReady else { return nil }
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
        guard isClerkReady else { return nil }
        return Clerk.shared.user?.primaryEmailAddress?.emailAddress
    }

    private(set) var apiClient: APIClient?
    private var activityPingTask: Task<Void, Never>?

    private static let activityPingIntervalSeconds: UInt64 = 300

    var publicClient: APIClient { apiClient ?? APIClient.shared }

    func bootstrapAuthIfNeeded() async {
        guard AppConfig.hasValidClerkKey else {
            clerkSetupError = "Add CLERK_PUBLISHABLE_KEY to ios/Config.xcconfig (copy from .env.local), then xcodegen generate."
            isClerkReady = false
            return
        }

        isLoading = true
        defer { isLoading = false }

        do {
            try await loadClerkIfNeeded()
            isClerkReady = Clerk.shared.isLoaded
            clerkSessionId = Clerk.shared.session?.id
            clerkSetupError = nil
        } catch is ClerkLoadTimeout {
            isClerkReady = false
            clerkSessionId = nil
            clerkSetupError = "Sign-in timed out. Check your connection and try again."
            clearSession()
            return
        } catch {
            isClerkReady = false
            clerkSessionId = nil
            clerkSetupError = error.localizedDescription
            clearSession()
            return
        }

        await refreshAuth(suppressLoadingUI: true)
    }

    /// `Clerk.shared.load()` can hang without Associated Domains / network — cap wait time.
    private func loadClerkIfNeeded() async throws {
        if Clerk.shared.isLoaded { return }
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

        guard isClerkReady, Clerk.shared.session != nil else {
            clearSession()
            return
        }

        // Prove we can mint a token before flipping signed-in UI (avoids crash/loop on bad session).
        let token: String
        do {
            token = try await Self.sessionToken(forceRefresh: true)
        } catch {
            AppLog.bootstrap("refreshAuth token failed: \(error.localizedDescription)")
            clearSession()
            return
        }

        apiClient = APIClient(tokenProvider: { try await Self.sessionToken(forceRefresh: true) })
        isSignedIn = true
        authError = nil
        clerkSessionId = Clerk.shared.session?.id
        // Warm the client with a known-good token path (discarded; provider mints fresh ones).
        _ = token

        PushRegistrationService.shared.authTokenProvider = {
            try? await Self.sessionToken(forceRefresh: false)
        }
        // Re-register APNs token now that we can attach clerk_user_id (chat push targeting).
        await PushRegistrationService.shared.retryPendingRegistration()

        await refreshAdminStatus()
        await recordActivityIfSignedIn()
        startActivityPingLoop()
    }

    func recordActivityIfSignedIn() async {
        guard isSignedIn, let client = apiClient else { return }
        try? await client.recordUserActivity()
    }

    func refreshAdminStatus() async {
        guard isSignedIn, let client = apiClient else {
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
            // Keep last-known admin flags on transient network/auth blips so a
            // single failed probe does not flash "access denied" on Admin.
            if APIError.isCancellation(error) { return }
            if case APIError.unauthorized = error {
                isAdmin = false
                canViewDashboard = false
                canCheckIn = false
                canManageUsers = false
                adminRole = nil
                adminName = nil
            }
        }
    }

    func signOut() async {
        // Clear app state first so UI never renders signed-in tabs against a dying Clerk session.
        clearSession()
        guard isClerkReady else { return }
        do {
            try await Clerk.shared.signOut()
        } catch {
            AppLog.bootstrap("signOut error: \(error.localizedDescription)")
        }
        clerkSessionId = nil
    }

    /// Clerk session cleared outside our sign-out button (e.g. token expiry).
    func handleExternalSignOut() {
        clearSession()
        clerkSessionId = nil
    }

    /// Call when Clerk reports a session change after load.
    func handleClerkSessionChange() async {
        guard isClerkReady else { return }
        let newId = Clerk.shared.session?.id
        guard newId != clerkSessionId else { return }
        clerkSessionId = newId
        if newId != nil {
            await refreshAuth(suppressLoadingUI: true)
        } else {
            handleExternalSignOut()
        }
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
        PushRegistrationService.shared.authTokenProvider = nil
        isSignedIn = false
        isAdmin = false
        canViewDashboard = false
        canCheckIn = false
        canManageUsers = false
        adminRole = nil
        adminName = nil
        authError = nil
    }

    private static func sessionToken(forceRefresh: Bool) async throws -> String {
        guard Clerk.shared.isLoaded, let session = Clerk.shared.session else {
            throw APIError.unauthorized
        }
        let options = Session.GetTokenOptions(skipCache: forceRefresh)
        guard let jwt = try await session.getToken(options)?.jwt, !jwt.isEmpty else {
            throw APIError.unauthorized
        }
        return jwt
    }
}
