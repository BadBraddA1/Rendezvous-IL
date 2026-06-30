import ActivityKit
import Foundation

struct RendezvousActivityAttributes: ActivityAttributes {
    struct ContentState: Codable, Hashable {
        var currentTitle: String?
        var currentTime: String?
        var nextTitle: String?
        var nextTime: String?
        var nextLocation: String?
        var updatedAt: Date
    }

    var eventYear: Int
    var dateRange: String
}
