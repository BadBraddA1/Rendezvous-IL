import Foundation

enum AppConfig {
    /// Production site — same backend as the Next.js app.
    static let baseURL = URL(string: "https://rendezvousil.com")!

    static let eventYear = 2027
    static let eventDates = "May 3–7, 2027"
    static let registrationOpens = "January 1, 2027"
    static let theme = "1 Samuel"
    static let location = "Lake Williamson Christian Center, Carlinville, IL"

    static var clerkPublishableKey: String? {
        guard let raw = Bundle.main.object(forInfoDictionaryKey: "CLERK_PUBLISHABLE_KEY") as? String else {
            return nil
        }
        let trimmed = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty, !trimmed.contains("REPLACE_ME"), !trimmed.contains("$(") else { return nil }
        if let match = trimmed.range(of: #"pk_(live|test)_[A-Za-z0-9]+"#, options: .regularExpression) {
            return String(trimmed[match])
        }
        return nil
    }

    static var hasValidClerkKey: Bool {
        guard let key = clerkPublishableKey else { return false }
        return key.hasPrefix("pk_live_") || key.hasPrefix("pk_test_")
    }

    static func url(for path: String) -> URL {
        let normalized = path.hasPrefix("/") ? path : "/\(path)"
        return baseURL.appending(path: normalized)
    }
}
