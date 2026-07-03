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
    /// Newest event years first; test channels after production years.
    func sortedForDisplay() -> [ChatChannelSummary] {
        sorted { lhs, rhs in
            let leftYear = lhs.event_year ?? 0
            let rightYear = rhs.event_year ?? 0
            if leftYear != rightYear { return leftYear > rightYear }
            if lhs.is_test != rhs.is_test { return !lhs.is_test }
            return lhs.name < rhs.name
        }
    }
}
