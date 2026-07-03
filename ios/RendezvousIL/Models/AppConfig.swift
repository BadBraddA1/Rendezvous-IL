import Foundation

enum AppConfig {
    /// Production site — same backend as the Next.js app.
    static let baseURL = URL(string: "https://rendezvousil.com")!

    static let eventYear = 2027
    static let eventDates = "May 3–7, 2027"
    static let registrationOpens = "January 1, 2027"
    static let theme = "1 Samuel"
    static let location = "Lake Williamson Christian Center, Carlinville, IL"

    /// Main app bundle id (TestFlight uses braddcorp suffix).
    static var bundleIdentifier: String {
        Bundle.main.bundleIdentifier ?? "com.rendezvousil.braddcorp.app"
    }

    /// Event week boundaries (Chicago) for Live Activity auto-start.
    static let eventWeekStartISO = "2027-05-03"
    static let eventWeekEndISO = "2027-05-08"

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

    /// Build an API URL. Paths may include a query string (`/api/directory?year=2027`).
    /// Do not use `URL.appending(path:)` for query strings — it percent-encodes `?` and breaks routes.
    static func url(for path: String) -> URL {
        let normalized = path.hasPrefix("/") ? path : "/\(path)"
        guard let url = URL(string: normalized, relativeTo: baseURL)?.absoluteURL else {
            return baseURL.appendingPathComponent(normalized.trimmingCharacters(in: CharacterSet(charactersIn: "/")))
        }
        return url
    }

    /// Year as plain digits (avoids SwiftUI `Text("\(2027)")` → "2,207").
    static var eventYearLabel: String { String(eventYear) }
}
