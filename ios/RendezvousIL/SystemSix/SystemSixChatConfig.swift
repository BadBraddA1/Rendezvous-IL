import Foundation

/// Per-app copy + timing knobs. Map colors in each app’s bubble views.
enum SystemSixChatConfig {
    static let groupWindow: TimeInterval = 2 * 60
    static let composerMaxLines = 5
    static let nearBottomThreshold: CGFloat = 72

    static func newMessagesLabel(count: Int) -> String {
        count == 1 ? "1 new message" : "\(count) new messages"
    }

    static let composerPlaceholder = "Message…"
    static let retryLabel = "Retry"
    static let failedLabel = "Couldn’t send"
}
