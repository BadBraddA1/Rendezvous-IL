import Foundation

enum ChatMessageFormatting {
    /// Parse API / SQLite chat timestamps. Bare `YYYY-MM-DD HH:mm:ss` is UTC.
    static func parseTimestamp(_ raw: String) -> Date? {
        let value = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !value.isEmpty else { return nil }

        let iso = ISO8601DateFormatter()
        iso.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = iso.date(from: value) { return date }
        iso.formatOptions = [.withInternetDateTime]
        if let date = iso.date(from: value) { return date }

        // SQLite CURRENT_TIMESTAMP / Turso: "2026-07-17 03:18:04" (UTC, no zone).
        let sqlite = DateFormatter()
        sqlite.locale = Locale(identifier: "en_US_POSIX")
        sqlite.timeZone = TimeZone(secondsFromGMT: 0)
        sqlite.dateFormat = "yyyy-MM-dd HH:mm:ss"
        if let date = sqlite.date(from: value) { return date }

        sqlite.dateFormat = "yyyy-MM-dd'T'HH:mm:ss"
        if let date = sqlite.date(from: value) { return date }

        // Last resort: treat undated ISO-like strings as UTC.
        if !value.contains("Z") && !value.contains("+") {
            let withT = value.contains("T") ? value : value.replacingOccurrences(of: " ", with: "T")
            iso.formatOptions = [.withInternetDateTime]
            return iso.date(from: withT + "Z")
        }
        return nil
    }

    static func relativeTime(_ iso: String) -> String {
        guard let date = parseTimestamp(iso) else { return iso }
        return date.formatted(date: .abbreviated, time: .shortened)
    }
}

extension Array where Element == ChatChannelSummary {
    /// Newest activity first; channels with unreads before quiet ones when times tie.
    func sortedForDisplay() -> [ChatChannelSummary] {
        sorted { lhs, rhs in
            let leftTime = ChatMessageFormatting.parseTimestamp(lhs.last_message_at ?? "")?.timeIntervalSince1970 ?? 0
            let rightTime = ChatMessageFormatting.parseTimestamp(rhs.last_message_at ?? "")?.timeIntervalSince1970 ?? 0
            if leftTime != rightTime { return leftTime > rightTime }
            if lhs.unreadCount != rhs.unreadCount { return lhs.unreadCount > rhs.unreadCount }
            if lhs.is_test != rhs.is_test { return !lhs.is_test }
            return lhs.name < rhs.name
        }
    }
}
