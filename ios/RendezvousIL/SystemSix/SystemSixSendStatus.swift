import Foundation

/// Local send pipeline state (not part of API payloads).
enum SystemSixSendStatus: Equatable {
    case sending
    case sent
    case failed
}
