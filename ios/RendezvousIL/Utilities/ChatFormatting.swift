import Foundation

enum ChatMessageFormatting {
    static func relativeTime(_ iso: String) -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        var date = formatter.date(from: iso)
        if date == nil {
            formatter.formatOptions = [.withInternetDateTime]
            date = formatter.date(from: iso)
        }
        guard let date else { return iso }
        return date.formatted(date: .abbreviated, time: .shortened)
    }
}

extension Array where Element == ChatChannelSummary {
    /// Newest activity first; channels with unreads before quiet ones when times tie.
    func sortedForDisplay() -> [ChatChannelSummary] {
        sorted { lhs, rhs in
            let leftTime = Self.messageDate(lhs.last_message_at)?.timeIntervalSince1970 ?? 0
            let rightTime = Self.messageDate(rhs.last_message_at)?.timeIntervalSince1970 ?? 0
            if leftTime != rightTime { return leftTime > rightTime }
            if lhs.unreadCount != rhs.unreadCount { return lhs.unreadCount > rhs.unreadCount }
            if lhs.is_test != rhs.is_test { return !lhs.is_test }
            return lhs.name < rhs.name
        }
    }

    private static func messageDate(_ iso: String?) -> Date? {
        guard let iso, !iso.isEmpty else { return nil }
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = formatter.date(from: iso) { return date }
        formatter.formatOptions = [.withInternetDateTime]
        return formatter.date(from: iso)
    }
}
