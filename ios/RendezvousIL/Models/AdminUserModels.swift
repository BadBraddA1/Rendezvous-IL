import Foundation

struct AdminUserRecord: Decodable, Identifiable, Hashable {
    let id: String
    let email: String
    let firstName: String?
    let lastName: String?
    let imageUrl: String
    let role: String?
    let createdAt: Int
    let lastSignInAt: Int?
    let lastActiveAt: Int?
    let banned: Bool
    let locked: Bool
    let lastSeenAt: String?
    let lastPlatform: String?
    let lastAppVersion: String?
    let visitCount: Int

    var displayName: String {
        if let firstName, let lastName, !firstName.isEmpty || !lastName.isEmpty {
            return [firstName, lastName].filter { !$0.isEmpty }.joined(separator: " ")
        }
        return email.split(separator: "@").first.map(String.init) ?? email
    }

    var roleLabel: String {
        guard let role, !role.isEmpty else { return "No role" }
        return role.capitalized
    }

    func bestLastSeenDate() -> Date? {
        var timestamps: [Date] = []
        if let lastSeenAt, let date = AdminUserRecord.parseDate(lastSeenAt) {
            timestamps.append(date)
        }
        if let lastActiveAt {
            timestamps.append(Date(timeIntervalSince1970: TimeInterval(lastActiveAt) / 1000))
        }
        if let lastSignInAt {
            timestamps.append(Date(timeIntervalSince1970: TimeInterval(lastSignInAt) / 1000))
        }
        return timestamps.max()
    }

    private static func parseDate(_ value: String) -> Date? {
        let iso = ISO8601DateFormatter()
        iso.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = iso.date(from: value) { return date }
        iso.formatOptions = [.withInternetDateTime]
        if let date = iso.date(from: value) { return date }
        let sqlite = DateFormatter()
        sqlite.locale = Locale(identifier: "en_US_POSIX")
        sqlite.dateFormat = "yyyy-MM-dd HH:mm:ss"
        return sqlite.date(from: value)
    }
}

struct AdminUsersListResponse: Decodable {
    let users: [AdminUserRecord]
}

struct AdminUserMutationResponse: Decodable {
    let success: Bool
    let user: AdminUserRecord
}

struct AdminUserCreateBody: Encodable {
    let email: String
    let firstName: String?
    let lastName: String?
    let role: String?
    let password: String?
}

struct AdminUserRolePatchBody: Encodable {
    let userId: String
    let role: String?
    let firstName: String
    let lastName: String
}

struct AdminUserBanPatchBody: Encodable {
    let userId: String
    let banned: Bool
}

struct AdminResetPasswordBody: Encodable {
    let mode: String
    let password: String?
}

struct AdminResetPasswordResponse: Decodable {
    let success: Bool
    let mode: String?
    let url: String?
    let forgotPasswordUrl: String?
}

struct SimpleSuccessResponse: Decodable {
    let success: Bool
}

enum AdminUserRole: String, CaseIterable, Identifiable {
    case none
    case viewer
    case checkin
    case editor
    case admin

    var id: String { rawValue }

    var label: String {
        switch self {
        case .none: return "No role"
        case .viewer: return "Viewer"
        case .checkin: return "Check-In"
        case .editor: return "Editor"
        case .admin: return "Admin"
        }
    }

    var apiValue: String? {
        self == .none ? nil : rawValue
    }

    static func from(_ role: String?) -> AdminUserRole {
        guard let role, let match = AdminUserRole(rawValue: role) else { return .none }
        return match
    }
}

enum UserPlatformLabel {
    static func text(for platform: String?) -> String {
        switch platform {
        case "ios": return "iOS app"
        case "android": return "Android"
        case "web": return "Web"
        default: return "Unknown"
        }
    }

    static func icon(for platform: String?) -> String {
        switch platform {
        case "ios": return "iphone"
        case "android": return "smartphone"
        case "web": return "globe"
        default: return "questionmark.circle"
        }
    }
}
