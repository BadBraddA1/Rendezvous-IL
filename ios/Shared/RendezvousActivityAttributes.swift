import ActivityKit
import Foundation

struct RendezvousActivityAttributes: ActivityAttributes {
    struct ContentState: Codable, Hashable {
        var currentTitle: String?
        var currentTime: String?
        var nextTitle: String?
        var nextTime: String?
        var nextLocation: String?
        /// e.g. "Now" or "in 2h 15m"
        var countdownLabel: String?
        /// Absolute fire time for the featured item (start of next, or end of current).
        var targetDate: Date?
        var updatedAt: Date
    }

    /// Plain digits only — never format with grouping separators ("2,207").
    var eventYearLabel: String
    var dateRange: String
}
